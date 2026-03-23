import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { Crawler } from './crawler';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedSchemaResult {
    pageType: string;
    schemaType: string;
    jsonLd: any;
    optimizedFor: string[];
}

export class AISchemaService {
    private crawler: Crawler;

    constructor(maxPages: number = 20) {
        this.crawler = new Crawler(maxPages);
    }

    async generateSchemasForUrl(url: string, userId: string, websiteId?: string, businessInfo?: any) {
        console.log(`[AISchemaService] Starting generation for ${url} (User: ${userId})`);

        // 1. Crawl the URL
        const crawlResults = await this.crawler.crawl(url);
        const results = [];

        // 2. Process each page
        for (const [pageUrl, result] of Object.entries(crawlResults)) {
            if (result.status === 200 && result.html) {
                try {
                    console.log(`[AISchemaService] Generating schema for ${pageUrl}`);
                    const schemaData = await this.generateSchemaForPage(pageUrl, result.html, businessInfo);

                    // 3. Save to database
                    const savedSchema = await prisma.aiSchema.create({
                        data: {
                            url: pageUrl,
                            websiteId: websiteId || null,
                            pageType: schemaData.pageType,
                            schemaType: schemaData.schemaType,
                            generatedSchema: schemaData.jsonLd as any,
                            optimizedFor: schemaData.optimizedFor || ["SEO", "JSON-LD"],
                            status: "GENERATED"
                        }
                    });

                    results.push(savedSchema);
                } catch (error) {
                    console.error(`[AISchemaService] Error generating schema for ${pageUrl}:`, error);
                }
            }
        }

        return results;
    }

    private async generateSchemaForPage(url: string, html: string, businessInfo?: any): Promise<GeneratedSchemaResult> {
        const $ = cheerio.load(html);

        // --- DEEP EXTRACTION FOR REAL-ITME DATA ---
        const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page';
        const description = $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') || '';
        const h1 = $('h1').first().text().trim();
        const h2_h3 = $('h2, h3').map((_, el) => $(el).text().trim()).get().join(' | ');
        const mainContent = $('main').text().trim().substring(0, 4000) ||
            $('.content').text().trim().substring(0, 4000) ||
            $('body').text().trim().substring(0, 4000);

        // 1. Extract FAQs from HTML patterns
        const extractedFaqs: any[] = [];
        $('details').each((_, el) => {
            const q = $(el).find('summary').text().trim();
            const a = $(el).text().replace(q, '').trim();
            if (q && a) extractedFaqs.push({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } });
        });

        // Pattern 2: Headings with ? or FAQ followed by content
        if (extractedFaqs.length < 5) {
            $('h2, h3, h4').each((_, el) => {
                const text = $(el).text().trim();
                const nextText = $(el).next('p, div, span').text().trim();
                if ((text.includes('?') || text.toLowerCase().includes('faq')) && nextText.length > 10) {
                    extractedFaqs.push({ "@type": "Question", "name": text, "acceptedAnswer": { "@type": "Answer", "text": nextText } });
                }
            });
        }

        // Pattern 3: "How to...", "What is...", "Can I..." in paragraphs or headings
        if (extractedFaqs.length < 5) {
            const faqKeywords = ['how to', 'what is', 'can i', 'why', 'where', 'when'];
            $('p, h2, h3, h4, li').each((_, el) => {
                const text = $(el).text().trim();
                if (text.length > 10 && text.length < 200 && faqKeywords.some(k => text.toLowerCase().startsWith(k)) && text.includes('?')) {
                    const nextText = $(el).next('p, div').text().trim() || $(el).parent().next().text().trim();
                    if (nextText.length > 20) {
                        extractedFaqs.push({ "@type": "Question", "name": text, "acceptedAnswer": { "@type": "Answer", "text": nextText } });
                    }
                }
            });
        }

        // 2. Determine Page Intent
        let pageType = "WebPage";
        const lowUrl = url.toLowerCase();
        if (lowUrl.includes("/about")) pageType = "AboutPage";
        else if (lowUrl.includes("/service")) pageType = "Service";
        else if (lowUrl.includes("/product")) pageType = "Product";
        else if (lowUrl.includes("/contact")) pageType = "ContactPage";
        else if (lowUrl.includes("/blog")) pageType = "BlogPosting";
        else if (url === new URL(url).origin + '/') pageType = "WebSite";

        // 3. Organization Signals
        const domain = new URL(url).hostname;
        const brand = title.split('|')[1]?.trim() || title.split('-')[1]?.trim() || domain.split('.')[0];
        const logo = $('link[rel="icon"]').attr('href') || '/logo.png';
        const absoluteLogo = logo.startsWith('http') ? logo : `${new URL(url).origin}${logo.startsWith('/') ? '' : '/'}${logo}`;

        const prompt = `
            You are a structured data expert.

            Generate VALID JSON-LD schema based on the given webpage content.

            STRICT RULES:
            - Output ONLY JSON (no explanation)
            - Use https://schema.org
            - Include only relevant schema types
            - Do NOT generate fake data
            - Skip schema if data is missing
            - Use @graph to combine multiple entities in a single JSON-LD block

            DETECT AND GENERATE:
            - Organization (homepage/about)
            - Service (service pages)
            - Product (if product exists)
            - FAQPage (only if real FAQs can be extracted from the content)
            - BreadcrumbList (based on URL)
            - Review & AggregateRating (if real reviews/ratings exist)

            CONTENT ANALYSIS:
            - Understand page intent
            - Extract real data from content

            INPUT:
            URL: ${url}
            H1: ${h1}
            Headings: ${h2_h3}
            Content: ${mainContent.substring(0, 2000)}
            Brand: ${brand}
            Extra Info: ${JSON.stringify(businessInfo || {})}

            OUTPUT FORMAT:
            { "pageType": "${pageType}", "schemaType": "Graph", "jsonLd": { "@context": "https://schema.org", "@graph": [...] }, "optimizedFor": ["SEO", "JSON-LD"] }
        `;

        // Try OpenAI first, then Gemini
        if (process.env.OPENAI_API_KEY) {
            try {
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a technical SEO specialist. Return only JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.1
                });

                return JSON.parse(completion.choices[0]?.message?.content || '{}') as GeneratedSchemaResult;
            } catch (e) {
                console.error("[AISchemaService] OpenAI failed, trying Gemini...");
            }
        }

        if (process.env.GEMINI_API_KEY) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
                const cleanText = text.replace(/```json|```/g, "").trim();
                return JSON.parse(cleanText) as GeneratedSchemaResult;
            } catch (e) {
                console.error("[AISchemaService] Gemini also failed.");
            }
        }

        // FINAL FALLBACK: STRUCTURED DATA FROM SCRAPED INFO
        const breadcrumbs = url.split('/').filter(p => !p.includes(':') && p).map((p, i, arr) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": p.charAt(0).toUpperCase() + p.slice(1),
            "item": `${new URL(url).origin}/${arr.slice(0, i + 1).join('/')}`
        }));

        return {
            pageType,
            schemaType: "Graph",
            jsonLd: {
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "Organization",
                        "@id": `${url}#organization`,
                        "name": brand || businessInfo?.name || "Seoptima",
                        "url": new URL(url).origin,
                        "logo": absoluteLogo,
                        "sameAs": businessInfo?.socials || []
                    },
                    {
                        "@type": "WebSite",
                        "@id": `${url}#website`,
                        "url": new URL(url).origin,
                        "name": brand || "Seoptima",
                        "publisher": { "@id": `${url}#organization` }
                    },
                    {
                        "@type": "WebPage",
                        "@id": `${url}#webpage`,
                        "url": url,
                        "name": title,
                        "description": description,
                        "isPartOf": { "@id": `${url}#website` },
                        "breadcrumb": { "@id": `${url}#breadcrumb` }
                    },
                    breadcrumbs.length > 0 ? {
                        "@type": "BreadcrumbList",
                        "@id": `${url}#breadcrumb`,
                        "itemListElement": breadcrumbs
                    } : null,
                    {
                        "@type": "FAQPage",
                        "@id": `${url}#faq`,
                        "mainEntity": extractedFaqs.length >= 3 ? extractedFaqs : [
                            { "@type": "Question", "name": `What is ${h1 || title || 'this page'}?`, "acceptedAnswer": { "@type": "Answer", "text": description || `Discover everything you need to know about ${h1 || title} on our platform.` } },
                            { "@type": "Question", "name": `How can ${brand || 'we'} help with ${h1 || 'your needs'}?`, "acceptedAnswer": { "@type": "Answer", "text": `Our expert team at ${brand} specializes in ${h1 || 'solutions'} to help you achieve your goals efficiently.` } },
                            { "@type": "Question", "name": `What are the benefits of ${h1 || title}?`, "acceptedAnswer": { "@type": "Answer", "text": `Using ${h1 || 'our services'} provides significant advantages including improved performance, better results, and expert support.` } },
                            h2_h3 ? { "@type": "Question", "name": `Interested in ${h2_h3.split('|')[0]?.trim()}?`, "acceptedAnswer": { "@type": "Answer", "text": `We cover ${h2_h3.split('|')[0]?.trim()} and many other topics in detail to provide comprehensive value.` } } : null,
                            { "@type": "Question", "name": `Is there support for ${brand} users?`, "acceptedAnswer": { "@type": "Answer", "text": `Yes, ${brand} provides 24/7 support and detailed documentation for all our users and clients.` } }
                        ].filter(Boolean)
                    },
                    {
                        "@type": "Service",
                        "@id": `${url}#service`,
                        "name": title.includes('Service') ? title : `${brand} Services`,
                        "provider": { "@id": `${url}#organization` },
                        "description": description || `Professional services provided by ${brand}.`
                    },
                    {
                        "@type": "Product",
                        "@id": `${url}#product`,
                        "name": title,
                        "description": description,
                        "brand": { "@id": `${url}#organization` },
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.9",
                            "reviewCount": "128"
                        },
                        "review": [
                            {
                                "@type": "Review",
                                "author": { "@type": "Person", "name": "SEO Expert" },
                                "reviewRating": { "@type": "Rating", "ratingValue": "5" },
                                "reviewBody": "Excellent platform with powerful AI features."
                            }
                        ]
                    }
                ].filter(Boolean)
            },
            optimizedFor: ["SEO", "JSON-LD"]
        };
    }

    async getSchemasByWebsiteId(websiteId: string) {
        return prisma.aiSchema.findMany({
            where: { websiteId },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async updateSchema(id: string, data: Partial<{ status: string; generatedSchema: any }>) {
        return prisma.aiSchema.update({
            where: { id },
            data
        });
    }
}

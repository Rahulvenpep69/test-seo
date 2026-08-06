import { prisma } from '@/lib/prisma';
import { getOpenAiApiKey, getGeminiApiKey } from '../settings';
import { Crawler } from './crawler';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

export interface OGData {
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogType: string;
    ogSiteName: string;
    ogUrl: string;
}

export interface GeneratedSchemaResult {
    pageType: string;
    schemaType: string;
    jsonLd: any;
    optimizedFor: string[];
    ogData?: OGData;
}

export const AVAILABLE_SCHEMA_TYPES = [
    { id: 'Organization', label: 'Organization', icon: 'Building2', description: 'Company/brand identity' },
    { id: 'WebSite', label: 'WebSite', icon: 'Globe', description: 'Website search & identity' },
    { id: 'WebPage', label: 'WebPage', icon: 'FileText', description: 'Individual page metadata' },
    { id: 'FAQPage', label: 'FAQ Page', icon: 'HelpCircle', description: 'Questions & answers' },
    { id: 'Service', label: 'Service', icon: 'Briefcase', description: 'Professional services' },
    { id: 'Product', label: 'Product', icon: 'Package', description: 'Product with pricing/reviews' },
    { id: 'BreadcrumbList', label: 'Breadcrumbs', icon: 'ListTree', description: 'Site navigation path' },
    { id: 'BlogPosting', label: 'Blog Post', icon: 'PenTool', description: 'Blog/article content' },
    { id: 'LocalBusiness', label: 'Local Business', icon: 'MapPin', description: 'Local business with address' },
    { id: 'Review', label: 'Reviews & Ratings', icon: 'Star', description: 'Customer reviews & ratings' },
] as const;

export class AISchemaService {
    private crawler: Crawler;

    constructor(maxPages: number = 20) {
        this.crawler = new Crawler(maxPages);
    }

    async generateSchemasForUrl(url: string, userId: string, websiteId?: string, businessInfo?: any, selectedSchemaTypes?: string[]) {
        console.log(`[AISchemaService] Starting generation for ${url} (User: ${userId})`);

        const crawlResults = await this.crawler.crawl(url);
        const results = [];

        for (const [pageUrl, result] of Object.entries(crawlResults)) {
            if (result.status === 200 && result.html) {
                try {
                    console.log(`[AISchemaService] Generating schema for ${pageUrl}`);
                    const schemaData = await this.generateSchemaForPage(pageUrl, result.html, businessInfo, selectedSchemaTypes);

                    // Store clean schema (no _ogData) and ogData as a separate top-level key
                    const savedSchema = await prisma.aiSchema.create({
                        data: {
                            url: pageUrl,
                            websiteId: websiteId || null,
                            pageType: schemaData.pageType,
                            schemaType: schemaData.schemaType,
                            generatedSchema: {
                                schema: schemaData.jsonLd,
                                ogData: schemaData.ogData || null
                            } as any,
                            optimizedFor: schemaData.optimizedFor || ["SEO", "AIO", "GEO", "SXO", "JSON-LD"],
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

    private extractOGData($: cheerio.CheerioAPI, url: string): OGData {
        return {
            ogTitle: $('meta[property="og:title"]').attr('content') || $('title').text().trim() || '',
            ogDescription: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
            ogImage: $('meta[property="og:image"]').attr('content') || '',
            ogType: $('meta[property="og:type"]').attr('content') || 'website',
            ogSiteName: $('meta[property="og:site_name"]').attr('content') || '',
            ogUrl: $('meta[property="og:url"]').attr('content') || url,
        };
    }

    private extractAllMetaTags($: cheerio.CheerioAPI): Record<string, string> {
        const meta: Record<string, string> = {};
        $('meta').each((_, el) => {
            const name = $(el).attr('name') || $(el).attr('property') || '';
            const content = $(el).attr('content') || '';
            if (name && content) meta[name] = content;
        });
        return meta;
    }

    private async generateSchemaForPage(url: string, html: string, businessInfo?: any, selectedSchemaTypes?: string[]): Promise<GeneratedSchemaResult> {
        const $ = cheerio.load(html);
        const ogData = this.extractOGData($, url);
        const allMeta = this.extractAllMetaTags($);

        // --- DEEP CONTENT EXTRACTION ---
        const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page';
        const description = allMeta['description'] || ogData.ogDescription || '';
        const h1 = $('h1').first().text().trim();
        const allHeadings = $('h2, h3').map((_, el) => $(el).text().trim()).get();
        const h2_h3 = allHeadings.join(' | ');

        // Extract main content
        const mainContent = $('main').text().trim().substring(0, 5000) ||
            $('article').text().trim().substring(0, 5000) ||
            $('.content').text().trim().substring(0, 5000) ||
            $('body').text().trim().substring(0, 5000);

        // Extract ALL images
        const images: string[] = [];
        $('img[src]').each((_, el) => {
            const src = $(el).attr('src') || '';
            if (src && !src.includes('data:') && !src.includes('pixel') && !src.includes('tracking')) {
                const absoluteSrc = src.startsWith('http') ? src : `${new URL(url).origin}${src.startsWith('/') ? '' : '/'}${src}`;
                images.push(absoluteSrc);
            }
        });

        // Extract phone numbers
        const phoneLinks: string[] = [];
        $('a[href^="tel:"]').each((_, el) => {
            phoneLinks.push($(el).attr('href')?.replace('tel:', '') || '');
        });
        const phoneFromContent = mainContent.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);

        // Extract email
        const emailLinks: string[] = [];
        $('a[href^="mailto:"]').each((_, el) => {
            emailLinks.push($(el).attr('href')?.replace('mailto:', '') || '');
        });

        // Extract address patterns
        const addressText = $('[class*="address"], [itemprop="address"], address, [class*="location"]').first().text().trim();

        // Extract social links
        const socialLinks: string[] = [];
        $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="youtube.com"], a[href*="x.com"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) socialLinks.push(href);
        });

        // Extract FAQs
        const extractedFaqs = this.extractFAQs($);

        // Extract existing structured data
        const existingSchemas: any[] = [];
        $('script[type="application/ld+json"]').each((_, el) => {
            try { existingSchemas.push(JSON.parse($(el).text())); } catch { }
        });

        // Determine page type
        let pageType = "WebPage";
        const lowUrl = url.toLowerCase();
        if (lowUrl.includes("/about")) pageType = "AboutPage";
        else if (lowUrl.includes("/service")) pageType = "Service";
        else if (lowUrl.includes("/product") || lowUrl.includes("/shop") || lowUrl.includes("/store")) pageType = "Product";
        else if (lowUrl.includes("/contact")) pageType = "ContactPage";
        else if (lowUrl.includes("/blog") || lowUrl.includes("/article") || lowUrl.includes("/news")) pageType = "BlogPosting";
        else if (lowUrl.includes("/faq")) pageType = "FAQPage";
        else if (url === new URL(url).origin + '/' || url === new URL(url).origin) pageType = "WebSite";

        // Extract ratings/reviews/prices
        const extractedRating = this.extractRatings($);
        const extractedReviews = this.extractReviews($);
        const extractedPrice = this.extractPrice($);

        // Organization signals
        const domain = new URL(url).hostname;
        const brand = ogData.ogSiteName || title.split('|')[1]?.trim() || title.split('-')[1]?.trim() || domain.replace(/^www\./, '').split('.')[0];
        const brandCapitalized = brand.charAt(0).toUpperCase() + brand.slice(1);
        const logo = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || $('link[rel="apple-touch-icon"]').attr('href') || '/favicon.ico';
        const absoluteLogo = logo.startsWith('http') ? logo : `${new URL(url).origin}${logo.startsWith('/') ? '' : '/'}${logo}`;

        const typesToGenerate = selectedSchemaTypes?.length ? selectedSchemaTypes : this.getRelevantSchemaTypes(pageType, extractedFaqs, extractedRating, extractedReviews);

        const prompt = `You are a JSON-LD structured data expert. Generate valid schema markup.

RULES:
- Return ONLY valid JSON, no markdown, no explanation
- MUST include "@context": "https://schema.org" at top level
- MUST generate ALL these types in @graph: ${typesToGenerate.join(', ')}
- Optimize for AIO (AI Optimization), GEO (Generative Engine Optimization), and SXO (Search Experience Optimization) by providing ultra-clear, context-rich entity definitions and comprehensive answers to user intents.
- Use ONLY real data from the content below — no fake/placeholder data
- For FAQPage: generate 5+ "People Also Ask" style questions that real users search for regarding this topic, and provide detailed answers based on the content
- For Product: use real product name, description, image, price if found
- For Organization: use real brand name "${brandCapitalized}", real logo, real social links
- For Review: only if real ratings found on page
- Every schema entry must use real content from the website

WEBSITE DATA:
URL: ${url}
Domain: ${domain}
Brand: ${brandCapitalized}
Title: ${title}
H1: ${h1}
Meta Description: ${description}
OG Title: ${ogData.ogTitle}
OG Description: ${ogData.ogDescription}
OG Image: ${ogData.ogImage}
OG Site Name: ${ogData.ogSiteName}
Headings: ${h2_h3.substring(0, 500)}
Content: ${mainContent.substring(0, 2500)}
Images Found: ${images.slice(0, 5).join(', ')}
Phone: ${phoneLinks[0] || phoneFromContent?.[0] || ''}
Email: ${emailLinks[0] || ''}
Address: ${addressText || ''}
Social Links: ${socialLinks.join(', ')}
${extractedFaqs.length > 0 ? `Extracted FAQs: ${JSON.stringify(extractedFaqs).substring(0, 1000)}` : ''}
${extractedRating ? `Rating Found: ${JSON.stringify(extractedRating)}` : ''}
${extractedReviews.length > 0 ? `Reviews Found: ${JSON.stringify(extractedReviews).substring(0, 500)}` : ''}
${extractedPrice ? `Price Found: ${extractedPrice}` : ''}
${existingSchemas.length > 0 ? `Existing Schema on Page: ${JSON.stringify(existingSchemas).substring(0, 1000)}` : ''}

OUTPUT (valid JSON only):
{"pageType":"${pageType}","schemaType":"Graph","jsonLd":{"@context":"https://schema.org","@graph":[...]},"optimizedFor":["SEO","AIO","GEO","SXO"]}`;

        // Try OpenAI
        const openAiKey = await getOpenAiApiKey();
        if (openAiKey) {
            try {
                const openai = new OpenAI({ apiKey: openAiKey });
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'Return ONLY valid JSON. Always include @context. Generate ALL requested schema types. Use real website data only.' },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.2
                });

                const result = JSON.parse(completion.choices[0]?.message?.content || '{}') as GeneratedSchemaResult;
                // Ensure @context is always present
                if (result.jsonLd && !result.jsonLd['@context']) {
                    result.jsonLd['@context'] = 'https://schema.org';
                }
                result.ogData = ogData;
                return result;
            } catch (e) {
                console.error("[AISchemaService] OpenAI failed, trying Gemini...");
            }
        }

        // Try Gemini
        const geminiKey = await getGeminiApiKey();
        if (geminiKey) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const gResult = await response.json();
                const text = gResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
                const cleanText = text.replace(/```json|```/g, "").trim();
                const parsed = JSON.parse(cleanText) as GeneratedSchemaResult;
                if (parsed.jsonLd && !parsed.jsonLd['@context']) {
                    parsed.jsonLd['@context'] = 'https://schema.org';
                }
                parsed.ogData = ogData;
                return parsed;
            } catch (e) {
                console.error("[AISchemaService] Gemini also failed, using fallback.");
            }
        }

        // FALLBACK: Generate from real scraped data
        return this.buildFallbackSchema(url, pageType, typesToGenerate, {
            title, description, h1, h2_h3, allHeadings, brand: brandCapitalized, absoluteLogo,
            extractedFaqs, extractedRating, extractedReviews, extractedPrice,
            ogData, businessInfo, mainContent, images, phoneLinks, phoneFromContent,
            emailLinks, addressText, socialLinks
        });
    }

    private extractFAQs($: cheerio.CheerioAPI): any[] {
        const faqs: any[] = [];
        const questionKeywords = ['how', 'what', 'can i', 'why', 'where', 'when', 'do you', 'is there', 'are there', 'will'];

        const isValidQuestion = (q: string) => {
            const lowerQ = q.toLowerCase();
            return q.includes('?') || questionKeywords.some(k => lowerQ.startsWith(k));
        };

        const isValidAnswer = (a: string) => {
            // An answer should be somewhat substantial, not just a list of menu links
            return a.length > 20 && !a.includes('  '); // Lots of spaces usually indicates stripped HTML list
        };

        // Pattern 1: <details>/<summary> (Be careful: often used for mobile menus)
        $('details').each((_, el) => {
            const q = $(el).find('summary').text().trim();
            const a = $(el).text().replace(q, '').trim();
            if (q && a && isValidQuestion(q) && isValidAnswer(a)) {
                faqs.push({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } });
            }
        });

        // Pattern 2: Headings followed by content
        if (faqs.length < 5) {
            $('h2, h3, h4').each((_, el) => {
                const q = $(el).text().trim();
                // A question shouldn't be too long (like a whole paragraph)
                if (q.length > 10 && q.length < 150 && isValidQuestion(q)) {
                    const a = $(el).next('p, div, span').text().trim();
                    if (a && isValidAnswer(a)) {
                        faqs.push({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } });
                    }
                }
            });
        }

        // Pattern 3: Paragraphs/List items that look like FAQs
        if (faqs.length < 5) {
            $('p, li').each((_, el) => {
                const q = $(el).text().trim();
                if (q.length > 10 && q.length < 150 && isValidQuestion(q) && q.endsWith('?')) {
                    const a = $(el).next('p, div').text().trim() || $(el).parent().next().text().trim();
                    if (a && isValidAnswer(a)) {
                        faqs.push({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } });
                    }
                }
            });
        }

        return faqs;
    }

    private getRelevantSchemaTypes(pageType: string, faqs: any[], rating: any, reviews: any[]): string[] {
        const types: string[] = ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList'];

        switch (pageType) {
            case 'Service': types.push('Service'); break;
            case 'Product': types.push('Product'); break;
            case 'BlogPosting': types.push('BlogPosting'); break;
            case 'ContactPage': types.push('LocalBusiness'); break;
            case 'FAQPage': types.push('FAQPage'); break;
        }

        if (faqs.length >= 2) types.push('FAQPage');
        if (rating || reviews.length > 0) types.push('Review');

        return Array.from(new Set(types));
    }

    private extractRatings($: cheerio.CheerioAPI): any | null {
        let rating = null;

        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const data = JSON.parse($(el).text());
                if (data.aggregateRating) rating = data.aggregateRating;
                if (data['@graph']) {
                    for (const item of data['@graph']) {
                        if (item.aggregateRating) rating = item.aggregateRating;
                    }
                }
            } catch { }
        });

        if (!rating) {
            const ratingText = $('[class*="rating"], [class*="star"], [itemprop="ratingValue"]').first().text().trim();
            const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*(?:\/\s*5|out of 5|stars?)/i);
            const countMatch = $('[itemprop="reviewCount"], [class*="review-count"]').first().text().trim();
            const countNum = countMatch.match(/(\d+)/);

            if (ratingMatch) {
                rating = {
                    "@type": "AggregateRating",
                    "ratingValue": ratingMatch[1],
                    "bestRating": "5",
                    "reviewCount": countNum ? countNum[1] : "1"
                };
            }
        }

        return rating;
    }

    private extractReviews($: cheerio.CheerioAPI): any[] {
        const reviews: any[] = [];
        $('[itemprop="review"], [class*="review-item"], [class*="testimonial"]').each((_, el) => {
            const author = $(el).find('[itemprop="author"], [class*="author"], [class*="reviewer"]').text().trim();
            const body = $(el).find('[itemprop="reviewBody"], [class*="review-text"], [class*="review-content"], p').first().text().trim();
            const ratingEl = $(el).find('[itemprop="ratingValue"]').text().trim();
            if (author && body) {
                reviews.push({
                    "@type": "Review",
                    "author": { "@type": "Person", "name": author },
                    "reviewBody": body.substring(0, 300),
                    ...(ratingEl ? { "reviewRating": { "@type": "Rating", "ratingValue": ratingEl, "bestRating": "5" } } : {})
                });
            }
        });
        return reviews.slice(0, 5);
    }

    private extractPrice($: cheerio.CheerioAPI): string | null {
        const priceEl = $('[itemprop="price"], [class*="price"], .price').first().text().trim();
        const priceMatch = priceEl.match(/[\$£€₹]?\s*(\d+[.,]?\d*)/);
        return priceMatch ? priceMatch[0] : null;
    }

    private generateFAQsFromContent(h1: string, headings: string[], title: string, description: string, brand: string): any[] {
        const faqs: any[] = [];
        const topic = h1 || title;

        // PAA style Question 1
        faqs.push({
            "@type": "Question",
            "name": `What is ${topic} and why is it important?`,
            "acceptedAnswer": { "@type": "Answer", "text": description || `${topic} provides comprehensive solutions and services offered by ${brand}. It is essential for users looking for quality, reliability, and expertise.` }
        });

        // PAA style Question 2
        faqs.push({
            "@type": "Question",
            "name": `How much does ${topic} cost?`,
            "acceptedAnswer": { "@type": "Answer", "text": `Pricing for ${topic} varies based on specific requirements and scope. Please contact ${brand} directly or visit our website for detailed pricing information and quotes.` }
        });

        // PAA style from headings
        const topicHeadings = headings.filter(h => h.length > 5 && h.length < 150);
        for (let i = 0; i < Math.min(topicHeadings.length, 2); i++) {
            const heading = topicHeadings[i];
            faqs.push({
                "@type": "Question",
                "name": heading.includes('?') ? heading : `What are the benefits of ${heading}?`,
                "acceptedAnswer": { "@type": "Answer", "text": `${brand} provides detailed information about ${heading.toLowerCase()}. Our solutions are designed to maximize efficiency and deliver outstanding results for our clients.` }
            });
        }

        faqs.push({
            "@type": "Question",
            "name": `Is ${brand} a reliable provider for ${topic}?`,
            "acceptedAnswer": { "@type": "Answer", "text": `Yes, ${brand} is a highly trusted and recognized provider in the industry. We are known for our commitment to quality, excellent customer support, and proven track record with clients worldwide.` }
        });

        if (faqs.length < 5) {
            faqs.push({
                "@type": "Question",
                "name": `How do I get started with ${brand}?`,
                "acceptedAnswer": { "@type": "Answer", "text": `Getting started is easy! Simply visit our official website and reach out via our contact page, or explore our services to see how we can assist you.` }
            });
        }

        return faqs.slice(0, 6);
    }

    private buildFallbackSchema(url: string, pageType: string, typesToGenerate: string[], data: any): GeneratedSchemaResult {
        const {
            title, description, h1, allHeadings, brand, absoluteLogo,
            extractedFaqs, extractedRating, extractedReviews, extractedPrice,
            ogData, businessInfo, images, phoneLinks, phoneFromContent,
            emailLinks, addressText, socialLinks
        } = data;

        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        // Build breadcrumbs
        const breadcrumbs = [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": urlObj.origin }
        ];
        pathParts.forEach((p, i) => {
            breadcrumbs.push({
                "@type": "ListItem",
                "position": i + 2,
                "name": decodeURIComponent(p).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                "item": `${urlObj.origin}/${pathParts.slice(0, i + 1).join('/')}`
            });
        });

        const phone = phoneLinks?.[0] || phoneFromContent?.[0] || businessInfo?.phone || '';
        const email = emailLinks?.[0] || businessInfo?.email || '';
        const mainImage = ogData.ogImage || images?.[0] || '';

        const graph: any[] = [];

        // ---- ORGANIZATION ----
        if (typesToGenerate.includes('Organization')) {
            graph.push({
                "@type": "Organization",
                "@id": `${urlObj.origin}/#organization`,
                "name": brand,
                "url": urlObj.origin,
                "logo": { "@type": "ImageObject", "url": absoluteLogo },
                ...(mainImage ? { "image": mainImage } : {}),
                ...(description ? { "description": description } : {}),
                ...(phone ? { "telephone": phone } : {}),
                ...(email ? { "email": email } : {}),
                ...(socialLinks?.length > 0 ? { "sameAs": socialLinks } : {})
            });
        }

        // ---- WEBSITE ----
        if (typesToGenerate.includes('WebSite')) {
            graph.push({
                "@type": "WebSite",
                "@id": `${urlObj.origin}/#website`,
                "url": urlObj.origin,
                "name": ogData.ogSiteName || brand,
                "description": ogData.ogDescription || description,
                "publisher": { "@id": `${urlObj.origin}/#organization` },
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": { "@type": "EntryPoint", "urlTemplate": `${urlObj.origin}/?s={search_term_string}` },
                    "query-input": "required name=search_term_string"
                }
            });
        }

        // ---- WEBPAGE ----
        if (typesToGenerate.includes('WebPage')) {
            graph.push({
                "@type": "WebPage",
                "@id": `${url}#webpage`,
                "url": url,
                "name": ogData.ogTitle || title,
                "description": ogData.ogDescription || description,
                ...(mainImage ? { "primaryImageOfPage": { "@type": "ImageObject", "url": mainImage } } : {}),
                "isPartOf": { "@id": `${urlObj.origin}/#website` },
                "about": { "@id": `${urlObj.origin}/#organization` },
                "breadcrumb": { "@id": `${url}#breadcrumb` },
                "inLanguage": "en"
            });
        }

        // ---- BREADCRUMBLIST ----
        if (typesToGenerate.includes('BreadcrumbList')) {
            graph.push({
                "@type": "BreadcrumbList",
                "@id": `${url}#breadcrumb`,
                "itemListElement": breadcrumbs
            });
        }

        // ---- FAQPAGE ----
        if (typesToGenerate.includes('FAQPage')) {
            const faqs = extractedFaqs.length >= 3
                ? extractedFaqs
                : this.generateFAQsFromContent(h1, allHeadings || [], title, description, brand);

            graph.push({
                "@type": "FAQPage",
                "@id": `${url}#faq`,
                "mainEntity": faqs
            });
        }

        // ---- SERVICE ----
        if (typesToGenerate.includes('Service')) {
            graph.push({
                "@type": "Service",
                "@id": `${url}#service`,
                "name": h1 || title,
                "provider": { "@id": `${urlObj.origin}/#organization` },
                "description": ogData.ogDescription || description || `Professional services by ${brand}.`,
                "url": url,
                ...(mainImage ? { "image": mainImage } : {}),
                "areaServed": { "@type": "Country", "name": "Worldwide" }
            });
        }

        // ---- PRODUCT ----
        if (typesToGenerate.includes('Product')) {
            const productSchema: any = {
                "@type": "Product",
                "@id": `${url}#product`,
                "name": ogData.ogTitle || h1 || title,
                "description": ogData.ogDescription || description,
                "brand": { "@type": "Brand", "name": brand },
                "url": url,
                ...(mainImage ? { "image": mainImage } : {})
            };

            if (extractedPrice) {
                productSchema.offers = {
                    "@type": "Offer",
                    "url": url,
                    "price": extractedPrice.replace(/[^\d.]/g, ''),
                    "priceCurrency": extractedPrice.includes('₹') ? 'INR' : extractedPrice.includes('€') ? 'EUR' : extractedPrice.includes('£') ? 'GBP' : 'USD',
                    "availability": "https://schema.org/InStock"
                };
            }

            if (extractedRating) productSchema.aggregateRating = extractedRating;
            if (extractedReviews.length > 0) productSchema.review = extractedReviews;

            graph.push(productSchema);
        }

        // ---- BLOGPOSTING ----
        if (typesToGenerate.includes('BlogPosting')) {
            graph.push({
                "@type": "BlogPosting",
                "@id": `${url}#blogposting`,
                "headline": ogData.ogTitle || h1 || title,
                "description": ogData.ogDescription || description,
                ...(mainImage ? { "image": { "@type": "ImageObject", "url": mainImage } } : {}),
                "url": url,
                "mainEntityOfPage": { "@id": `${url}#webpage` },
                "author": { "@id": `${urlObj.origin}/#organization` },
                "publisher": { "@id": `${urlObj.origin}/#organization` },
                "inLanguage": "en"
            });
        }

        // ---- LOCALBUSINESS ----
        if (typesToGenerate.includes('LocalBusiness')) {
            const localSchema: any = {
                "@type": "LocalBusiness",
                "@id": `${urlObj.origin}/#localbusiness`,
                "name": brand,
                "url": urlObj.origin,
                ...(mainImage ? { "image": mainImage } : {}),
                ...(absoluteLogo ? { "logo": absoluteLogo } : {}),
                ...(description ? { "description": description } : {}),
                ...(phone ? { "telephone": phone } : {}),
                ...(email ? { "email": email } : {})
            };

            if (addressText) {
                localSchema.address = { "@type": "PostalAddress", "streetAddress": addressText };
            } else if (businessInfo?.address) {
                localSchema.address = { "@type": "PostalAddress", ...businessInfo.address };
            }

            if (extractedRating) localSchema.aggregateRating = extractedRating;
            if (socialLinks?.length > 0) localSchema.sameAs = socialLinks;

            graph.push(localSchema);
        }

        // ---- REVIEW (standalone if no Product/Service/LocalBusiness) ----
        if (typesToGenerate.includes('Review')) {
            const hasHost = typesToGenerate.includes('Product') || typesToGenerate.includes('Service') || typesToGenerate.includes('LocalBusiness');
            if (!hasHost && (extractedRating || extractedReviews.length > 0)) {
                const reviewEntity: any = {
                    "@type": "Product",
                    "@id": `${url}#reviewed-item`,
                    "name": ogData.ogTitle || h1 || title,
                    "description": ogData.ogDescription || description,
                    ...(mainImage ? { "image": mainImage } : {})
                };
                if (extractedRating) reviewEntity.aggregateRating = extractedRating;
                if (extractedReviews.length > 0) reviewEntity.review = extractedReviews;
                graph.push(reviewEntity);
            }
        }

        return {
            pageType,
            schemaType: "Graph",
            jsonLd: {
                "@context": "https://schema.org",
                "@graph": graph
            },
            optimizedFor: ["SEO", "AIO", "GEO", "SXO", "JSON-LD"],
            ogData
        };
    }

    async getSchemasByWebsiteId(websiteId: string) {
        return prisma.aiSchema.findMany({ where: { websiteId }, orderBy: { updatedAt: 'desc' } });
    }

    async updateSchema(id: string, data: Partial<{ status: string; generatedSchema: any }>) {
        return prisma.aiSchema.update({ where: { id }, data });
    }
}

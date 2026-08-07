import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { getOpenAiApiKey, getGeminiApiKey } from '@/lib/settings';

// Removed static initialization as we'll initialize per request with the DB key if needed

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { pages } = await req.json();
        if (!pages || !Array.isArray(pages)) {
            return NextResponse.json({ error: 'Pages array is required' }, { status: 400 });
        }

        // Check AI credits
        const credits = await prisma.aiCredit.findUnique({
            where: { userId: session.user.id },
        });

        if (!credits || credits.used + pages.length > credits.total) {
            return NextResponse.json({ error: 'Insufficient AI credits' }, { status: 402 });
        }

        const optimizedPages = await Promise.all(pages.map(async (page, index) => {
            // Clean input data from junk words and deduplicate
            const clean = (text: string) => {
                if (!text) return '';

                // Deduplicate words case-insensitively
                const words = text.split(/\s+/);
                const uniqueWords: string[] = [];
                const seen = new Set<string>();
                words.forEach(w => {
                    const low = w.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (low && !seen.has(low)) {
                        seen.add(low);
                        uniqueWords.push(w);
                    }
                });

                return uniqueWords.join(' ').replace(/[-\s]+$/, '').trim();
            };

            const cleanTitle = clean(page.title);
            const cleanH1 = clean(page.h1);
            const cleanH2 = clean(page.h2 || '');
            const cleanContent = clean(page.content || '');
            const brandName = 'Camdew';

            // Identify page intent
            const url = page.url.toLowerCase();
            let intent = 'General';
            if (url.includes('/about')) intent = 'About';
            else if (url.includes('/service')) intent = 'Service';
            else if (url.includes('/product')) intent = 'Product';
            else if (url.includes('/contact')) intent = 'Contact';
            else if (url.includes('/blog')) intent = 'Blog';

            const prompt = `You are an advanced SEO AI.
Your job is to analyze the given page content and generate a UNIQUE SEO Title and Meta Description.

IMPORTANT:
- Each page MUST be different
- Use the ACTUAL page content to understand context
- Do NOT reuse descriptions from other pages
- Do NOT repeat keywords

ANALYZE:
1. What is this page about?
2. What value does it provide?
3. What makes it different?

TITLE RULES:
- 50–60 characters
- Based on page topic (not generic)
- Include primary keyword naturally
- Add brand at end

DESCRIPTION RULES:
- 140–160 characters
- Summarize THIS page content only
- Add value + CTA
- No duplication

INPUT:
URL: ${page.url}
Page Type: ${intent}
H1: ${cleanH1}
H2: ${cleanH2}
Main Content: ${cleanContent.substring(0, 500)}
Keywords: ${clean(`${intent} ${cleanH1} ${cleanH2}`)}
Brand: ${brandName}

ANTI-DUPLICATION RULE:
If this output is similar to previous pages, rewrite it completely.

OUTPUT FORMAT:
Title: [clean SEO title]
Description: [clean meta description]`;

            let generatedTitle = '';
            let generatedDesc = '';

            const urlKeywords = page.url.split('/').filter(Boolean).pop()?.replace(/[-_.]/g, ' ') || '';
            const combinedKeywords = clean(`${urlKeywords} ${cleanH1} ${cleanH2.split(',')[0]}`).trim();
            const variation = index % 3;

            const geminiKey = await getGeminiApiKey();
            const openAiKey = await getOpenAiApiKey();

            if (geminiKey || openAiKey) {
                try {
                    // Use Gemini if configured, otherwise fallback to OpenAI
                    if (geminiKey) {
                        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                        const response = await fetch(geminiUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{
                                        text: `${prompt}\n\nReturn ONLY a JSON object with "title" and "description" keys. Do not include markdown.`
                                    }]
                                }]
                            })
                        });

                        const result = await response.json();
                        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            generatedTitle = parsed.title || '';
                            generatedDesc = parsed.description || '';
                        } else {
                            throw new Error("No JSON block found in Gemini response");
                        }
                    } else if (openAiKey) {
                        const openai = new OpenAI({ apiKey: openAiKey });
                        const completion = await openai.chat.completions.create({
                            model: 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: 'You are an advanced SEO AI. Analyze content deeply and ensure perfect uniqueness.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.9, // Higher for maximum uniqueness
                        });

                        const content = completion.choices[0]?.message?.content || '';
                        const titleMatch = content.match(/(?:Title|Meta Title|Suggested Title)\s*:\s*(.*)/i);
                        const descMatch = content.match(/(?:Description|Meta Description|Suggested Description)\s*:\s*(.*)/i);
                        generatedTitle = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : '';
                        generatedDesc = descMatch ? descMatch[1].replace(/\*\*/g, '').trim() : '';
                    }
                } catch (err) {
                    console.error("AI Generation failed, using content-aware fallback", err);
                    const titleBase = combinedKeywords || cleanTitle;

                    if (variation === 0) {
                        generatedTitle = `${titleBase} - Custom ${intent} Solutions | ${brandName}`;
                    } else if (variation === 1) {
                        generatedTitle = `${intent}: ${cleanH1 || titleBase} | ${brandName}`;
                    } else {
                        generatedTitle = `Why Choose Our ${intent} at ${brandName}? | ${titleBase}`;
                    }

                    generatedDesc = `Explore our ${intent} page to see how ${brandName} leverages ${cleanH1 || 'expert strategies'} to deliver results. ${cleanH2 ? 'Learn about ' + cleanH2.split(',')[0] : 'Transform your growth'}.`.substring(0, 160);
                }
            } else {
                // Advanced structural variation fallback
                const titleBase = combinedKeywords || cleanTitle;

                if (variation === 0) {
                    generatedTitle = `${titleBase} - Superior ${intent} Results | ${brandName}`;
                } else if (variation === 1) {
                    generatedTitle = `Premium ${intent}: ${cleanH1 || titleBase} | ${brandName}`;
                } else {
                    generatedTitle = `${brandName} ${intent} - ${cleanH2.split(',')[0] || titleBase}`;
                }

                generatedDesc = `Our ${intent} expertise at ${brandName} focuses on ${cleanH1 || 'delivering value'}. ${cleanH2 ? 'We cover ' + cleanH2.split(',')[0] : 'Get started today'} with our professional strategies.`.substring(0, 160);
            }

            return {
                ...page,
                aiTitle: generatedTitle,
                aiDescription: generatedDesc
            };
        }));

        // Deduct credits
        await prisma.aiCredit.update({
            where: { userId: session.user.id },
            data: { used: { increment: pages.length } }
        });

        return NextResponse.json({ results: optimizedPages });
    } catch (error) {
        console.error('[META GENERATE ERROR]', error);
        return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }
}

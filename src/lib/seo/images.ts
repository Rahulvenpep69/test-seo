import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { getOpenAiApiKey, getGeminiApiKey } from '../settings';

export interface ImageContext {
    src: string;
    alt: string;
    context: string;
    filename: string;
}

export function extractImagesWithContext(html: string, url: string): ImageContext[] {
    const $ = cheerio.load(html);
    const images: ImageContext[] = [];

    $('img').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (!src || src.startsWith('data:') || src.includes('pixel') || src.includes('tracking')) return;

        const alt = $(el).attr('alt') || '';

        // Extract surrounding context: parent text, nearby headings
        const parent = $(el).parent();
        const contextText = parent.text().trim().substring(0, 200);
        const nearbyHeading = $(el).closest('section, div, article').find('h1, h2, h3, h4').first().text().trim();

        const filename = src.split('/').pop()?.split('?')[0] || 'image';

        images.push({
            src: src.startsWith('http') ? src : new URL(src, url).toString(),
            alt,
            context: `${nearbyHeading ? `Heading: ${nearbyHeading}. ` : ''}${contextText}`,
            filename
        });
    });

    return images;
}

export async function generateAiAltTags(images: ImageContext[], pageTitle: string, pageDescription: string): Promise<{ altTags: string[], source: string }> {
    const prompt = `You are an SEO expert. Generate high-quality, descriptive, and keyword-rich ALT tags for the following images found on a page titled "${pageTitle}" with description "${pageDescription}".

IMAGE DATA:
${images.map((img, i) => `Image ${i + 1}:
- Source: ${img.src}
- Filename: ${img.filename}
- Current Alt: ${img.alt || 'None'}
- Context on page: ${img.context}`).join('\n\n')}

RULES:
1. Return ONLY a JSON array of strings in the exact same order as the images provided.
2. Each alt tag should be between 50-125 characters.
3. Be descriptive but concise.
4. Incorporate relevant keywords based on the page context if appropriate.
5. Do not use generic phrases like "image of" or "picture of".

OUTPUT FORMAT:
["Alt tag for image 1", "Alt tag for image 2", ...]`;

    let lastError: string | null = null;

    // 1. Try OpenAI
    const openAiKey = await getOpenAiApiKey();
    if (openAiKey) {
        try {
            const openai = new OpenAI({ apiKey: openAiKey });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that generates SEO alt tags. Return only the JSON array.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
            });

            const content = completion.choices[0]?.message?.content || '[]';
            return { altTags: JSON.parse(content.replace(/```json|```/g, '').trim()), source: 'openai' };
        } catch (e: any) {
            console.error('OpenAI failed:', e.message);
            lastError = `OpenAI: ${e.message}`;
            // If it's a 429 quota error, we definitely want to fall back
        }
    }

    // 2. Try Gemini
    const geminiKey = await getGeminiApiKey();
    if (geminiKey) {
        try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
            const response = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${prompt}\n\nReturn ONLY a JSON array of strings. Do not include markdown.`
                        }]
                    }]
                })
            });

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error.message || 'Gemini API returned an error');
            }
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
            const cleanText = text.replace(/```json|```/g, "").trim();
            return { altTags: JSON.parse(cleanText), source: 'gemini' };
        } catch (e: any) {
            console.error('Gemini fallback failed:', e.message);
            const gemMsg = `Gemini: ${e.message}`;
            lastError = lastError ? `${lastError} | ${gemMsg}` : gemMsg;
        }
    }

    // 3. Fallback to Heuristic Generation
    console.warn(`[Alt Tag Generator] AI failed or not configured. Using heuristic fallback. Last Error: ${lastError}`);

    const usedTags = new Set<string>();
    const descriptiveSuffixes = ["display", "presentation", "illustration", "showcase", "visual", "gallery item", "feature", "detail", "overview"];

    // Build a semantic keyword pool from the page content
    const baseWebsiteName = pageTitle.split(/[-\\|]/)[0].trim() || 'website';
    const rawSemanticPool = [baseWebsiteName];

    images.forEach(img => {
        const heading = img.context.match(/Heading: (.*?)\\./)?.[1];
        if (heading && heading.length > 3) rawSemanticPool.push(heading);
    });

    if (rawSemanticPool.length < 3) {
        rawSemanticPool.push('visual content', 'website details', 'professional showcase', 'quality representation');
    }

    const uniquePool = Array.from(new Set(rawSemanticPool));

    const heuristicTags = images.map((img, index) => {
        // 1. Remove file extensions
        let base = img.filename.replace(/\.[^/.]+$/, "");

        // 2. Remove tokens containing numbers (e.g. UUIDs like 192cf69e, dates like 2025-09-03)
        base = base.split(/[-_.\s]+/)
            .filter(word => !/\d/.test(word))
            .join(' ');

        // 3. Remove common unhelpful words
        base = base.replace(/\b(whatsapp|screenshot|image|img|pic|picture|photo|thumbnail)\b/gi, " ").trim();

        // 4. Remove isolated fragments (1-2 chars) left over from hashes
        base = base.split(/\s+/)
            .filter(word => word.length >= 3)
            .join(' ');

        const isLogo = base.toLowerCase().includes('logo') || img.filename.toLowerCase().includes('logo');
        const isBanner = base.toLowerCase().includes('banner') || base.toLowerCase().includes('hero') || img.filename.toLowerCase().includes('banner');

        // Extract keywords
        const primaryKeyword = pageTitle.split(/[-\|]/)[0].trim() || 'website';
        const rawContext = img.context.replace(/Heading:.*?\. /, '').trim();
        const contextKeyword = rawContext.split(/[.,]/)[0].substring(0, 40).trim();
        const h1 = img.context.match(/Heading: (.*?)\./)?.[1] || '';

        let alt = "";

        if (isLogo) {
            alt = `${primaryKeyword} official company logo`;
        } else if (isBanner) {
            alt = `${primaryKeyword} website banner showing ${contextKeyword || h1 || 'visual showcase'}`;
        } else if (base.length > 3) {
            // Capitalize first letter
            base = base.charAt(0).toUpperCase() + base.slice(1);

            alt = `${base}`;
            if (h1 || contextKeyword) {
                alt += ` illustrating ${h1 || contextKeyword}`;
            }
        } else {
            // Fallback when filename is just numbers/hashes
            const seoKeyword = uniquePool[index % uniquePool.length];

            alt = `${seoKeyword}`;
            if (h1 && h1 !== baseWebsiteName && !alt.includes(h1)) {
                alt += ` - ${h1}`;
            }
            if (contextKeyword && contextKeyword !== seoKeyword) {
                alt += ` illustrating ${contextKeyword}`;
            }

            // Clean up and capitalize
            alt = alt.charAt(0).toUpperCase() + alt.slice(1);
        }

        // Clean up multiple spaces
        alt = alt.replace(/\s+/g, ' ').trim();

        // Prevent exact duplicates using natural suffixes
        let deduplicatedAlt = alt;
        let counter = 0;
        while (usedTags.has(deduplicatedAlt)) {
            const suffix = descriptiveSuffixes[counter % descriptiveSuffixes.length];
            const cycle = Math.floor(counter / descriptiveSuffixes.length);

            deduplicatedAlt = `${alt} ${suffix}${cycle > 0 ? ` ${cycle + 1}` : ''}`;
            counter++;
        }

        if (deduplicatedAlt.length > 120) {
            deduplicatedAlt = deduplicatedAlt.substring(0, 117) + '...';
        }

        usedTags.add(deduplicatedAlt);
        return deduplicatedAlt;
    });

    return { altTags: heuristicTags, source: 'heuristic' };
}

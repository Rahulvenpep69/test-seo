import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchKeywordsFromGoogle, isGoogleSearchConfigured } from '@/lib/seo/google-search';
import { fetchKeywordsFromSerpApi } from '@/lib/seo/serp-api';
import { getOpenAiApiKey } from '@/lib/settings';
import OpenAI from 'openai';

export const maxDuration = 60;

// Helper to generate a random number within a range
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomIntent = () => {
    const intents = ['Commercial', 'Informational', 'Transactional', 'Navigational'] as const;
    return intents[Math.floor(Math.random() * intents.length)];
};

/**
 * Fallback mock keyword generator — used if all real APIs fail.
 */
function generateMockKeywords(query: string) {
    const cleanQuery = query.toLowerCase().replace(/https?:\/\//g, '').replace(/www\./g, '').split('.')[0];
    const baseWords = cleanQuery.split(' ');
    const mainTopic = baseWords[baseWords.length - 1] || 'topic';

    const prefixes = ['best', 'top', 'how to choose', 'cheap', 'buy', 'reviews for', 'what is', 'guide to', 'affordable', 'premium'];
    const suffixes = ['services', 'software', 'tools', 'online', 'near me', '2024', 'tutorial', 'for beginners', 'price', 'agency'];

    const mockKeywords = [];

    for (let i = 0; i < 25; i++) {
        let keywordText = '';

        const style = rand(1, 4);
        if (style === 1) {
            keywordText = `${prefixes[rand(0, prefixes.length - 1)]} ${cleanQuery}`;
        } else if (style === 2) {
            keywordText = `${cleanQuery} ${suffixes[rand(0, suffixes.length - 1)]}`;
        } else if (style === 3) {
            keywordText = `${mainTopic} ${suffixes[rand(0, suffixes.length - 1)]}`;
        } else {
            keywordText = `${prefixes[rand(0, prefixes.length - 1)]} ${mainTopic} ${suffixes[rand(0, suffixes.length - 1)]}`;
        }

        const volume = rand(500, 500000);
        const traffic = Math.floor(volume * (rand(5, 30) / 100));

        let intent = getRandomIntent();
        if (keywordText.includes('buy') || keywordText.includes('cheap') || keywordText.includes('price')) intent = 'Transactional';
        if (keywordText.includes('best') || keywordText.includes('top') || keywordText.includes('reviews')) intent = 'Commercial';
        if (keywordText.includes('how to') || keywordText.includes('what is') || keywordText.includes('guide')) intent = 'Informational';

        mockKeywords.push({
            keyword: keywordText,
            intent,
            volume,
            traffic,
            type: keywordText.split(' ').length > 2 ? 'Long Tail' : 'Short Tail',
        });
    }

    const uniqueKeywords = Array.from(new Map(mockKeywords.map(item => [item.keyword, item])).values()).slice(0, 25);
    return uniqueKeywords;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query, country } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        console.log(`[Keywords] Analyzing query: "${query}" in country: "${country || 'us'}"`);

        // --- 1. SerpApi / Google Autocomplete (Primary Source) ---
        // This is highly effective for getting real keyword suggestions
        try {
            const serpKeywords = await fetchKeywordsFromSerpApi(query, country);
            if (serpKeywords.length > 0) {
                console.log(`[Keywords] Success using SerpApi/Autocomplete. Found ${serpKeywords.length} keywords.`);
                return NextResponse.json({
                    keywords: serpKeywords,
                    source: serpKeywords[0].source || 'real-time'
                });
            }
        } catch (err) {
            console.error('[Keywords] SerpApi failed:', err);
        }

        // --- 2. Google Custom Search (Alternative real-time data) ---
        if (isGoogleSearchConfigured()) {
            console.log(`[Keywords] Using Google Custom Search API for query: "${query}"`);
            const keywords = await fetchKeywordsFromGoogle(query);

            if (keywords.length > 0) {
                return NextResponse.json({
                    keywords,
                    source: 'google-cse',
                    message: `Found ${keywords.length} real-time keywords from Google CSE.`,
                });
            }
        }

        // --- 3. OpenAI Fallback (Contextual generation) ---
        const apiKey = await getOpenAiApiKey();
        if (apiKey) {
            console.log(`[Keywords] Using OpenAI fallback for query: "${query}"`);
            const openai = new OpenAI({ apiKey });

            const refinedSystemPrompt = `You are an expert SEO specialist and data analyst.
The user will provide a seed keyword or a website URL.
Your task is to generate a comprehensive list of exactly 25 highly relevant SEO keywords.
For each keyword, provide realistic estimates for:
- intent (strictly one of: "Commercial", "Informational", "Transactional", "Navigational")
- volume (monthly search volume, an integer)
- traffic (estimated monthly organic traffic potential, an integer)
- type (strictly one of: "Short Tail" or "Long Tail")

Return the result STRICTLY as a JSON object with a single key "keywords" that contains the array. Do not output anything else.`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: refinedSystemPrompt },
                    { role: 'user', content: `Generate 25 SEO keywords for: ${query}` }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            });

            const rawResponse = completion.choices[0].message.content || '{"keywords": []}';
            const parsedData = JSON.parse(rawResponse);
            return NextResponse.json({ keywords: parsedData.keywords, source: 'openai' });
        }

        // --- 4. Final fallback: Smart mock ---
        console.log('[Keywords] All real-time sources failed. Using smart mock fallback.');
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing time
        const mockKeywords = generateMockKeywords(query);

        return NextResponse.json({
            keywords: mockKeywords,
            source: 'mock',
            note: 'Real-time sources failed. Using generated suggestions.',
        });

    } catch (error: any) {
        console.error('Keyword generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate keywords.' },
            { status: 500 }
        );
    }
}

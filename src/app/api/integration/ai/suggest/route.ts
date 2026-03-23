import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { action, title: rawTitle, content: rawContent, keywords, url } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // Utility to clean and deduplicate
        const clean = (text: string) => {
            if (!text) return "";
            // Remove many repeating prefixes or common junk
            let t = text.replace(/\[Optimized\]/gi, "")
                .replace(/\[.*?\]/g, "")
                .replace(/optimized/gi, "")
                .replace(/best/gi, "")
                .replace(/top/gi, "")
                .replace(/leading/gi, "")
                .replace(/premium/gi, "");

            const words = t.split(/\s+/);
            const seen = new Set<string>();
            const unique = words.filter(w => {
                const low = w.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (low && !seen.has(low)) {
                    seen.add(low);
                    return true;
                }
                return false;
            });
            return unique.join(" ").trim();
        };

        const title = clean(rawTitle);
        const content = clean(rawContent || "");

        if (!apiKey) {
            // High-quality varied mock responses
            const base = title || "Business Services";
            const mocks = [
                {
                    title: `${base} | Custom Digital Strategy`,
                    description: `Scale your business results with our expert ${base} solutions. We focus on delivering measurable growth through tailored search strategies. Get started.`
                },
                {
                    title: `Professional ${base} and Ranking Growth`,
                    description: `Struggling with search visibility? Our ${base} services solve complex SEO challenges to help you reach more customers. Explore our plan now.`
                },
                {
                    title: `Why Choose ${base} for Your Brand?`,
                    description: `${base} provides the technical foundation your website needs to dominate search results. Experience professional excellence today with our team.`
                }
            ];

            // Pick a mock based on title length or random to ensure variety in review screen
            const mockIndex = (title.length + (url?.length || 0)) % mocks.length;
            const mock = mocks[mockIndex];

            if (action === "keywords") {
                return NextResponse.json([
                    "Growth Marketing", "Organic Traffic", "Search Performance",
                    "Content Authority", "Visibility Rank", "Digital Scale",
                    "Keyword Flow", "Audience Reach", "Strategic Ranking", "SEO Value"
                ]);
            } else if (action === "optimize") {
                return NextResponse.json(mock);
            }

            return NextResponse.json(
                { error: "Gemini API key not configured" },
                { status: 500 }
            );
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        let prompt = "";
        if (action === "keywords") {
            prompt = `Analyze this website URL: ${url}. 
      Suggest 10 unique, high-performing SEO keywords based ONLY on topics found on the page.
      STRICT RULES:
      - Do NOT use generic words like: optimized, best, top, leading, premium.
      - Do NOT repeat words.
      - Return ONLY a JSON array of strings.`;
        } else if (action === "optimize") {
            prompt = `You are an SEO expert.
Your job is to generate a UNIQUE, CLEAN, and HUMAN-READABLE SEO Title and Meta Description for: ${title}.

STRICT RULES:
- Do NOT use repetitive starting verbs like: Explore, Discover, Learn more.
- Avoid starting descriptions with the same word as any previous page.
- Do NOT use brackets [] or duplicate words.
- Each page must be completely unique in structure.

DESCRIPTION STRUCTURE (vary these):
1. Benefit-first: Start with the value user gets.
2. Problem-first: Start with the challenge you solve.
3. Service-first: Explain the specific offering.

CONTENT ANALYSIS:
- Input Content: ${content.substring(0, 1000)}
- Keywords: ${keywords.join(", ")}

TITLE RULES:
- 50–60 characters
- Clear and relevant to page topic
- Include keyword naturally
- Add brand name at the end

DESCRIPTION RULES:
- 140–160 characters
- Never start with "Explore" or "Discover".
- Use varied sentence structures.
- Include a natural, unique CTA.

ANTI-REPETITION:
Every output must feel human and distinct. Do not use a fallback pattern.

OUTPUT FORMAT:
Return ONLY a JSON object with "title" and "description" fields. No markdown.`;
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error?.message || "Failed to call Gemini API");
        }

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanText = text.replace(/```json|```/g, "").trim();

        try {
            return NextResponse.json(JSON.parse(cleanText));
        } catch (e) {
            // Fallback if parsing fails
            const jsonStr = cleanText.match(/\[[\s\S]*\]|\{[\s\S]*\}/)?.[0] || cleanText;
            return NextResponse.json(JSON.parse(jsonStr));
        }
    } catch (error: any) {
        console.error("Gemini Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

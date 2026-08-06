import { getOpenAiApiKey, getGeminiApiKey } from '../settings';
import OpenAI from 'openai';
import { AuditInput } from './audit-engine';

export interface SEOIssueCard {
    title: string;
    status: 'Pass' | 'Warning' | 'Fail';
    impact: 'High' | 'Medium' | 'Low';
    confidence: string;
    summary: string;
    details: {
        explanation: string;
        proof: string;
        fix: string;
        how_to_fix: string;
        source: 'HTML Analysis' | 'PageSpeed Data' | 'HTTP Check';
    };
}

export class AIAuditService {
    async generateIssues(input: AuditInput): Promise<SEOIssueCard[]> {
        const prompt = `You are an advanced SEO audit engine with PROOF-BASED reporting.

Your job is to generate structured SEO issue cards with expandable details.

---
## INPUT
Website URL: ${input.url}
HTML Data: ${input.html_data ? input.html_data.substring(0, 15000) : 'Not available'}
PageSpeed Data: ${input.pagespeed_data ? JSON.stringify(input.pagespeed_data).substring(0, 5000) : 'Not available'}
HTTP Data: ${input.http_data ? JSON.stringify(input.http_data).substring(0, 5000) : 'Not available'}

---
## STRICT RULES
1. DO NOT create fake issues
2. ONLY report issues if PROOF exists in data
3. If proof is missing → DO NOT show issue
4. Each issue MUST include:
   - Title
   - Status
   - Impact
   - Confidence
   - Short summary (collapsed view)
   - Detailed dropdown content

---
## OUTPUT FORMAT (VERY IMPORTANT)
Return a JSON object with an "issues" array like this:
{
"issues": [
    {
    "title": "Meta Description Missing",
    "status": "Fail",
    "impact": "High",
    "confidence": "95%",
    "summary": "Meta description is missing on this page.",
    "details": {
      "explanation": "Meta descriptions help improve click-through rate from search results. Missing descriptions reduce visibility and CTR.",
      "proof": "<meta name='description' content=''>",
      "fix": "<meta name='description' content='Add a compelling description with primary keywords (120-160 characters)'>",
      "how_to_fix": "Add a meta description inside the <head> section of your HTML.",
      "source": "HTML Analysis"
    }
    }
]
}

---
## DETAIL RULES
1. TITLE: Clear issue name. Example: "Missing H1 Tag"
2. STATUS: Pass / Warning / Fail
3. IMPACT: High → affects ranking, Medium → affects UX/SEO, Low → minor issue
4. CONFIDENCE: Based on data clarity. Example: 95% → clearly detected, 60% → partial data
5. SUMMARY: 1 short sentence, no explanation.

---
## DROPDOWN DETAILS
EXPLANATION: Why this issue matters for SEO
PROOF: MUST include actual HTML snippet or real value. If not available → do not include issue.
FIX: Provide ready-to-use code or exact correction
HOW_TO_FIX: Simple step instruction
SOURCE: One of: HTML Analysis, PageSpeed Data, HTTP Check

---
## IMPORTANT CONDITIONS
* Do NOT repeat similar issues
* Do NOT generate generic advice
* Do NOT use placeholder text
* Only output REAL detected issues
* If no issues found: Return: { "issues": [] }

NO FAKE DATA.`;

        // Try OpenAI First
        const openAiKey = await getOpenAiApiKey();
        if (openAiKey) {
            try {
                const openai = new OpenAI({ apiKey: openAiKey });
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are an advanced proof-based SEO audit engine. Return ONLY a valid JSON object containing an "issues" array.' },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.1
                });

                const content = completion.choices[0]?.message?.content || '{"issues":[]}';
                const parsed = JSON.parse(content);
                return parsed.issues || [];
            } catch (e) {
                console.error("[AIAuditService] OpenAI failed, trying Gemini...", e);
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
                const parsed = JSON.parse(cleanText);
                return parsed.issues || [];
            } catch (e) {
                console.error("[AIAuditService] Gemini also failed", e);
            }
        }

        return [];
    }
}

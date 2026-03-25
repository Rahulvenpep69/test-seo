import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { getOpenAiApiKey } from '@/lib/settings';

// Removed static initialization as we'll initialize per request with the DB key if needed

const prompts: Record<string, (input: string) => string> = {
    title: (input) => `Generate 3 SEO-optimized page titles for: "${input}". 
    Rules: Include primary keyword naturally, max 60 chars each, use power words, use numbers or emojis where appropriate.
    Format: Return exactly 3 titles, one per line, no numbering.`,

    meta: (input) => `Generate 2 compelling meta descriptions for: "${input}".
    Rules: 150-160 characters each, include call-to-action, mention key benefit, include relevant keyword.
    Format: Return exactly 2 descriptions, one per line, no numbering.`,

    product: (input) => `Write an SEO-optimized product description for: "${input}".
    Rules: 150-200 words, include key benefits, use sensory language, naturally include keywords, end with CTA.
    Format: Return a single product description.`,

    faq: (input) => `Generate 3 FAQ questions and answers for: "${input}".
    Rules: Questions should match what users actually search, answers should be 2-3 sentences each, optimized for AEO/featured snippets.
    Format: Q: [question]\nA: [answer]\n\n for each FAQ.`,
};

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tool, input } = await req.json();

        if (!tool || !input) {
            return NextResponse.json({ error: 'Tool and input are required' }, { status: 400 });
        }

        // Check AI credits
        const credits = await prisma.aiCredit.findUnique({
            where: { userId: session.user.id },
        });

        if (!credits || credits.used >= credits.total) {
            return NextResponse.json({ error: 'AI credits exhausted. Please upgrade your plan.' }, { status: 402 });
        }

        const promptFn = prompts[tool];
        if (!promptFn) {
            return NextResponse.json({ error: 'Unknown tool type' }, { status: 400 });
        }

        const prompt = promptFn(input);

        // Call OpenAI
        let result: string;
        const apiKey = await getOpenAiApiKey();

        if (apiKey) {
            const openai = new OpenAI({ apiKey });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an expert SEO specialist and content writer. Be concise and follow formatting instructions exactly.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 500,
            });
            result = completion.choices[0]?.message?.content || 'No output generated';
        } else {
            // Demo mode
            result = `[Demo] Generated ${tool} output for: ${input}`;
        }

        // Deduct 1 AI credit
        await prisma.aiCredit.update({
            where: { userId: session.user.id },
            data: { used: { increment: 1 } },
        });

        // Log usage
        await prisma.aiUsage.create({
            data: {
                credit: { connect: { userId: session.user.id } },
                tool: tool.toUpperCase() as any,
                creditsUsed: 1,
                prompt: input,
                result,
            },
        });

        const lines = result.split('\n').filter((l: string) => l.trim());
        return NextResponse.json({ output: lines, creditsRemaining: credits.total - credits.used - 1 });
    } catch (error) {
        console.error('[AI GENERATE ERROR]', error);
        return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }
}

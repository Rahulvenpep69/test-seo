import { NextRequest } from 'next/server';
import { Crawler } from '@/lib/seo/crawler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, limit = 0 } = body || {};

        if (!url) {
            return new Response(JSON.stringify({ error: 'URL is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (event: string, data: any) => {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    const crawler = new Crawler(limit);
                    await crawler.crawl(targetUrl, (progress) => {
                        sendEvent('progress', progress);
                    });

                    sendEvent('complete', { isComplete: true });
                } catch (err: any) {
                    console.error('[CrawlStream] Error during crawl:', err);
                    sendEvent('error', { error: err.message || 'Crawl failed' });
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message || 'Failed to start stream' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

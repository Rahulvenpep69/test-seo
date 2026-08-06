import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SitemapJob } from '@/lib/seo/sitemap-job';

export async function GET(req: Request) {
    try {
        // Authenticate cron request (e.g., via CRON_SECRET)
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        console.log('[Cron] Starting Sitemap Auto-Update...');

        const websites = await prisma.website.findMany({
            where: {
                sitemapAutoUpdate: true,
                status: 'ACTIVE'
            }
        });

        const job = new SitemapJob();
        const results = [];

        for (const website of websites) {
            // Check if it's been 24 hours since last generation
            const lastGenerated = website.sitemapLastGenerated;
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            if (!lastGenerated || lastGenerated < twentyFourHoursAgo) {
                console.log(`[Cron] Updating sitemap for ${website.id}`);
                await job.runForWebsite(website.id);
                results.push({ id: website.id, status: 'UPDATED' });
            } else {
                results.push({ id: website.id, status: 'SKIPPED_RECENT' });
            }
        }

        return NextResponse.json({
            success: true,
            processed: websites.length,
            details: results
        });
    } catch (error: any) {
        console.error('[Cron] Sitemap Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

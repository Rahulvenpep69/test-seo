import { NextResponse } from 'next/server';
import { SitemapJob } from '@/lib/seo/sitemap-job';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { url, websiteId } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const job = new SitemapJob();

        // If websiteId is provided, run the job which handles DB updates and GSC submission
        if (websiteId) {
            const result = await job.runForWebsite(websiteId);
            if (!result) {
                return NextResponse.json({ error: 'Website not found or domain missing' }, { status: 404 });
            }

            const { entries, excluded, xml } = result;
            const website = await prisma.website.findUnique({ where: { id: websiteId } });

            return NextResponse.json({
                success: true,
                sitemapXml: xml || website?.sitemapXml,
                stats: {
                    lastGenerated: website?.sitemapLastGenerated,
                    lastSubmitted: website?.sitemapLastSubmitted,
                    urlCount: website?.sitemapUrlCount,
                    status: website?.sitemapStatus,
                    autoUpdate: website?.sitemapAutoUpdate
                },
                summary: {
                    totalDiscovered: entries.length + excluded.length,
                    totalIncluded: entries.length,
                    totalExcluded: excluded.length
                },
                excluded: excluded.slice(0, 50)
            });
        }

        // Fallback for manual crawl without a website record (e.g., guest tool)
        const { SitemapGenerator } = await import('@/lib/seo/sitemap-generator');
        const generator = new SitemapGenerator(1000, 3);
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const { entries, excluded } = await generator.generate(targetUrl);
        const sitemapXml = SitemapGenerator.toXml(entries);

        return NextResponse.json({
            success: true,
            sitemapXml,
            stats: {
                lastGenerated: new Date(),
                lastSubmitted: null,
                urlCount: entries.length,
                status: 'COMPLETED',
                autoUpdate: false
            },
            excluded: excluded.slice(0, 50)
        });

    } catch (e: any) {
        console.error('Sitemap Generator Error:', e);
        return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
    }
}

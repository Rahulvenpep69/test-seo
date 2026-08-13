import { NextResponse } from 'next/server';

// Polyfill for File if missing (needed for some ESM libs like undici/cheerio)
if (typeof File === 'undefined') {
    (global as any).File = class File extends Blob {
        name: string;
        lastModified: number;
        constructor(parts: any[], name: string, options?: any) {
            super(parts, options);
            this.name = name;
            this.lastModified = options?.lastModified || Date.now();
        }
    };
}

import { checkRobots, checkSitemap, analyzeTechnical, checkCustom404, checkAssetCaching } from '@/lib/seo/technical';
import { extractStructuredData } from '@/lib/seo/structured-data';
import { calculateHeuristicPerformance } from '@/lib/seo/performance';

export async function POST(req: Request) {
    try {
        const { url, limit = 0, websiteId } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Import Crawler dynamically after polyfill
        const { Crawler } = await import('@/lib/seo/crawler');

        // Normalize URL
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = `https://${normalizedUrl}`;
        }

        const maxPagesLimit = (limit === 'all' || limit === 0 || limit === null) ? 0 : Number(limit);
        const crawler = new Crawler(maxPagesLimit);
        const crawledPages = await crawler.crawl(normalizedUrl);

        const results: Record<string, any> = {};
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname;

        const [robots, sitemap] = await Promise.all([
            checkRobots(normalizedUrl),
            checkSitemap(normalizedUrl)
        ]);

        // Perform analysis for each crawled page
        for (const [pageUrl, pageData] of Object.entries(crawledPages)) {
            if (!pageData.html) continue;

            const [technical, structuredData, assets] = await Promise.all([
                analyzeTechnical(pageData.html, pageUrl),
                extractStructuredData(pageData.html),
                checkAssetCaching(pageUrl, pageData.html)
            ]);

            const simulation = calculateHeuristicPerformance(pageData.html, technical);

            const pageInternalLinks = technical.internalLinks.map((link: string) => {
                const linkWithoutSlash = link.replace(/\/$/, '');
                const pageData = crawledPages[link] || crawledPages[linkWithoutSlash] || crawledPages[link + '/'];
                const statusCode = pageData ? pageData.status : 200;
                const isBroken = statusCode === 404 || statusCode >= 500;
                return {
                    url: link,
                    isInternal: true,
                    type: 'Internal',
                    status: String(statusCode),
                    ok: !isBroken,
                    reason: isBroken ? `Broken internal link (Status ${statusCode})` : undefined
                };
            });

            const pageExternalLinks = technical.externalLinks.map((link: string) => ({
                url: link,
                isInternal: false,
                type: 'External',
                status: '200',
                ok: true
            }));

            const pageAllLinks = [...pageInternalLinks, ...pageExternalLinks];
            const pageBrokenLinksCount = pageInternalLinks.filter(l => !l.ok).length;

            const { calculateSeoResults, calculateOverallScore } = await import('@/lib/seo/scoring');
            const perPageResults = calculateSeoResults({
                url: pageUrl,
                html: pageData.html,
                technical,
                performance: {
                    performanceScore: simulation.score,
                    largestContentfulPaint: simulation.lcp,
                    firstContentfulPaint: simulation.fcp,
                    cumulativeLayoutShift: simulation.cls,
                    totalBlockingTime: simulation.tbt,
                },
                assets,
                structuredData,
                robots,
                sitemap,
                // Fallbacks for crawl - Avoid hardcoding 'pass'
                indexStatus: { indexed: false }, // Will show as warning/critical if not checked
                brokenLinksCount: pageBrokenLinksCount,
                custom404: { isCustom: false }  // Will show as warning
            });

            const { score, criticalCount, warningCount, passCount } = calculateOverallScore(perPageResults);

            results[pageUrl] = {
                results: perPageResults,
                score,
                criticalCount,
                warningCount,
                passCount,
                technical: {
                    ...technical,
                    pageSize: pageData.html.length,
                },
                structuredData,
                stats: {
                    totalLinks: technical.linkCount,
                    scannedLinks: pageAllLinks.length,
                    brokenLinks: pageBrokenLinksCount,
                    brokenDetails: pageInternalLinks.filter(l => !l.ok).map(l => ({
                        url: l.url,
                        status: Number(l.status),
                        reason: l.reason
                    })),
                    allLinks: pageAllLinks,
                    performance: {
                        performanceScore: simulation.score,
                        largestContentfulPaint: simulation.lcp,
                        firstContentfulPaint: simulation.fcp,
                        cumulativeLayoutShift: simulation.cls,
                        totalBlockingTime: simulation.tbt,
                        speedIndex: simulation.speedIndex,
                        isSimulated: true
                    }
                }
            };
        }

        if (Object.keys(results).length === 0) {
            return NextResponse.json({
                error: `Failed to fetch or crawl ${normalizedUrl}. Make sure the site is online, publicly accessible, and not blocking automated requests.`
            }, { status: 400 });
        }

        // Persist to DB if websiteId is provided and we have crawl results
        if (websiteId && Object.keys(results).length > 0) {
            try {
                const { prisma } = await import('@/lib/prisma');

                let totalScore = 0;
                let totalSpeedScore = 0;
                let totalIssues = 0;

                for (const pageRes of Object.values(results)) {
                    totalScore += pageRes.score || 0;
                    totalSpeedScore += pageRes.stats?.performance?.performanceScore || 0;
                    totalIssues += (pageRes.criticalCount || 0) + (pageRes.warningCount || 0);
                }

                const avgScore = Math.round(totalScore / Object.keys(results).length);
                const avgSpeedScore = Math.round(totalSpeedScore / Object.keys(results).length);

                await prisma.seoReport.create({
                    data: {
                        websiteId,
                        overallScore: avgScore,
                        technicalScore: avgScore,
                        contentScore: avgScore,
                        speedScore: avgSpeedScore,
                        crawledPages: Object.keys(results).length,
                        issuesFound: totalIssues,
                        fullResults: JSON.stringify({
                            results,
                            site_stats: {
                                robots,
                                sitemap
                            }
                        }),
                    }
                });
                console.log(`[Crawler] Saved site-wide crawl report to DB for website ${websiteId}`);
            } catch (dbError) {
                console.error('[DB PERSIST ERROR]', dbError);
            }
        }

        return NextResponse.json({
            url: normalizedUrl,
            domain,
            timestamp: new Date().toISOString(),
            pages_count: Object.keys(results).length,
            limit,
            results,
            raw_data: crawledPages, // DEBUG
            site_stats: {
                robots,
                sitemap
            },
            status: 'success'
        });
    } catch (error: any) {
        console.error('Crawl error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

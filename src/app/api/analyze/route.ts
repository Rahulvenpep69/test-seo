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
import { getSearchConsoleData, checkIndexStatus, calculateAuthorityScoring } from '@/lib/seo/google-api';
import { extractStructuredData, validateStructuredData } from '@/lib/seo/structured-data';
import { checkBrokenLinks } from '@/lib/seo/links';
import { getPerformanceMetrics, calculateHeuristicPerformance } from '@/lib/seo/performance';
import { robustFetch } from '@/lib/seo/fetch';

export async function POST(req: Request) {
    try {
        const { url, websiteId } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Import prisma dynamically
        const { prisma } = await import('@/lib/prisma');
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const startTime = Date.now();

        // 1. Fetch main document
        const { html, status: responseStatus, url: finalUrl, error: fetchError } = await robustFetch(targetUrl);

        if (fetchError || responseStatus >= 400 || !html) {
            console.error('Fetch error:', fetchError || `Status ${responseStatus}`);
            return NextResponse.json({
                error: fetchError || `Failed to fetch the website (Status ${responseStatus}). Make sure the URL is correct and accessible.`
            }, { status: 400 });
        }

        // 2. Run All checks in parallel for "real time accuracy" with fail-safe fallbacks
        const [
            robots,
            sitemap,
            technical,
            indexStatus,
            structuredData,
            brokenLinks,
            performance,
            custom404,
            assets
        ] = await Promise.all([
            checkRobots(targetUrl).catch(() => ({ exists: false, isAllowed: true })),
            checkSitemap(targetUrl).catch(() => ({ exists: false })),
            analyzeTechnical(html, targetUrl).catch(() => ({})),
            checkIndexStatus(targetUrl).catch(() => ({ isIndexed: false, status: 'Check Unavailable' })),
            Promise.resolve(extractStructuredData(html)).catch(() => []),
            checkBrokenLinks(targetUrl, html).catch(() => ({ totalScanned: 0, brokenCount: 0, links: [] })),
            getPerformanceMetrics(targetUrl).catch(() => calculateHeuristicPerformance(html)),
            checkCustom404(targetUrl).catch(() => false),
            checkAssetCaching(targetUrl, html).catch(() => ({ score: 70 }))
        ]);

        // Extract security headers from a HEAD request
        let securityHeaders: Record<string, any> = {};
        try {
            const headRes = await fetch(targetUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            securityHeaders = {
                contentEncoding: headRes.headers.get('content-encoding') || '',
                cacheControl: headRes.headers.get('cache-control') || '',
                xCacheStatus: headRes.headers.get('x-cache') || headRes.headers.get('x-cache-status') || '',
                xServedBy: headRes.headers.get('x-served-by') || headRes.headers.get('via') || '',
                cfRay: headRes.headers.get('cf-ray') || '',
                xAmzCfPop: headRes.headers.get('x-amz-cf-pop') || '',
                hsts: headRes.headers.get('strict-transport-security') || '',
                server: headRes.headers.get('server') || '',
                http2: (headRes as any).httpVersion === '2.0' || false,
            };
        } catch (_) { /* ignore – security headers are best-effort */ }

        const authority = await calculateAuthorityScoring(targetUrl, indexStatus);

        // 3. Compile Results matching the 32 exhausting checks in the UI
        let perfData = performance as any;
        if (perfData.isSimulated || !perfData.performanceScore) {
            const simulation = calculateHeuristicPerformance(html, technical);
            perfData = {
                ...perfData,
                performanceScore: simulation.score,
                largestContentfulPaint: simulation.lcp,
                firstContentfulPaint: simulation.fcp,
                cumulativeLayoutShift: simulation.cls,
                totalBlockingTime: simulation.tbt,
                speedIndex: simulation.speedIndex,
                isSimulated: true
            };
        }
        const perfScore = perfData.performanceScore;

        const { calculateSeoResults, calculateOverallScore } = await import('@/lib/seo/scoring');
        const results = calculateSeoResults({
            url: targetUrl,
            html,
            technical,
            performance: perfData,
            robots,
            sitemap,
            indexStatus,
            brokenLinksCount: brokenLinks.brokenLinks,
            structuredData,
            assets,
            custom404,
            securityHeaders
        });

        const { score: overallScore, passCount, criticalCount, warningCount } = calculateOverallScore(results);

        const stats = {
            loadTimeMs: Date.now() - startTime,
            totalLinks: brokenLinks.totalLinks,
            scannedLinks: brokenLinks.scannedLinks,
            brokenLinks: brokenLinks.brokenLinks,
            brokenDetails: brokenLinks.brokenDetails,
            allLinks: brokenLinks.allLinks,
            performance: perfData,
            authority: authority,
            structuredDataCount: structuredData.length,
            securityHeaders,
            robots: robots,
            sitemap: sitemap,
            custom404: custom404
        };

        // 4. Persist to DB if websiteId is provided
        if (websiteId) {
            try {
                await prisma.seoReport.create({
                    data: {
                        websiteId,
                        overallScore,
                        technicalScore: overallScore,
                        contentScore: overallScore,
                        speedScore: perfScore,
                        crawledPages: 1,
                        issuesFound: criticalCount + warningCount,
                        fullResults: JSON.stringify(results),
                    }
                });
            } catch (dbError) {
                console.error('[DB PERSIST ERROR]', dbError);
            }
        }

        return NextResponse.json({
            success: true,
            results,
            overallScore,
            criticalCount,
            warningCount,
            passCount,
            technical,
            structuredData,
            stats
        });
    } catch (error: any) {
        console.error('Analyzer error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

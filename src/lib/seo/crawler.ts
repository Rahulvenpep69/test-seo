import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { robustFetch } from './fetch';
import { analyzeTechnical } from './technical';
import { extractStructuredData } from './structured-data';
import { calculateHeuristicPerformance } from './performance';

export interface CrawlResult {
    url: string;
    html: string;
    status: number;
    score?: number;
    overallScore?: number;
    criticalCount?: number;
    warningCount?: number;
    passCount?: number;
    results?: Record<string, 'pass' | 'warning' | 'critical'>;
    structuredData?: any[];
    technical?: any;
    performance?: any;
}

export async function computePageTechnicalAudit(url: string, html: string, status: number): Promise<CrawlResult> {
    if (!html || status >= 400 || status === 0) {
        return {
            url,
            status: status || 0,
            html: html || '',
            score: 0,
            overallScore: 0,
            criticalCount: 3,
            warningCount: 0,
            passCount: 0,
            results: {
                'meta-title': 'critical',
                'meta-desc': 'critical',
                'ssl-security': 'critical'
            },
            structuredData: [],
            technical: { title: '', metaDescription: '', h1: [], canonical: '' },
            performance: { score: 0, fcp: '0s', lcp: '0s', tbt: '0ms', cls: '0' }
        };
    }

    try {
        const [technical, structuredData] = await Promise.all([
            analyzeTechnical(html, url).catch(() => ({} as any)),
            extractStructuredData(html).catch(() => [])
        ]);
        const performance = calculateHeuristicPerformance(html, technical);

        const results: Record<string, 'pass' | 'warning' | 'critical'> = {
            'meta-title': technical.title && technical.title.length >= 30 && technical.title.length <= 65 ? 'pass' : technical.title ? 'warning' : 'critical',
            'meta-desc': technical.metaDescription && technical.metaDescription.length >= 120 && technical.metaDescription.length <= 160 ? 'pass' : technical.metaDescription ? 'warning' : 'critical',
            'h1-test': technical.h1 && technical.h1.length === 1 ? 'pass' : technical.h1 && technical.h1.length > 1 ? 'warning' : 'critical',
            'canonical': technical.canonical ? 'pass' : 'critical',
            'schema': structuredData && structuredData.length > 0 ? 'pass' : 'warning',
            'viewport': technical.viewport ? 'pass' : 'critical',
            'og-tags': technical.openGraph && Object.keys(technical.openGraph).length > 0 ? 'pass' : 'warning',
            'images-alt': technical.imagesWithoutAlt === 0 ? 'pass' : technical.imagesWithoutAlt < 5 ? 'warning' : 'critical',
            'ssl-security': url.startsWith('https://') ? 'pass' : 'critical',
            'language': technical.language ? 'pass' : 'warning',
        };

        const passes = Object.values(results).filter(v => v === 'pass').length;
        const warnings = Object.values(results).filter(v => v === 'warning').length;
        const criticals = Object.values(results).filter(v => v === 'critical').length;
        const overallScore = Math.round((passes / Object.keys(results).length) * 100);

        return {
            url,
            status,
            html,
            score: overallScore,
            overallScore,
            criticalCount: criticals,
            warningCount: warnings,
            passCount: passes,
            results,
            structuredData,
            technical,
            performance
        };
    } catch (e) {
        return { url, status, html, score: 70, overallScore: 70, results: {}, structuredData: [], technical: {}, performance: { score: 70 } };
    }
}

export interface CrawlProgressData {
    totalDiscovered: number;
    crawled: number;
    failed: number;
    yetToCrawl: number;
    progressPercent: number;
    currentUrl: string;
    latestResult?: CrawlResult;
    discoveredUrls?: string[];
    isComplete?: boolean;
}

function isValidCrawlableUrl(urlStr: string): boolean {
    if (!urlStr) return false;
    const lower = urlStr.toLowerCase();

    if (lower.startsWith('javascript:') || lower.startsWith('mailto:') || lower.startsWith('tel:') || lower.startsWith('data:') || lower.startsWith('#')) {
        return false;
    }

    if (lower.includes('/cdn-cgi/') || lower.includes('/email-protection')) {
        return false;
    }

    const ignoredExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp',
        '.css', '.js', '.pdf', '.zip', '.tar', '.gz', '.mp3', '.mp4', '.avi',
        '.woff', '.woff2', '.ttf', '.eot', '.xml', '.json'
    ];

    try {
        const parsed = new URL(urlStr);
        const pathname = parsed.pathname.toLowerCase();
        for (const ext of ignoredExtensions) {
            if (pathname.endsWith(ext)) return false;
        }
    } catch {
        return false;
    }

    return true;
}

export class Crawler {
    private visited: Set<string> = new Set();
    private discovered: Set<string> = new Set();
    private maxPages: number;
    private maxDepth: number;
    private domain: string = '';
    private robots: any = null;
    private useBrowser: boolean = false;

    constructor(maxPages: number = 0, maxDepth: number = 10) {
        this.maxPages = maxPages;
        this.maxDepth = maxDepth;
    }

    private async fetchRobots(baseUrl: string) {
        try {
            const robotsUrl = new URL('/robots.txt', baseUrl).toString();
            const { html, status } = await robustFetch(robotsUrl);
            if (status === 200 && html) {
                this.robots = robotsParser(robotsUrl, html);
            }
        } catch (e) {
            console.error('Failed to fetch robots.txt', e);
        }
    }

    private isAllowed(url: string): boolean {
        if (!this.robots) return true;
        return this.robots.isAllowed(url, 'AntigravityCrawler');
    }

    private normalizeUrlForVisited(url: string): string {
        try {
            const u = new URL(url.startsWith('http') ? url : `https://${url}`);
            const host = u.hostname.replace(/^www\./, '').toLowerCase();
            const path = u.pathname.replace(/\/+$/, '') || '/';
            return `https://${host}${u.port ? ':' + u.port : ''}${path}`;
        } catch (e) {
            return url;
        }
    }

    async crawl(
        startUrl: string,
        onProgress?: (progress: CrawlProgressData) => void
    ): Promise<Record<string, CrawlResult>> {
        const results: Record<string, CrawlResult> = {};

        let normalizedUrl = startUrl.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = `https://${normalizedUrl}`;
        }

        let initialFetchHtml = '';
        let initialFetchStatus = 200;

        try {
            let fetchResult = await robustFetch(normalizedUrl, false);

            if (fetchResult.html && fetchResult.status === 200) {
                const $ = cheerio.load(fetchResult.html);
                let linkCount = 0;
                $('a[href]').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href) linkCount++;
                });

                if (linkCount < 3) {
                    console.log(`[Crawler] Few internal links (${linkCount}). Attempting browser fetch for SPA rendering.`);
                    const browserResult = await robustFetch(normalizedUrl, true);
                    let browserLinkCount = 0;
                    const $b = cheerio.load(browserResult.html);
                    $b('a[href]').each((_, el) => {
                        if ($b(el).attr('href')) browserLinkCount++;
                    });

                    if (browserLinkCount > linkCount) {
                        fetchResult = browserResult;
                        this.useBrowser = true;
                    }
                }
            }

            initialFetchHtml = fetchResult.html;
            initialFetchStatus = fetchResult.status;

            const finalUrl = new URL(fetchResult.url || normalizedUrl);
            this.domain = finalUrl.hostname.replace(/^www\./, '');
            normalizedUrl = finalUrl.toString();

            console.log(`Base domain established: ${this.domain} from ${normalizedUrl}`);
        } catch (e: any) {
            console.error('Initial connection failed:', normalizedUrl, e.message);
            return {};
        }

        const initialNorm = this.normalizeUrlForVisited(normalizedUrl);
        this.discovered.add(initialNorm);

        const queue: { url: string; depth: number }[] = [{ url: normalizedUrl, depth: 0 }];
        await this.fetchRobots(normalizedUrl);

        let crawledCount = 0;
        let failedCount = 0;

        const emitProgress = (currentUrl: string, latestResult?: CrawlResult, isComplete: boolean = false) => {
            if (!onProgress) return;
            const totalDiscovered = Math.max(this.discovered.size, queue.length + crawledCount + failedCount);
            const processedCount = crawledCount + failedCount;
            const yetToCrawl = Math.max(0, totalDiscovered - processedCount);
            const progressPercent = totalDiscovered > 0 ? Math.min(100, Math.round((processedCount / totalDiscovered) * 100)) : 0;

            onProgress({
                totalDiscovered,
                crawled: crawledCount,
                failed: failedCount,
                yetToCrawl,
                progressPercent,
                currentUrl,
                latestResult,
                discoveredUrls: Array.from(this.discovered),
                isComplete
            });
        };

        try {
            const sitemapUrl = `${normalizedUrl.replace(/\/$/, '')}/sitemap.xml`;
            const sitemapRes = await robustFetch(sitemapUrl);
            if (sitemapRes.status === 200 && sitemapRes.html) {
                const $xml = cheerio.load(sitemapRes.html, { xmlMode: true });
                $xml('loc').each((_, el) => {
                    const loc = $xml(el).text().trim();
                    if (loc && loc.startsWith('http')) {
                        try {
                            const u = new URL(loc);
                            if (u.hostname.replace(/^www\./, '') === this.domain) {
                                const norm = this.normalizeUrlForVisited(loc);
                                if (!this.discovered.has(norm)) {
                                    this.discovered.add(norm);
                                    queue.push({ url: loc, depth: 1 });
                                }
                            }
                        } catch {}
                    }
                });
                console.log(`[Crawler] Pre-seeded ${queue.length} URLs from sitemap.xml`);
                emitProgress(normalizedUrl);
            }
        } catch (e) {
            console.log('[Crawler] Sitemap pre-seeding skipped');
        }

        const startTime = Date.now();
        const CRAWL_TIMEOUT_MS = 55000;
        const BATCH_SIZE = 10;

        while (queue.length > 0 && (this.maxPages <= 0 || this.visited.size < this.maxPages)) {
            if (Date.now() - startTime > CRAWL_TIMEOUT_MS) {
                console.log(`[Crawler] Time ceiling reached for ${normalizedUrl}. Returning ${Object.keys(results).length} pages.`);
                break;
            }

            const batch: { url: string; depth: number }[] = [];
            while (queue.length > 0 && batch.length < BATCH_SIZE) {
                const item = queue.shift()!;
                const norm = this.normalizeUrlForVisited(item.url);
                if (!this.visited.has(norm) && (this.maxDepth <= 0 || item.depth <= this.maxDepth) && this.isAllowed(item.url)) {
                    this.visited.add(norm);
                    batch.push(item);
                }
            }

            if (batch.length === 0) continue;

            await Promise.all(batch.map(async ({ url, depth }) => {
                try {
                    let html = '';
                    let status = 200;
                    let effectiveUrl = url;

                    if (url === normalizedUrl) {
                        html = initialFetchHtml;
                        status = initialFetchStatus;
                    } else {
                        const fetchResult = await robustFetch(url, this.useBrowser);
                        html = fetchResult.html;
                        status = fetchResult.status;
                        effectiveUrl = fetchResult.url || url;

                        if (fetchResult.error || (status >= 400 || status === 0) && (!html || html.length < 100)) {
                            const failedItem = await computePageTechnicalAudit(url, '', status || 0);
                            results[url] = failedItem;
                            failedCount++;
                            emitProgress(url, failedItem);
                            return;
                        }
                    }

                    crawledCount++;
                    const resultItem = await computePageTechnicalAudit(effectiveUrl, html, status);
                    results[url] = resultItem;

                    if (html && (this.maxDepth <= 0 || depth < this.maxDepth)) {
                        const $ = cheerio.load(html);
                        $('a[href]').each((_, el) => {
                            const href = $(el).attr('href');
                            if (!href) return;
                            try {
                                const absoluteUrl = new URL(href, effectiveUrl);
                                const cleanUrl = `${absoluteUrl.protocol}//${absoluteUrl.host}${absoluteUrl.pathname}`;
                                if (!isValidCrawlableUrl(cleanUrl)) return;

                                const targetHost = absoluteUrl.hostname.replace(/^www\./, '');
                                if (targetHost === this.domain) {
                                    const normalizedTarget = this.normalizeUrlForVisited(cleanUrl);
                                    if (!this.discovered.has(normalizedTarget)) {
                                        this.discovered.add(normalizedTarget);
                                        queue.push({ url: cleanUrl, depth: depth + 1 });
                                    }
                                }
                            } catch (e) {}
                        });
                    }

                    emitProgress(url, resultItem);
                } catch (err: any) {
                    console.error(`[Crawler] Error crawling ${url}:`, err.message);
                    failedCount++;
                    emitProgress(url);
                }
            }));
        }

        emitProgress(normalizedUrl, undefined, true);
        console.log(`[Crawler] Finished. Discovered: ${this.discovered.size}, Crawled: ${crawledCount}, Failed: ${failedCount}`);
        return results || {};
    }
}

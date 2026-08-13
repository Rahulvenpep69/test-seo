import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { robustFetch } from './fetch';

export interface CrawlResult {
    url: string;
    html: string;
    status: number;
}

export interface CrawlProgressData {
    totalDiscovered: number;
    crawled: number;
    failed: number;
    yetToCrawl: number;
    progressPercent: number;
    currentUrl: string;
    latestResult?: CrawlResult;
    isComplete?: boolean;
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
            const u = new URL(url);
            const host = u.hostname.replace(/^www\./, '');
            const path = u.pathname.replace(/\/+$/, '') || '/';
            return `${u.protocol}//${host}${u.port ? ':' + u.port : ''}${path}`;
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
                            results[url] = { url, html: '', status: status || 0 };
                            failedCount++;
                            emitProgress(url, results[url]);
                            return;
                        }
                    }

                    crawledCount++;
                    const resultItem = { url: effectiveUrl, html, status };
                    results[url] = resultItem;

                    if (html && (this.maxDepth <= 0 || depth < this.maxDepth)) {
                        const $ = cheerio.load(html);
                        $('a[href]').each((_, el) => {
                            const href = $(el).attr('href');
                            if (!href) return;
                            try {
                                const absoluteUrl = new URL(href, effectiveUrl);
                                const targetHost = absoluteUrl.hostname.replace(/^www\./, '');
                                if (targetHost === this.domain) {
                                    const cleanUrl = `${absoluteUrl.protocol}//${absoluteUrl.host}${absoluteUrl.pathname}`;
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

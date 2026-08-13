import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { robustFetch } from './fetch';

export interface CrawlResult {
    url: string;
    html: string;
    status: number;
}

export class Crawler {
    private visited: Set<string> = new Set();
    private queue: string[] = [];
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

    async crawl(startUrl: string): Promise<Record<string, CrawlResult>> {
        const results: Record<string, CrawlResult> = {};

        let normalizedUrl = startUrl.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = `https://${normalizedUrl}`;
        }

        // Establish base domain by following initial redirect
        let initialFetchHtml = '';
        let initialFetchStatus = 200;
        try {
            console.log(`[Crawler] Initial fetch for ${normalizedUrl}`);
            let fetchResult = await robustFetch(normalizedUrl);
            console.log(`[Crawler] Initial fetch status: ${fetchResult.status}, Html length: ${fetchResult.html?.length}`);

            if (fetchResult.error || (fetchResult.status >= 400 || fetchResult.status === 0) && (!fetchResult.html || fetchResult.html.length < 100 || fetchResult.html.includes('Just a moment') || fetchResult.html.includes('cf-challenge'))) {
                throw new Error(fetchResult.error || `Initial fetch failed with status ${fetchResult.status}`);
            }

            // Check if it's an SPA (Vite/React/etc.) shell with very few links
            const $ = cheerio.load(fetchResult.html || '');
            let linkCount = 0;
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    linkCount++;
                }
            });

            if (linkCount <= 1) {
                console.log(`[Crawler] Found very few links (${linkCount}) in raw HTML. Retrying with Playwright browser to check for SPA...`);
                const browserResult = await robustFetch(normalizedUrl, true);
                const $browser = cheerio.load(browserResult.html || '');
                let browserLinkCount = 0;
                $browser('a[href]').each((_, el) => {
                    const href = $browser(el).attr('href');
                    if (href) {
                        browserLinkCount++;
                    }
                });

                if (browserLinkCount > linkCount) {
                    console.log(`[Crawler] SPA detected! Switching to browser mode. Link count increased from ${linkCount} to ${browserLinkCount}`);
                    fetchResult = browserResult;
                    this.useBrowser = true;
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

        const initialNormalized = this.normalizeUrlForVisited(normalizedUrl);
        const queue: { url: string; depth: number }[] = [{ url: normalizedUrl, depth: 0 }];
        await this.fetchRobots(normalizedUrl);

        // Pre-seed from sitemap.xml to instantly queue all site pages
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
                                if (!this.visited.has(norm)) {
                                    queue.push({ url: loc, depth: 1 });
                                }
                            }
                        } catch {}
                    }
                });
                console.log(`[Crawler] Pre-seeded ${queue.length} URLs from sitemap.xml`);
            }
        } catch (e) {
            console.log('[Crawler] Sitemap pre-seeding skipped');
        }

        const startTime = Date.now();
        const CRAWL_TIMEOUT_MS = 55000; // 55s safety limit for full site coverage
        const BATCH_SIZE = 10; // 10 parallel worker fetches for 10x crawling speed

        while (queue.length > 0 && (this.maxPages <= 0 || this.visited.size < this.maxPages)) {
            if (Date.now() - startTime > CRAWL_TIMEOUT_MS) {
                console.log(`[Crawler] Time ceiling reached for ${normalizedUrl}. Returning ${Object.keys(results).length} pages.`);
                break;
            }

            // Extract up to BATCH_SIZE unvisited items from queue
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

            // Fetch batch concurrently in parallel
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
                            return;
                        }
                    }

                    results[url] = { url: effectiveUrl, html, status };

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
                                    if (!this.visited.has(normalizedTarget)) {
                                        queue.push({ url: cleanUrl, depth: depth + 1 });
                                    }
                                }
                            } catch (e) {}
                        });
                    }
                } catch (err: any) {
                    console.error(`[Crawler] Error crawling ${url}:`, err.message);
                }
            }));
        }

        console.log(`[Crawler] Finished. Crawled ${Object.keys(results).length} pages.`);
        return results || {};
    }
}

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

        while (queue.length > 0 && (this.maxPages <= 0 || this.visited.size < this.maxPages)) {
            const { url, depth } = queue.shift()!;
            const normalizedForVisited = this.normalizeUrlForVisited(url);

            if (this.visited.has(normalizedForVisited)) continue;
            if (this.maxDepth > 0 && depth > this.maxDepth) continue;

            if (!this.isAllowed(url)) {
                console.log(`Blocked by robots.txt: ${url}`);
                continue;
            }

            try {
                this.visited.add(normalizedForVisited);
                console.log(`[Crawler] Processing queue item: ${url} (Normalized: ${normalizedForVisited})`);
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

                    if (fetchResult.error || (status >= 400 || status === 0) && (!html || html.length < 100 || html.includes('Just a moment') || html.includes('cf-challenge'))) {
                        console.error(`[Crawler] Block or failure detected for ${url}: ${fetchResult.error || status}`);
                        results[url] = { url, html: '', status: status || 0 };
                        continue;
                    }

                    // Dynamic SPA client-side routing detection
                    if (!this.useBrowser && html && initialFetchHtml && html.length === initialFetchHtml.length) {
                        console.log(`[Crawler] Detected identical HTML length (${html.length}) for subpage ${url}. Switching to browser mode to render dynamic content.`);
                        this.useBrowser = true;
                        const browserResult = await robustFetch(url, true);
                        html = browserResult.html;
                        status = browserResult.status;
                        effectiveUrl = browserResult.url || url;
                    }
                }

                results[url] = { url: effectiveUrl, html, status };

                const $ = cheerio.load(html);

                if (this.maxDepth <= 0 || depth < this.maxDepth) {
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
                        } catch (e) {
                            // Invalid URL
                        }
                    });
                }
            } catch (error) {
                console.error(`Error crawling ${url}:`, error);
                results[url] = { url, html: '', status: 500 };
            }
        }

        console.log(`[Crawler] Finished. Crawled ${Object.keys(results).length} pages.`);
        return results || {};
    }
}

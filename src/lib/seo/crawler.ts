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

    constructor(maxPages: number = 1000, maxDepth: number = 3) {
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
        try {
            console.log(`[Crawler] Initial fetch for ${normalizedUrl}`);
            const { url: finalUrlStr, status, html, error: fetchError } = await robustFetch(normalizedUrl);
            console.log(`[Crawler] Initial fetch status: ${status}, Html length: ${html?.length}`);

            if (fetchError || (status >= 400 || status === 0) && (!html || html.length < 100 || html.includes('Just a moment') || html.includes('cf-challenge'))) {
                throw new Error(fetchError || `Initial fetch failed with status ${status}`);
            }

            const finalUrl = new URL(finalUrlStr || normalizedUrl);
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

        while (queue.length > 0 && this.visited.size < this.maxPages) {
            const { url, depth } = queue.shift()!;
            const normalizedForVisited = this.normalizeUrlForVisited(url);

            if (this.visited.has(normalizedForVisited)) continue;
            if (depth > this.maxDepth) continue;

            if (!this.isAllowed(url)) {
                console.log(`Blocked by robots.txt: ${url}`);
                continue;
            }

            try {
                this.visited.add(normalizedForVisited);
                console.log(`[Crawler] Processing queue item: ${url} (Normalized: ${normalizedForVisited})`);

                const { html, status, url: effectiveUrl, error: fetchError } = await robustFetch(url);
                console.log(`[Crawler] Queue item fetch result: ${url} -> status ${status}, html length ${html?.length}`);

                if (fetchError || (status >= 400 || status === 0) && (!html || html.length < 100 || html.includes('Just a moment') || html.includes('cf-challenge'))) {
                    console.error(`[Crawler] Block or failure detected for ${url}: ${fetchError || status}`);
                    results[url] = { url, html: '', status: status || 0 };
                    continue;
                }

                results[url] = { url: effectiveUrl, html, status };

                const $ = cheerio.load(html);

                if (depth < this.maxDepth) {
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

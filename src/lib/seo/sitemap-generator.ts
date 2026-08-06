import * as cheerio from 'cheerio';
import { Crawler, CrawlResult } from './crawler';

export interface SitemapEntry {
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: string;
}

export interface ExcludedEntry {
    url: string;
    reason: string;
}

export class SitemapGenerator {
    private crawler: Crawler;

    constructor(maxPages: number = 1000, maxDepth: number = 3) {
        this.crawler = new Crawler(maxPages, maxDepth);
    }

    private normalizeUrl(url: string): string {
        try {
            const u = new URL(url);
            // Remove trailing slash except for root
            let pathname = u.pathname;
            if (pathname !== '/' && pathname.endsWith('/')) {
                pathname = pathname.slice(0, -1);
            }
            // Sort query params or remove them if needed
            // User requested: Remove query parameters (?utm, ?filter, etc.)
            // But they also said: URLs with ? (parameters) should be EXCLUDED.
            // I will clean them first for normalization, then filter them out in the filtering step.
            return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${pathname}`;
        } catch (e) {
            return url;
        }
    }

    private getLastMod(html: string): string {
        if (!html) return new Date().toISOString().split('T')[0];
        try {
            const $ = cheerio.load(html);
            const date = $('meta[property="article:modified_time"]').attr('content') ||
                $('meta[name="revised"]').attr('content') ||
                $('time[datetime]').first().attr('datetime') ||
                $('meta[property="og:updated_time"]').attr('content');

            if (date) {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString().split('T')[0];
                }
            }
        } catch (e) {
            console.error('Error parsing lastmod:', e);
        }
        return new Date().toISOString().split('T')[0];
    }

    private getPriority(url: string): string {
        const parsed = new URL(url);
        const path = parsed.pathname;
        const low = path.toLowerCase();

        if (path === '/' || path === '') return '1.0';

        // Category Pages
        if (low.includes('/tours/') || low.includes('/blog/') || low.includes('/products/')) return '0.8';

        // Important Pages
        if (low.includes('/about') || low.includes('/contact') || low.includes('/reserve-tour')) return '0.7';

        // Low Value Pages
        if (low.includes('testimonial') || low.includes('gallery')) return '0.5';

        // Detail Pages (using patterns from category but specifically for deeper paths if needed, 
        // or just general fallback for tours/blog/products not matching category folders)
        if (low.includes('tour') || low.includes('blog') || low.includes('product')) return '0.6';

        return '0.6';
    }

    private getChangeFreq(url: string): string {
        const parsed = new URL(url);
        const path = parsed.pathname;
        const low = path.toLowerCase();

        if (path === '/' || path === '') return 'daily';

        // Category and Detail pages
        if (low.includes('tour') || low.includes('blog') || low.includes('product')) return 'weekly';

        // Others (Static/Low-value)
        return 'monthly';
    }

    private validateAndBalance(entries: SitemapEntry[]): SitemapEntry[] {
        if (entries.length === 0) return entries;

        // 1. Ensure only 1 page has 1.0 (the homepage)
        let homeFound = false;
        entries.forEach(entry => {
            if (entry.priority === '1.0') {
                if (homeFound) entry.priority = '0.8';
                else homeFound = true;
            }
        });

        // 2. Auto-balance 0.8 priorities (Max 20-30%)
        const highPriorityCount = entries.filter(e => e.priority === '0.8').length;
        const maxHighPriority = Math.ceil(entries.length * 0.3);

        if (highPriorityCount > maxHighPriority) {
            let reduced = 0;
            const toReduce = highPriorityCount - maxHighPriority;
            for (let i = entries.length - 1; i >= 0 && reduced < toReduce; i--) {
                if (entries[i].priority === '0.8') {
                    entries[i].priority = '0.7';
                    reduced++;
                }
            }
        }

        // 3. Fix low-value pages with high priority (Safety Check)
        entries.forEach(entry => {
            const low = entry.loc.toLowerCase();
            if ((low.includes('testimonial') || low.includes('gallery')) && parseFloat(entry.priority) > 0.5) {
                entry.priority = '0.5';
            }
        });

        // 4. Check if all priorities are same
        const allSame = entries.every(e => e.priority === entries[0].priority);
        if (allSame && entries.length > 1) {
            // Force hierarchy if all are same
            entries.forEach(e => {
                const u = new URL(e.loc);
                if (u.pathname === '/') e.priority = '1.0';
                else e.priority = '0.6';
            });
        }

        return entries;
    }

    async generate(startUrl: string): Promise<{
        entries: SitemapEntry[];
        excluded: ExcludedEntry[];
    }> {
        const crawlResults = await this.crawler.crawl(startUrl);
        const entries: SitemapEntry[] = [];
        const excluded: ExcludedEntry[] = [];
        const seenLocs = new Set<string>();

        const pages = Object.values(crawlResults);

        for (const page of pages) {
            const rawUrl = page.url;
            const normalizedLoc = this.normalizeUrl(rawUrl);

            // STEP 3: FILTER URLs
            const lowUrl = rawUrl.toLowerCase();
            const lowLoc = normalizedLoc.toLowerCase();

            // Logical Exclusions from User
            if (rawUrl.includes('_files')) {
                excluded.push({ url: rawUrl, reason: 'System Folder (_files)' });
                continue;
            }
            if (lowUrl.endsWith('.pdf')) {
                excluded.push({ url: rawUrl, reason: 'File Type (PDF)' });
                continue;
            }
            if (lowUrl.includes('general')) {
                excluded.push({ url: rawUrl, reason: 'Low Value (General)' });
                continue;
            }

            // Other Exclusions from initial prompt
            const isSystem = lowUrl.includes('/admin/') || lowUrl.includes('/login') || lowUrl.includes('/dashboard') ||
                lowUrl.includes('/cart') || lowUrl.includes('/checkout') || lowUrl.includes('/account') ||
                lowUrl.includes('/search') || lowUrl.includes('/wp-admin') || lowUrl.includes('/wp-includes');

            const hasParams = rawUrl.includes('?');

            const isStaticFile = lowUrl.match(/\.(jpg|jpeg|png|webp|gif|zip|exe|pdf)$/i);

            if (isSystem) {
                excluded.push({ url: rawUrl, reason: 'System/Private Page' });
            } else if (hasParams) {
                excluded.push({ url: rawUrl, reason: 'Query Parameters' });
            } else if (isStaticFile && !lowUrl.endsWith('.pdf')) { // PDF already handled
                excluded.push({ url: rawUrl, reason: 'Media/File' });
            } else if (seenLocs.has(normalizedLoc)) {
                excluded.push({ url: rawUrl, reason: 'Duplicate' });
            } else {
                seenLocs.add(normalizedLoc);
                entries.push({
                    loc: normalizedLoc,
                    lastmod: this.getLastMod(page.html),
                    changefreq: this.getChangeFreq(normalizedLoc),
                    priority: this.getPriority(normalizedLoc)
                });
            }
        }

        // Apply Validation and Balancing Engine
        const balancedEntries = this.validateAndBalance(entries);

        return { entries: balancedEntries, excluded };
    }

    static toXml(entries: SitemapEntry[]): string {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        entries.forEach(entry => {
            xml += `  <url>\n`;
            xml += `    <loc>${entry.loc}</loc>\n`;
            xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
            xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
            xml += `    <priority>${entry.priority}</priority>\n`;
            xml += `  </url>\n`;
        });

        xml += `</urlset>`;
        return xml;
    }
}

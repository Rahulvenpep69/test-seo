import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { robustFetch } from '@/lib/seo/fetch';
import { Crawler } from '@/lib/seo/crawler';

export async function POST(req: Request) {
    try {
        const { url, options } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const domainUrl = new URL(targetUrl);
        const baseUrl = `${domainUrl.protocol}//${domainUrl.host}`;

        // 1. Deep Crawling (AI Smart)
        const crawler = new Crawler(20); // Limit to 20 pages for speed
        const crawlResults = await crawler.crawl(targetUrl);
        const foundPaths = Object.keys(crawlResults).map(u => {
            try { return new URL(u).pathname; } catch (e) { return '/'; }
        });
        const uniquePaths = Array.from(new Set(foundPaths.map(p => p === '/' ? p : p.replace(/\/+$/, '').toLowerCase())));
        const allHtml = Object.values(crawlResults).map(r => r.html).join(' ');

        // 2. Detect CMS & Structure
        const isWordPress = allHtml.includes('wp-content') || allHtml.includes('wp-includes') || allHtml.includes('yoast');
        const isShopify = allHtml.includes('cdn.shopify.com');

        // 3. Advanced Classification Engine
        const classification = {
            public: new Set<string>(),
            static: new Set<string>(),
            private: new Set<string>(),
            system: new Set<string>(),
            dynamic: new Set<string>()
        };

        const categorizer = (path: string) => {
            const low = path.toLowerCase();
            if (path.includes('?')) classification.dynamic.add(path);

            if (low.includes('/admin') || low.includes('/login') || low.includes('/dashboard') || low.includes('/account') || low.includes('/cart') || low.includes('/checkout')) {
                classification.private.add(path);
            } else if (low.includes('/wp-') || low.includes('/api/') || low.includes('/cdn/')) {
                classification.system.add(path);
            } else if (low.includes('/blog') || low.includes('/news') || low.includes('/product') || low.includes('/service') || low.includes('/item')) {
                classification.public.add(path);
            } else if (low.includes('/about') || low.includes('/contact') || low.includes('/faq') || low.includes('/career')) {
                classification.static.add(path);
            } else {
                classification.public.add(path);
            }
        };

        uniquePaths.forEach(categorizer);

        const isECommerce = isShopify || Array.from(classification.public).some(p => p.includes('/product') || p.includes('/shop'));
        const isBlog = isWordPress || Array.from(classification.public).some(p => p.includes('/blog') || p.includes('/news'));

        // 3. Detect Sitemap
        let hasSitemap = false;
        let sitemapUrl = `${baseUrl}/sitemap.xml`;

        try {
            const { status: sitemapStatus } = await robustFetch(sitemapUrl);
            if (sitemapStatus === 200) {
                hasSitemap = true;
            } else {
                // Try index
                const { status: sitemapIndexStatus } = await robustFetch(`${baseUrl}/sitemap_index.xml`);
                if (sitemapIndexStatus === 200) {
                    hasSitemap = true;
                    sitemapUrl = `${baseUrl}/sitemap_index.xml`;
                }
            }
        } catch (e) { }

        // NEW: Fetch and Audit Existing robots.txt
        let currentRobotsTxt = null;
        let score = 0;
        const issues: any[] = [];

        try {
            const { html: robotsContent, status: robotsStatus } = await robustFetch(`${baseUrl}/robots.txt`);
            if (robotsStatus === 200 && robotsContent && robotsContent.toLowerCase().includes('user-agent')) {
                currentRobotsTxt = robotsContent.trim();
            }
        } catch (e) { }

        if (currentRobotsTxt) {
            const lowerRobots = currentRobotsTxt.toLowerCase();

            // 1. User Agent Check
            if (lowerRobots.includes('user-agent: *')) {
                score += 20;
            } else {
                issues.push({
                    type: 'error',
                    title: 'Restricting User-Agents',
                    message: 'Only targeting specific bots (like Googlebot) may prevent other search engines from crawling your site.',
                    fix: 'Use User-agent: *'
                });
            }

            // 2. Over-blocking Check
            const blockedAssets = ['/wp-includes/', '/css/', '/js/', '/assets/', '/images/'].filter(p => lowerRobots.includes(`disallow: ${p}`));
            if (blockedAssets.length > 0) {
                issues.push({
                    type: 'error',
                    title: 'Blocking Critical Assets',
                    message: `Blocking CSS/JS/Images prevents Google from properly rendering (and ranking) your page.`,
                    fix: 'Allow access to styling and script directories'
                });
            } else {
                score += 30;
            }

            // 3. Sitemap Check
            if (lowerRobots.includes('sitemap:')) {
                score += 20;
            } else {
                issues.push({
                    type: 'error',
                    title: 'Missing Sitemap',
                    message: 'No Sitemap directive found in robots.txt to guide search engines.',
                    fix: `Add Sitemap: ${sitemapUrl}`
                });
            }

            // 4. Query Parameter Check
            if (lowerRobots.includes('/*?') || lowerRobots.includes('/*%')) {
                score += 20;
            } else {
                issues.push({
                    type: 'warning',
                    title: 'Missing URL Traps',
                    message: 'Not blocking query parameters (/*?) can lead to massive duplicate content indexing.',
                    fix: 'Add Disallow: /*?'
                });
            }

            // 5. Crawl Delay Check
            if (lowerRobots.includes('crawl-delay:')) {
                issues.push({
                    type: 'warning',
                    title: 'Crawl-delay detected',
                    message: 'Googlebot ignores the Crawl-delay directive. Rely on Search Console instead.',
                    fix: 'Remove Crawl-delay'
                });
            } else {
                score += 10;
            }
        } else {
            score = 0;
            issues.push({
                type: 'error',
                title: 'No robots.txt found',
                message: 'Your website is completely missing a robots.txt file. Crawlers have no guidelines.',
                fix: 'Generate and upload the optimized format below'
            });
        }

        // 4. Generate Optimized Robots.txt Rules
        const mode = options?.mode || 'standard';
        const granularMode = options?.granularMode || false;
        const botName = options?.specificBot || '*';
        let robotsText = `# AI-Optimized ${mode === 'advanced' ? (granularMode ? 'Strict Granular ' : 'Strict Grouped ') : ''}Robots.txt File\n`;
        robotsText += `User-agent: ${botName}\n`;

        if (options?.crawlDelay) {
            robotsText += `Crawl-delay: 10\n`;
        }

        if (mode === 'advanced') {
            robotsText += `Disallow: /\n\n`;

            if (granularMode) {
                // GRANULAR MODE: List every unique discovered path
                robotsText += `# Granular Page-Level Access\n`;
                robotsText += `Allow: /\n`;

                // Group by type for better organization in the file
                const sortedPaths = uniquePaths.filter(p => p !== '/').sort();
                sortedPaths.forEach(p => {
                    robotsText += `Allow: ${p}\n`;
                });
                robotsText += `\n`;
            } else {
                // SMART GROUPED MODE (Prefix aggregation)
                // Core Pages
                const corePages = Array.from(uniquePaths).filter((p: string) => ['/', '/about', '/about-us', '/contact', '/contact-us', '/faq', '/careers'].includes(p));

                robotsText += `# Core Pages\n`;
                robotsText += `Allow: /\n`;
                const uniqueCore = new Set(corePages.map(p => p === '/' ? p : p + '/'));
                uniqueCore.delete('/');
                Array.from(uniqueCore).forEach(p => robotsText += `Allow: ${p}\n`);
                robotsText += `\n`;

                // Categorize prefixes
                const prefixCounts: Record<string, number> = {};
                uniquePaths.forEach((p: string) => {
                    const parts = p.split('/').filter(Boolean);
                    if (parts.length > 0) {
                        const prefix = `/${parts[0]}/`;
                        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
                    }
                });

                // Blog/News
                const blogPrefixes = ['/blog/', '/news/', '/articles/', '/post/'];
                const foundBlogs = Array.from(classification.public).filter((p: string) => blogPrefixes.some(pref => p.startsWith(pref)));
                if (foundBlogs.length > 0 || isBlog) {
                    robotsText += `# Blog Section\n`;
                    const prefixes = new Set(foundBlogs.map((p: string) => '/' + p.split('/')[1] + '/'));
                    if (isBlog && prefixes.size === 0) prefixes.add('/blog/');
                    Array.from(prefixes).forEach((p: any) => robotsText += `Allow: ${p}\n`);
                    robotsText += `\n`;
                }

                // Products
                const productPrefixes = ['/products/', '/product/', '/collections/', '/category/', '/shop/'];
                const foundProducts = Array.from(classification.public).filter((p: string) => productPrefixes.some(pref => p.startsWith(pref)));
                if (foundProducts.length > 0 || isECommerce) {
                    robotsText += `# Products\n`;
                    const prefixes = new Set(foundProducts.map((p: string) => '/' + p.split('/')[1] + '/'));
                    if (isECommerce && prefixes.size === 0) prefixes.add('/products/');
                    Array.from(prefixes).forEach((p: any) => robotsText += `Allow: ${p}\n`);
                    robotsText += `\n`;
                }

                // Legal
                const legalPages = Array.from(classification.public).filter((p: string) => p.includes('privacy') || p.includes('terms') || p.includes('legal') || p.includes('policy'));
                if (legalPages.length > 0) {
                    robotsText += `# Legal Pages\n`;
                    const uniqueLegal = new Set(legalPages.map(p => p.endsWith('/') ? p : p + '/'));
                    Array.from(uniqueLegal).forEach(p => robotsText += `Allow: ${p}\n`);
                    robotsText += `\n`;
                }
            }

        } else {
            // STANDARD MODE LOGIC
            robotsText += `\n# Allow crawling of public content pages\n`;
            robotsText += `Allow: /\n`;

            // Explicit Allows
            if (isWordPress) {
                robotsText += `Allow: /wp-admin/admin-ajax.php\n`;
            }
            if (isBlog) {
                robotsText += `Allow: /blog/\n`;
            }
            if (isECommerce && !isShopify) {
                robotsText += `Allow: /products/\n`;
                robotsText += `Allow: /services/\n`;
            }

            robotsText += `\n# Block sensitive areas\n`;

            // Common disallows
            const disallows = new Set<string>(['/admin/', '/login/', '/private/', '/dashboard/']);

            // Commerce disallows
            if (isECommerce) {
                disallows.add('/cart/');
                disallows.add('/checkout/');
                disallows.add('/account/');
                disallows.add('/orders/');
            }

            // CMS specific
            if (isWordPress) {
                disallows.add('/wp-admin/');
                disallows.add('/wp-includes/');
            }

            if (options?.blockQueryParams) {
                robotsText += `\n# Smart Parameter control\n`;
                robotsText += `Disallow: /*?utm_\n`;
                robotsText += `Disallow: /*?replytocom=\n`;
                robotsText += `Disallow: /*?filter=\n`;
                robotsText += `Disallow: /*?sort=\n`;
            }

            // Output disallows
            Array.from(disallows).forEach(path => {
                robotsText += `Disallow: ${path}\n`;
            });

            robotsText += `\n`;
        }

        // 5. Validation Engine
        const validationIssues = [];
        const finalRobotsLower = robotsText.toLowerCase();

        if (finalRobotsLower.includes('disallow: /css/') || finalRobotsLower.includes('disallow: /assets/')) {
            validationIssues.push({ type: 'warning', title: 'Over-blocking detected', message: 'Blocking CSS or assets may prevent search engines from properly rendering your site.' });
        }
        if (finalRobotsLower.includes('disallow: /js/')) {
            validationIssues.push({ type: 'warning', title: 'JS Blocking detected', message: 'Blocking JavaScript directories can lead to indexation issues on modern web apps.' });
        }
        if (!hasSitemap && !finalRobotsLower.includes('sitemap:')) {
            validationIssues.push({ type: 'error', title: 'Missing sitemap', message: 'Neither a discovered sitemap nor a sitemap directive was found.' });
        }

        // Combined issues
        const allIssues = [...issues, ...validationIssues];

        if (hasSitemap) {
            robotsText += `# XML Sitemap Navigation\n`;
            robotsText += `Sitemap: ${sitemapUrl}\n`;
        }

        const totalAllowed = (robotsText.match(/^Allow: /gm) || []).length;

        return NextResponse.json({
            success: true,
            currentRobotsTxt,
            score,
            issues: allIssues,
            robotsTxt: robotsText.trim(),
            summary: {
                totalPages: Object.keys(crawlResults).length,
                totalAllowed,
                categories: {
                    public: classification.public.size,
                    static: classification.static.size,
                    private: classification.private.size,
                    system: classification.system.size,
                    dynamic: classification.dynamic.size
                }
            },
            insights: {
                isWordPress,
                isShopify,
                isECommerce,
                isBlog,
                hasSitemap,
                sitemapUrl: hasSitemap ? sitemapUrl : null
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Error generating robots.txt' }, { status: 500 });
    }
}

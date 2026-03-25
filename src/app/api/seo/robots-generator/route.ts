import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { robustFetch } from '@/lib/seo/fetch';

export async function POST(req: Request) {
    try {
        const { url, options } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const domainUrl = new URL(targetUrl);
        const baseUrl = `${domainUrl.protocol}//${domainUrl.host}`;

        let html = '';
        try {
            const res = await robustFetch(targetUrl);
            if (res.status < 400 && res.html) {
                html = res.html;
            }
        } catch (e) { }

        const $ = cheerio.load(html);

        // 1. Detect CMS
        const isWordPress = html.includes('wp-content') || html.includes('wp-includes') || html.includes('yoast');
        const isShopify = html.includes('cdn.shopify.com');

        // 2. Extract Links to detect folders
        const links = new Set<string>();
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && (href.startsWith('/') || href.startsWith(baseUrl))) {
                try {
                    const parsed = new URL(href, baseUrl);
                    if (parsed.pathname !== '/') {
                        links.add(parsed.pathname);
                    }
                } catch (e) { }
            }
        });

        const paths = Array.from(links);

        // Detect e-commerce
        const isECommerce = isShopify || paths.some(p => p.includes('/product') || p.includes('/category') || p.includes('/cart') || p.includes('/checkout'));

        // Detect blog
        const isBlog = isWordPress || paths.some(p => p.includes('/blog') || p.includes('/post') || p.includes('/article') || p.includes('/news'));

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
        const botName = options?.specificBot || '*';
        let robotsText = `# AI-Optimized ${mode === 'advanced' ? 'Strict Allow-Based ' : ''}Robots.txt File\n`;
        robotsText += `User-agent: ${botName}\n`;

        if (options?.crawlDelay) {
            robotsText += `Crawl-delay: 10\n`;
        }

        if (mode === 'advanced') {
            robotsText += `Disallow: /\n\n`;

            // Core Pages
            const corePages = Array.from(paths).filter(p => ['/', '/about', '/about-us', '/contact', '/contact-us', '/faq', '/careers'].includes(p.replace(/\/$/, '')));

            robotsText += `# Core Pages\n`;
            robotsText += `Allow: /\n`; // ALWAYS allow root for advanced mode to match requirement
            const uniqueCore = new Set(corePages.map(p => p.endsWith('/') ? p : p + '/'));
            uniqueCore.delete('/');
            Array.from(uniqueCore).forEach(p => robotsText += `Allow: ${p}\n`);
            robotsText += `\n`;

            // Categorize prefixes
            const prefixCounts: Record<string, number> = {};
            paths.forEach(p => {
                const parts = p.split('/').filter(Boolean);
                if (parts.length > 0) {
                    const prefix = `/${parts[0]}/`;
                    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
                }
            });

            // Blog/News
            const blogPrefixes = ['/blog/', '/news/', '/articles/', '/post/'];
            const foundBlogs = blogPrefixes.filter(p => prefixCounts[p] && prefixCounts[p] >= 1);
            if (foundBlogs.length > 0) {
                robotsText += `# Blog Section\n`;
                foundBlogs.forEach(p => robotsText += `Allow: ${p}\n`);
                robotsText += `\n`;
            }

            // Products
            const productPrefixes = ['/products/', '/product/', '/collections/', '/category/', '/shop/'];
            const foundProducts = productPrefixes.filter(p => prefixCounts[p] && prefixCounts[p] >= 1);
            if (foundProducts.length > 0) {
                robotsText += `# Products\n`;
                foundProducts.forEach(p => robotsText += `Allow: ${p}\n`);
                robotsText += `\n`;
            }

            // Legal
            const legalPages = Array.from(paths).filter(p => p.includes('privacy') || p.includes('terms') || p.includes('legal') || p.includes('policy'));
            if (legalPages.length > 0) {
                robotsText += `# Legal Pages\n`;
                const uniqueLegal = new Set(legalPages.map(p => p.endsWith('/') ? p : p + '/'));
                Array.from(uniqueLegal).forEach(p => robotsText += `Allow: ${p}\n`);
                robotsText += `\n`;
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

            robotsText += `\n# Disallow crawling of secure or private areas\n`;

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
                disallows.add('/*?');
                disallows.add('/*%');
            }

            // Output disallows
            Array.from(disallows).forEach(path => {
                robotsText += `Disallow: ${path}\n`;
            });

            robotsText += `\n`;
        }

        if (hasSitemap) {
            robotsText += `# XML Sitemap Navigation\n`;
            robotsText += `Sitemap: ${sitemapUrl}\n`;
        }

        return NextResponse.json({
            success: true,
            currentRobotsTxt,
            score,
            issues,
            robotsTxt: robotsText.trim(),
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

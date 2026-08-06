import axios from 'axios';
import { robustFetch } from './fetch';
import robotsParser from 'robots-parser';
import * as htmlparser2 from 'htmlparser2';
import * as domutils from 'domutils';
import { extractImagesWithContext } from './images';


export async function checkRobots(url: string) {
    try {
        const urlObj = new URL(url);
        const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
        const { html: robotsText, status } = await robustFetch(robotsUrl);

        if (status !== 200 || !robotsText) {
            return { exists: false, error: 'No robots.txt found' };
        }
        const robots = robotsParser(robotsUrl, robotsText);

        return {
            exists: true,
            sitemaps: robots.getSitemaps(),
            isAllowed: robots.isAllowed(url, 'Googlebot')
        };
    } catch (error) {
        return { exists: false, error: 'No robots.txt found' };
    }
}

export async function checkSitemap(url: string) {
    try {
        const urlObj = new URL(url);
        const sitemapUrl = `${urlObj.protocol}//${urlObj.host}/sitemap.xml`;
        const { html: sitemapXml, status } = await robustFetch(sitemapUrl);
        if (status !== 200 || !sitemapXml) return { exists: false };
        return { exists: true, url: sitemapUrl, size: sitemapXml.length };
    } catch (error) {
        return { exists: false };
    }
}

export async function extractSitemapUrls(url: string): Promise<string[]> {
    const tryPaths = [
        '/sitemap_index.xml',
        '/sitemap.xml',
        '/wp-sitemap.xml',
        '/sitemap_index.xml.gz'
    ];

    const urlObj = new URL(url);
    const discoveredUrls = new Set<string>();

    for (const path of tryPaths) {
        try {
            const sitemapUrl = `${urlObj.protocol}//${urlObj.host}${path}`;
            console.log(`[Technical] Fetching sitemap: ${sitemapUrl}`);
            const { html: sitemapXml, status } = await robustFetch(sitemapUrl);

            if (status !== 200 || !sitemapXml || sitemapXml.length < 50) continue;

            // Check if it's a sitemap index (contains <sitemap> or points to other .xml files)
            if (sitemapXml.includes('<sitemap>')) {
                const sitemapIndexMatches = sitemapXml.match(/<loc>(.*?)<\/loc>/g);
                if (sitemapIndexMatches) {
                    console.log(`[Technical] Sitemap index found with ${sitemapIndexMatches.length} sub-sitemaps`);
                    for (const match of sitemapIndexMatches) {
                        const subSitemapUrl = match.replace('<loc>', '').replace('</loc>', '').trim();
                        if (subSitemapUrl.startsWith('http')) {
                            console.log(`[Technical] Fetching sub-sitemap: ${subSitemapUrl}`);
                            const { html: subXml, status: subStatus } = await robustFetch(subSitemapUrl);
                            if (subStatus === 200 && subXml) {
                                extractLocsFromXml(subXml, discoveredUrls);
                            }
                        }
                    }
                }
            } else {
                extractLocsFromXml(sitemapXml, discoveredUrls);
            }

            if (discoveredUrls.size > 0) break; // Found something, stop searching other paths
        } catch (error) {
            console.error(`[Technical] Error fetching sitemap path ${path}:`, error);
        }
    }

    function extractLocsFromXml(xml: string, set: Set<string>) {
        const locMatches = xml.match(/<loc>(.*?)<\/loc>/g);
        if (locMatches) {
            locMatches.forEach(match => {
                const loc = match.replace('<loc>', '').replace('</loc>', '').trim();
                if (loc.startsWith('http') && !loc.endsWith('.xml') && !loc.endsWith('.xml.gz')) {
                    set.add(loc);
                }
            });
        }
    }

    console.log(`[Technical] Total extracted unique URLs from sitemap: ${discoveredUrls.size}`);
    return Array.from(discoveredUrls);
}

export async function analyzeTechnical(html: string, url: string) {
    const dom = htmlparser2.parseDocument(html);

    const titleNode = domutils.findOne((ele) => ele.name === 'title', dom.children);
    const metaDescNode = domutils.findOne((ele) => ele.name === 'meta' && ele.attribs.name === 'description', dom.children);
    const canonicalNode = domutils.findOne((ele) => ele.name === 'link' && ele.attribs.rel === 'canonical', dom.children);
    const h1Nodes = domutils.findAll((ele) => ele.name === 'h1', dom.children);
    const h2Nodes = domutils.findAll((ele) => ele.name === 'h2', dom.children);
    const imgNodes = domutils.findAll((ele) => ele.name === 'img', dom.children);
    const htmlNode = domutils.findOne((ele) => ele.name === 'html', dom.children);
    const charsetNode = domutils.findOne((ele) => ele.name === 'meta' && (!!ele.attribs.charset || (ele.attribs.content?.includes('charset'))), dom.children);
    const faviconNode = domutils.findOne((ele) => ele.name === 'link' && ele.attribs.rel?.includes('icon'), dom.children);
    const inlineCssNodes = domutils.findAll((ele) => ele.name === 'style' || !!ele.attribs.style, dom.children);
    const deprecatedNodes = domutils.findAll((ele) => ['font', 'center', 'strike', 'u', 'dir', 'applet', 'marquee'].includes(ele.name), dom.children);

    const title = titleNode ? domutils.textContent(titleNode) : '';
    const metaDescription = metaDescNode?.attribs.content || '';

    // Extracted Text for basic keyword/word count analysis
    const textContent = domutils.textContent(dom).replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').length;

    let totalImgSize = 0;
    let responsiveImages = 0;
    let modernFormatImages = 0;

    imgNodes.forEach(img => {
        if (img.attribs.srcset || (img.attribs.width && img.attribs.height) || img.attribs.sizes) {
            responsiveImages++;
        }
        if (img.attribs.src?.match(/\.(webp|avif|svg)$/i)) {
            modernFormatImages++;
        }
    });

    const aNodes = domutils.findAll((ele) => ele.name === 'a', dom.children);
    let externalLinkCount = 0;
    let noFollowExternalCount = 0;
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];

    aNodes.forEach(a => {
        const href = a.attribs.href;
        if (href) {
            try {
                const urlObj = new URL(url);
                const hrefObj = new URL(href, url);
                if (hrefObj.hostname !== urlObj.hostname) {
                    externalLinkCount++;
                    if (a.attribs.rel?.includes('nofollow')) {
                        noFollowExternalCount++;
                    }
                    externalLinks.push(hrefObj.href);
                } else {
                    internalLinks.push(hrefObj.href);
                }
            } catch (e) { }
        }
    });

    // OG / Social tags
    const ogTitleNode = domutils.findOne((ele) => ele.name === 'meta' && ele.attribs.property === 'og:title', dom.children);
    const ogDescNode = domutils.findOne((ele) => ele.name === 'meta' && ele.attribs.property === 'og:description', dom.children);
    const ogImageNode = domutils.findOne((ele) => ele.name === 'meta' && ele.attribs.property === 'og:image', dom.children);
    const ogUrlNode = domutils.findOne((ele) => ele.name === 'meta' && ele.attribs.property === 'og:url', dom.children);
    const twitterCardNode = domutils.findOne((ele) => ele.name === 'meta' && (ele.attribs.name === 'twitter:card' || ele.attribs.property === 'twitter:card'), dom.children);

    // Viewport
    const viewportNode = domutils.findOne((ele) => ele.name === 'meta' && ele.attribs.name === 'viewport', dom.children);

    // Doctype
    const hasDoctype = html.trim().toLowerCase().startsWith('<!doctype');

    // Noindex
    const noindexNode = domutils.findOne((ele) => ele.name === 'meta' && ele.attribs.name === 'robots' && (ele.attribs.content || '').toLowerCase().includes('noindex'), dom.children);

    // Meta refresh
    const metaRefreshNode = domutils.findOne((ele) => ele.name === 'meta' && ele.attribs['http-equiv']?.toLowerCase() === 'refresh', dom.children);

    // Flash
    const hasFlash = html.includes('<object') && (html.includes('.swf') || html.includes('application/x-shockwave-flash'));

    // Nested tables
    const tableNodes = domutils.findAll((ele) => ele.name === 'table', dom.children);
    const hasNestedTables = tableNodes.some(t => domutils.findAll((ele) => ele.name === 'table', t.children).length > 0);

    // Frameset
    const hasFrameset = html.toLowerCase().includes('<frameset');

    // Script & link nodes for render-blocking detection
    const renderBlockingScripts = domutils.findAll(
        (ele) => ele.name === 'script' && !ele.attribs.async && !ele.attribs.defer && !ele.attribs.type?.includes('module'),
        dom.children
    ).filter(s => s.attribs.src);

    const renderBlockingLinks = domutils.findAll(
        (ele) => ele.name === 'link' && ele.attribs.rel === 'stylesheet' && !ele.attribs.media,
        dom.children
    );

    // JS minification hint
    const scriptNodes = domutils.findAll((ele) => ele.name === 'script' && !!ele.attribs.src, dom.children);
    const hasMinifiedJs = scriptNodes.some(s => (s.attribs.src || '').includes('.min.'));

    // DOM size (count all elements)
    const allElements = domutils.findAll(() => true, dom.children);

    // Image width/height (aspect ratio)
    const imagesWithoutDimensions = imgNodes.filter(img => !img.attribs.width || !img.attribs.height);

    // Mixed content
    const hasMixedContent = url.startsWith('https://') &&
        (html.match(/src=["']http:\/\//g) || html.match(/href=["']http:\/\//g)) !== null;

    // Unsafe cross-origin links
    const unsafeCrossOriginLinks = aNodes.filter(a =>
        a.attribs.target === '_blank' && !(a.attribs.rel || '').includes('noopener')
    );

    // Plaintext emails
    const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const plaintextEmails = emailMatches.filter(e => !e.endsWith('.png') && !e.endsWith('.jpg')).slice(0, 5);

    // Ads.txt reference (light check — just see if domain in robots/sitemap)
    const adsTextHint = html.includes('ads.txt');

    // Basic check vars
    const hasAnalytics = html.includes('google-analytics') || html.includes('gtag') || html.includes('G-');
    const isFriendlyUrl = !url.includes('?') && !url.includes('=');

    return {
        title,
        metaDescription,
        canonical: canonicalNode?.attribs.href || '',
        h1Count: h1Nodes.length,
        h1Details: h1Nodes.map(node => domutils.textContent(node).trim()).filter(Boolean),
        h2Count: h2Nodes.length,
        h2Details: h2Nodes.map(node => domutils.textContent(node).trim()).filter(Boolean),
        imageCount: imgNodes.length,
        totalImages: imgNodes.length,
        imagesWithoutAlt: imgNodes.filter(img => !img.attribs.alt).length,
        imagesWithoutAltDetails: imgNodes.filter(img => !img.attribs.alt).map(img => img.attribs.src || 'Unknown source').slice(0, 20),
        imagesWithoutDimensions: imagesWithoutDimensions.length,
        responsiveImages,
        modernFormatImages,
        language: htmlNode?.attribs.lang || '',
        hasLangAttr: !!(htmlNode?.attribs.lang),
        hasFavicon: !!faviconNode,
        charset: charsetNode?.attribs.charset || charsetNode?.attribs.content || '',
        hasCharset: !!charsetNode,
        inlineCssCount: inlineCssNodes.length,
        inlineCssDetails: inlineCssNodes.map(n => {
            if (n.name === 'style') {
                const content = domutils.textContent(n).trim().replace(/\s+/g, ' ');
                return content ? `<style> ${content.substring(0, 50)}... </style>` : '<style>...</style>';
            }
            let attrStr = '';
            if (n.attribs.id) attrStr += ` id="${n.attribs.id}"`;
            if (n.attribs.class) attrStr += ` class="${n.attribs.class}"`;
            const style = n.attribs.style || '';
            const shortStyle = style.length > 40 ? style.substring(0, 40) + '...' : style;
            return `<${n.name}${attrStr} style="${shortStyle}">`;
        }).slice(0, 15),
        deprecatedTagsCount: deprecatedNodes.length,
        deprecatedTagsDetails: deprecatedNodes.map(n => {
            const text = domutils.textContent(n).trim().replace(/\s+/g, ' ');
            const shortText = text.length > 40 ? text.substring(0, 40) + '...' : text;
            return shortText ? `<${n.name}> containing "${shortText}"` : `<${n.name}>`;
        }).slice(0, 15),
        htmlSize: html.length,
        wordCount,
        linkCount: aNodes.length,
        internalLinks,
        externalLinks,
        externalLinkCount,
        noFollowExternalCount,
        hasAnalytics,
        isFriendlyUrl,
        hasDuplicateTitle: title.length > 0 && html.split(`<title>${title}</title>`).length > 2,
        allImages: extractImagesWithContext(html, url),

        // New fields
        hasOgTitle: !!ogTitleNode,
        hasOgDesc: !!ogDescNode,
        hasOgImage: !!ogImageNode,
        hasOgUrl: !!ogUrlNode,
        hasTwitterCard: !!twitterCardNode,
        hasViewport: !!viewportNode,
        viewportContent: viewportNode?.attribs.content || '',
        hasDoctype,
        hasNoindex: !!noindexNode,
        hasMetaRefresh: !!metaRefreshNode,
        hasFlash,
        hasNestedTables,
        hasFrameset,
        renderBlockingScriptsCount: renderBlockingScripts.length,
        renderBlockingLinksCount: renderBlockingLinks.length,
        hasMinifiedJs,
        domElementCount: allElements.length,
        scriptCount: scriptNodes.length,
        hasMixedContent,
        unsafeCrossOriginCount: unsafeCrossOriginLinks.length,
        plaintextEmails,
        hasAdsText: adsTextHint,
        mediaQueryCount: (html.match(/@media/g) || []).length,
        hasCanonicalTag: !!canonicalNode,
        hasGzip: false, // will be set by header check in scoring
    };
}

export async function checkCustom404(baseUrl: string) {
    try {
        const randomPath = `/404-test-${Math.random().toString(36).substring(7)}`;
        const testUrl = new URL(randomPath, baseUrl).href;

        const { html: responseHtml, status: responseStatus } = await robustFetch(testUrl);

        // If it's 404 and has some content (not a generic browser/server 404)
        const isCustom = responseStatus === 404 && responseHtml.length > 500 && !responseHtml.includes('nginx') && !responseHtml.includes('Apache');

        return {
            status: responseStatus,
            isCustom,
            hasError: responseStatus !== 404 // Should be 404 for a non-existent page
        };
    } catch (error) {
        return { isCustom: false, error: 'Failed' };
    }
}

export async function checkAssetCaching(baseUrl: string, html: string) {
    const dom = htmlparser2.parseDocument(html);
    const cssNodes = domutils.findAll((ele) => (ele.name === 'link' && ele.attribs.rel === 'stylesheet') || ele.name === 'script', dom.children);

    const assets = cssNodes.map(node => node.attribs.href || node.attribs.src).filter(Boolean).slice(0, 3);

    let cachedCount = 0;

    for (const asset of assets) {
        try {
            const assetUrl = asset.startsWith('http') ? asset : new URL(asset, baseUrl).href;
            const res = await fetch(assetUrl, { method: 'HEAD' });
            const cacheControl = res.headers.get('cache-control');
            if (cacheControl && (cacheControl.includes('max-age') || cacheControl.includes('immutable'))) {
                cachedCount++;
            }
        } catch (e) { }
    }

    return {
        totalAssets: assets.length,
        cachedAssets: cachedCount,
        isOptimized: assets.length > 0 ? (cachedCount / assets.length) > 0.5 : true
    };
}

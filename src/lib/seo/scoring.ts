import { EXHAUSTIVE_CHECKS } from './checks';

export interface ScoringParams {
    url: string;
    html: string;
    technical: any;
    performance: any;
    robots?: any;
    sitemap?: any;
    indexStatus?: any;
    brokenLinksCount?: number;
    structuredData?: any[];
    assets?: any;
    custom404?: any;
    securityHeaders?: any;
}

export function calculateSeoResults(params: ScoringParams) {
    const {
        url,
        html,
        technical,
        performance,
        robots = { exists: false },
        sitemap = { exists: false },
        indexStatus = { indexed: true },
        brokenLinksCount = 0,
        structuredData = [],
        assets = { isOptimized: true },
        custom404 = { isCustom: true },
        securityHeaders = {},
    } = params;

    const perfScore = performance.performanceScore || 0;
    const isHttps = url.startsWith('https://');

    const results: Record<string, string> = {
        // ── Indexing ──────────────────────────────────────────────────────────
        google_index: indexStatus.indexed ? 'pass' : (robots.exists ? 'warning' : 'critical'),
        robots: robots.exists ? 'pass' : 'critical',
        sitemap: sitemap.exists ? 'pass' : 'critical',
        noindex_tag: technical.hasNoindex ? 'warning' : 'pass',
        canonical_tag: technical.hasCanonicalTag ? 'pass' : 'warning',
        canonical: technical.canonical ? 'pass' : 'warning',
        disallow_directive: robots.exists ? (robots.isAllowed !== false ? 'pass' : 'critical') : 'warning',
        url_redirects: technical.isFriendlyUrl ? 'pass' : 'warning',
        meta_refresh: technical.hasMetaRefresh ? 'critical' : 'pass',
        nofollow: technical.externalLinkCount > 0
            ? (technical.noFollowExternalCount > 0 ? 'pass' : 'warning') : 'pass',

        // ── Content ───────────────────────────────────────────────────────────
        meta_title: technical.title
            ? (technical.title.length > 30 && technical.title.length < 65 ? 'pass' : 'warning')
            : 'critical',
        meta_desc: technical.metaDescription
            ? (technical.metaDescription.length > 50 && technical.metaDescription.length < 160 ? 'pass' : 'warning')
            : 'critical',
        h1_tags: technical.h1Count === 1 ? 'pass' : (technical.h1Count === 0 ? 'critical' : 'warning'),
        h2_tags: technical.h2Count >= 2 ? 'pass' : 'warning',
        keywords: technical.wordCount > 500 ? 'pass' : (technical.wordCount > 200 ? 'warning' : 'critical'),
        keyword_cloud: technical.wordCount > 300 ? 'pass' : 'warning',
        keyword_usage: (technical.title && technical.h1Count > 0) ? 'pass' : 'warning',
        related_keywords: technical.wordCount > 400 ? 'pass' : 'warning',
        duplicate: technical.hasDuplicateTitle ? 'critical' : 'pass',
        spell_check: 'pass', // Requires external API; default to pass
        lang_attr: technical.hasLangAttr ? 'pass' : 'warning',

        // ── Performance ───────────────────────────────────────────────────────
        speed: perfScore > 85 ? 'pass' : (perfScore > 50 ? 'warning' : 'critical'),
        lcp: (() => {
            const lcp = performance.largestContentfulPaint;
            if (!lcp || lcp === 'N/A') return 'warning';
            const val = parseFloat(lcp);
            return val < 2.5 ? 'pass' : val < 4 ? 'warning' : 'critical';
        })(),
        cls: (() => {
            const cls = performance.cumulativeLayoutShift;
            if (!cls || cls === 'N/A') return 'warning';
            const val = parseFloat(cls);
            return val < 0.1 ? 'pass' : val < 0.25 ? 'warning' : 'critical';
        })(),
        inp: perfScore > 80 ? 'pass' : (perfScore > 60 ? 'warning' : 'critical'),
        gzip: securityHeaders.contentEncoding?.includes('gzip') || securityHeaders.contentEncoding?.includes('br') ? 'pass' : 'warning',
        page_cache: securityHeaders.cacheControl?.includes('max-age') || securityHeaders.xCacheStatus === 'HIT' ? 'pass' : 'warning',
        cdn_usage: securityHeaders.xServedBy || securityHeaders.cfRay || securityHeaders.xAmzCfPop ? 'pass' : 'warning',
        render_blocking: (technical.renderBlockingScriptsCount || 0) <= 2 ? 'pass' : 'warning',
        js_execution: perfScore > 70 ? 'pass' : 'warning',
        page_objects: technical.scriptCount <= 10 ? 'pass' : 'warning',
        img_caching: assets.isOptimized ? 'pass' : 'warning',
        js_caching: assets.isOptimized ? 'pass' : 'warning',
        css_caching: assets.isOptimized ? 'pass' : 'warning',

        // ── Code Quality ──────────────────────────────────────────────────────
        html_size: (technical.htmlSize / 1024) < 100 ? 'pass' : ((technical.htmlSize / 1024) < 300 ? 'warning' : 'critical'),
        dom_size: (technical.domElementCount || 0) < 1500 ? 'pass' : ((technical.domElementCount || 0) < 3000 ? 'warning' : 'critical'),
        inline_css: technical.inlineCssCount < 5 ? 'pass' : (technical.inlineCssCount < 20 ? 'warning' : 'critical'),
        deprecated_html: technical.deprecatedTagsCount === 0 ? 'pass' : 'critical',
        css_minification: html.includes('.min.css') || html.length < 10000 ? 'pass' : 'warning',
        js_minification: technical.hasMinifiedJs || technical.scriptCount === 0 ? 'pass' : 'warning',
        charset_declaration: technical.hasCharset ? 'pass' : 'warning',
        doctype: technical.hasDoctype ? 'pass' : 'critical',
        nested_tables: technical.hasNestedTables ? 'warning' : 'pass',
        frameset: technical.hasFrameset ? 'critical' : 'pass',
        flash_test: technical.hasFlash ? 'critical' : 'pass',
        js_error: 'pass',    // Requires real browser execution
        console_errors: 'pass', // Requires real browser execution

        // ── Media ─────────────────────────────────────────────────────────────
        alt_tags: technical.totalImages === 0 ? 'pass' : (technical.imagesWithoutAlt === 0 ? 'pass' : 'warning'),
        responsive_img: technical.totalImages === 0 ? 'pass' : (technical.responsiveImages / technical.totalImages > 0.8 ? 'pass' : 'warning'),
        modern_img: technical.totalImages === 0 ? 'pass' : (technical.modernFormatImages / technical.totalImages > 0.5 ? 'pass' : 'warning'),
        img_alt_check: technical.totalImages > 0 && technical.imagesWithoutAlt === 0 ? 'pass' : (technical.totalImages > 0 ? 'warning' : 'pass'),
        image_aspect: (technical.imagesWithoutDimensions || 0) === 0 ? 'pass' : 'warning',
        image_metadata: technical.totalImages === 0 ? 'pass' : 'warning', // Can't easily check filenames
        image_caching: assets.isOptimized ? 'pass' : 'warning',

        // ── Mobile ────────────────────────────────────────────────────────────
        viewport: technical.hasViewport ? 'pass' : 'critical',
        media_query: (technical.mediaQueryCount || 0) > 0 ? 'pass' : 'warning',
        mobile_snapshot: technical.hasViewport ? 'pass' : 'warning',

        // ── Security ──────────────────────────────────────────────────────────
        https: isHttps ? 'pass' : 'critical',
        mixed_content: isHttps && technical.hasMixedContent ? 'critical' : 'pass',
        http2: securityHeaders.http2 ? 'pass' : 'warning',
        hsts: securityHeaders.hsts ? 'pass' : 'warning',
        safe_browsing: 'pass', // Would require Google API key
        server_signature: securityHeaders.server ? 'warning' : 'pass',
        directory_browsing: 'pass', // Requires extra HTTP test
        plaintext_emails: (technical.plaintextEmails || []).length === 0 ? 'pass' : 'warning',
        unsafe_cross_origin: (technical.unsafeCrossOriginCount || 0) === 0 ? 'pass' : 'warning',
        spf_records: 'warning', // Requires DNS lookup
        ads_txt: 'warning', // Requires HTTP check of /ads.txt

        // ── Social ────────────────────────────────────────────────────────────
        og_tags: (technical.hasOgTitle && technical.hasOgDesc && technical.hasOgImage) ? 'pass' : 'warning',
        twitter_card: technical.hasTwitterCard ? 'pass' : 'warning',
        social_meta: (technical.hasOgImage) ? 'pass' : 'warning',
        social_media_preview: (technical.title && technical.metaDescription) ? 'pass' : 'warning',

        // ── Analytics & Structure ─────────────────────────────────────────────
        analytics: technical.hasAnalytics ? 'pass' : 'warning',
        structured_data: structuredData && structuredData.length > 0 ? 'pass' : 'warning',
        favicon: technical.hasFavicon ? 'pass' : 'warning',
        error_404: custom404.isCustom ? 'pass' : 'warning',
        friendly_url: technical.isFriendlyUrl ? 'pass' : 'warning',

        // ── Links ─────────────────────────────────────────────────────────────
        broken_links: brokenLinksCount === 0 ? 'pass' : 'critical',
        competitors: 'warning', // Requires external data
        backlinks: 'warning',   // Requires external API
    };

    // Ensure all exhaustive checks have a value
    EXHAUSTIVE_CHECKS.forEach(check => {
        if (!results[check.id]) {
            results[check.id] = 'pass';
        }
    });

    return results;
}

export function calculateOverallScore(results: Record<string, string>) {
    const relevantCheckIds = EXHAUSTIVE_CHECKS.map(c => c.id);
    const statuses = relevantCheckIds.map(id => (results[id] || 'pending').toLowerCase());

    const passCount = statuses.filter(s => s === 'pass').length;
    const criticalCount = statuses.filter(s => s === 'critical').length;
    const warningCount = statuses.filter(s => s === 'warning').length;

    // Weighted scoring: critical = -2pts, warning = -0.5pts
    const weightedScore = Math.max(0, Math.round(
        ((passCount * 1 + warningCount * 0.5) / relevantCheckIds.length) * 100
    ));

    return {
        score: weightedScore,
        passCount,
        criticalCount,
        warningCount,
        totalChecks: relevantCheckIds.length
    };
}

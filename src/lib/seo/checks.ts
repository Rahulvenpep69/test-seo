import { SEO_INSTRUCTIONS } from './instructions';

export type CheckCategory =
    | 'Content'
    | 'Performance'
    | 'Security'
    | 'Mobile'
    | 'Indexing'
    | 'Code'
    | 'Media'
    | 'Structure'
    | 'Analytics'
    | 'Links'
    | 'Social';

export interface SeoCheck {
    id: string;
    category: CheckCategory;
    title: string;
    suggestion: string;
    howToFix: string;
}

export const EXHAUSTIVE_CHECKS: SeoCheck[] = [
    // ── Content ──────────────────────────────────────────────────────────────
    { id: 'meta_title', category: 'Content', title: 'Meta Title Test', suggestion: 'Ensure titles are unique and 30-65 chars.', howToFix: SEO_INSTRUCTIONS.meta_title },
    { id: 'meta_desc', category: 'Content', title: 'Meta Description Test', suggestion: 'Provide unique meta descriptions 120-160 chars.', howToFix: SEO_INSTRUCTIONS.meta_desc },
    { id: 'h1_tags', category: 'Content', title: 'Heading Tags Test (H1)', suggestion: 'Use exactly one H1 tag per page.', howToFix: SEO_INSTRUCTIONS.h1_tags },
    { id: 'h2_tags', category: 'Content', title: 'Heading Tags Test (H2)', suggestion: 'Use H2 tags to structure your content.', howToFix: SEO_INSTRUCTIONS.h2_tags },
    { id: 'keywords', category: 'Content', title: 'Keywords Usage Test', suggestion: 'Include primary keywords naturally in content.', howToFix: SEO_INSTRUCTIONS.keywords },
    { id: 'keyword_cloud', category: 'Content', title: 'Keywords Cloud Test', suggestion: 'Ensure keyword density is between 1-3%.', howToFix: SEO_INSTRUCTIONS.keyword_cloud },
    { id: 'keyword_usage', category: 'Content', title: 'Most Common Keywords Test', suggestion: 'Primary keyword should appear in title, H1 and first 100 words.', howToFix: SEO_INSTRUCTIONS.keyword_usage },
    { id: 'related_keywords', category: 'Content', title: 'Related Keywords Test', suggestion: 'Use LSI keywords and synonyms to improve topical relevance.', howToFix: SEO_INSTRUCTIONS.related_keywords },
    { id: 'duplicate', category: 'Content', title: 'Duplicate Content Test', suggestion: 'Avoid exact duplicate content across pages.', howToFix: SEO_INSTRUCTIONS.duplicate },
    { id: 'spell_check', category: 'Content', title: 'Spell Check Test', suggestion: 'Proofread your content for typos and grammar issues.', howToFix: SEO_INSTRUCTIONS.spell_check },
    { id: 'lang_attr', category: 'Content', title: 'HTML Language Tag Test', suggestion: 'Add lang="en" to the <html> element.', howToFix: SEO_INSTRUCTIONS.lang_attr },

    // ── Indexing ──────────────────────────────────────────────────────────────
    { id: 'google_index', category: 'Indexing', title: 'Google Index Status Test', suggestion: 'Ensure your site is indexable by Google.', howToFix: SEO_INSTRUCTIONS.google_index },
    { id: 'robots', category: 'Indexing', title: 'Robots.txt Test', suggestion: 'Provide a valid robots.txt file.', howToFix: SEO_INSTRUCTIONS.robots },
    { id: 'sitemap', category: 'Indexing', title: 'Sitemap Test', suggestion: 'Include an XML sitemap for search engines.', howToFix: SEO_INSTRUCTIONS.sitemap },
    { id: 'noindex_tag', category: 'Indexing', title: 'Noindex Tag Test', suggestion: 'Ensure pages you want indexed don\'t have noindex.', howToFix: SEO_INSTRUCTIONS.noindex_tag },
    { id: 'canonical_tag', category: 'Indexing', title: 'Canonical Tag Test', suggestion: 'Set canonical tags to prevent duplicate indexing.', howToFix: SEO_INSTRUCTIONS.canonical_tag },
    { id: 'canonical', category: 'Indexing', title: 'URL Canonicalization Test', suggestion: 'Set a canonical URL for every page.', howToFix: SEO_INSTRUCTIONS.canonical },
    { id: 'disallow_directive', category: 'Indexing', title: 'Disallow Directive Test', suggestion: 'Verify that important pages aren\'t blocked in robots.txt.', howToFix: SEO_INSTRUCTIONS.disallow_directive },
    { id: 'url_redirects', category: 'Indexing', title: 'URL Redirects Test', suggestion: 'Avoid redirect chains; use direct 301 redirects.', howToFix: SEO_INSTRUCTIONS.url_redirects },
    { id: 'meta_refresh', category: 'Indexing', title: 'Meta Refresh Test', suggestion: 'Replace meta refresh with proper server-side 301 redirects.', howToFix: SEO_INSTRUCTIONS.meta_refresh },
    { id: 'nofollow', category: 'Indexing', title: 'Nofollow Tag Test', suggestion: 'Use nofollow for untrusted outbound links.', howToFix: SEO_INSTRUCTIONS.nofollow },

    // ── Performance ──────────────────────────────────────────────────────────
    { id: 'speed', category: 'Performance', title: 'Site Loading Speed Test', suggestion: 'Optimize assets to load under 2.5s.', howToFix: SEO_INSTRUCTIONS.speed },
    { id: 'lcp', category: 'Performance', title: 'Largest Contentful Paint Test', suggestion: 'Optimize the largest element to load below 2.5s.', howToFix: SEO_INSTRUCTIONS.lcp },
    { id: 'cls', category: 'Performance', title: 'Cumulative Layout Shift Test', suggestion: 'Specify dimensions for media to prevent layout shifts.', howToFix: SEO_INSTRUCTIONS.cls },
    { id: 'inp', category: 'Performance', title: 'Interaction to Next Paint (INP)', suggestion: 'Reduce JS execution time to keep INP under 200ms.', howToFix: SEO_INSTRUCTIONS.inp },
    { id: 'gzip', category: 'Performance', title: 'HTML Compression/GZIP Test', suggestion: 'Enable GZIP or Brotli compression to reduce transfer size.', howToFix: SEO_INSTRUCTIONS.gzip },
    { id: 'page_cache', category: 'Performance', title: 'Page Cache (Server Side) Test', suggestion: 'Use server-side caching to serve pre-built HTML pages.', howToFix: SEO_INSTRUCTIONS.page_cache },
    { id: 'cdn_usage', category: 'Performance', title: 'CDN Usage Test', suggestion: 'Use a CDN to serve assets from edge locations.', howToFix: SEO_INSTRUCTIONS.cdn_usage },
    { id: 'render_blocking', category: 'Performance', title: 'Render Blocking Resources Test', suggestion: 'Defer/async non-critical scripts and preload critical CSS.', howToFix: SEO_INSTRUCTIONS.render_blocking },
    { id: 'js_execution', category: 'Performance', title: 'JS Execution Time Test', suggestion: 'Defer non-critical JS and code-split large bundles.', howToFix: SEO_INSTRUCTIONS.js_execution },
    { id: 'page_objects', category: 'Performance', title: 'Page Objects Test', suggestion: 'Minimize total HTTP requests by bundling assets.', howToFix: SEO_INSTRUCTIONS.page_objects },
    { id: 'img_caching', category: 'Performance', title: 'Image Caching Test', suggestion: 'Set long cache TTL for images.', howToFix: SEO_INSTRUCTIONS.img_caching },
    { id: 'js_caching', category: 'Performance', title: 'JavaScript Caching Test', suggestion: 'Set long cache TTL for JS files.', howToFix: SEO_INSTRUCTIONS.js_caching },
    { id: 'css_caching', category: 'Performance', title: 'CSS Caching Test', suggestion: 'Set long cache TTL for CSS files.', howToFix: SEO_INSTRUCTIONS.css_caching },

    // ── Code Quality ──────────────────────────────────────────────────────────
    { id: 'html_size', category: 'Code', title: 'HTML Page Size Test', suggestion: 'Keep total HTML size under 100KB.', howToFix: SEO_INSTRUCTIONS.html_size },
    { id: 'dom_size', category: 'Code', title: 'DOM Size Test', suggestion: 'Reduce DOM elements below 1500 nodes.', howToFix: SEO_INSTRUCTIONS.dom_size },
    { id: 'inline_css', category: 'Code', title: 'Inline CSS Test', suggestion: 'Move inline CSS to external stylesheets.', howToFix: SEO_INSTRUCTIONS.inline_css },
    { id: 'deprecated_html', category: 'Code', title: 'Deprecated HTML Tags Test', suggestion: 'Remove older tags like <font> or <center>.', howToFix: SEO_INSTRUCTIONS.deprecated_html },
    { id: 'css_minification', category: 'Code', title: 'CSS Minification Test', suggestion: 'Minify CSS files to reduce size.', howToFix: SEO_INSTRUCTIONS.css_minification },
    { id: 'js_minification', category: 'Code', title: 'JavaScript Minification Test', suggestion: 'Minify JS files to reduce size.', howToFix: SEO_INSTRUCTIONS.js_minification },
    { id: 'charset_declaration', category: 'Code', title: 'Charset Declaration Test', suggestion: 'Add <meta charset="UTF-8"> as the first tag in <head>.', howToFix: SEO_INSTRUCTIONS.charset_declaration },
    { id: 'doctype', category: 'Code', title: 'Doctype Test', suggestion: 'Ensure HTML starts with <!DOCTYPE html>.', howToFix: SEO_INSTRUCTIONS.doctype },
    { id: 'nested_tables', category: 'Code', title: 'Nested Tables Test', suggestion: 'Replace table-based layouts with CSS Flexbox or Grid.', howToFix: SEO_INSTRUCTIONS.nested_tables },
    { id: 'frameset', category: 'Code', title: 'Frameset Test', suggestion: 'Remove framesets—use iframes or modern alternatives.', howToFix: SEO_INSTRUCTIONS.frameset },
    { id: 'flash_test', category: 'Code', title: 'Flash Test', suggestion: 'Remove all Flash content—deprecated and unsupported.', howToFix: SEO_INSTRUCTIONS.flash_test },
    { id: 'js_error', category: 'Code', title: 'JS Error Test', suggestion: 'Fix JavaScript errors that break functionality.', howToFix: SEO_INSTRUCTIONS.js_error },
    { id: 'console_errors', category: 'Code', title: 'Console Errors Test', suggestion: 'Resolve browser console errors and 404 resource failures.', howToFix: SEO_INSTRUCTIONS.console_errors },

    // ── Media ─────────────────────────────────────────────────────────────────
    { id: 'alt_tags', category: 'Media', title: 'Image Alt Test', suggestion: 'Add descriptive ALT text to all images.', howToFix: SEO_INSTRUCTIONS.alt_tags },
    { id: 'responsive_img', category: 'Media', title: 'Responsive Image Test', suggestion: 'Serve appropriately sized images using srcset.', howToFix: SEO_INSTRUCTIONS.responsive_img },
    { id: 'modern_img', category: 'Media', title: 'Modern Image Format Test', suggestion: 'Use WebP or AVIF for better compression.', howToFix: SEO_INSTRUCTIONS.modern_img },
    { id: 'img_alt_check', category: 'Media', title: 'Detailed Image Alt Audit', suggestion: 'All images must have valid alt attributes.', howToFix: SEO_INSTRUCTIONS.img_alt_check },
    { id: 'image_aspect', category: 'Media', title: 'Image Aspect Ratio Test', suggestion: 'Set explicit width/height on images to avoid CLS.', howToFix: SEO_INSTRUCTIONS.image_aspect },
    { id: 'image_metadata', category: 'Media', title: 'Image Metadata Test', suggestion: 'Use meaningful filenames for images for image SEO.', howToFix: SEO_INSTRUCTIONS.image_metadata },
    { id: 'image_caching', category: 'Media', title: 'Image Caching Headers Test', suggestion: 'Set far-future cache expiry headers for images.', howToFix: SEO_INSTRUCTIONS.image_caching },

    // ── Mobile ────────────────────────────────────────────────────────────────
    { id: 'viewport', category: 'Mobile', title: 'Meta Viewport Test', suggestion: 'Add a proper viewport meta tag for mobile rendering.', howToFix: SEO_INSTRUCTIONS.viewport },
    { id: 'media_query', category: 'Mobile', title: 'Media Query Responsive Test', suggestion: 'Use CSS media queries for responsive design.', howToFix: SEO_INSTRUCTIONS.media_query },
    { id: 'mobile_snapshot', category: 'Mobile', title: 'Mobile Snapshot Test', suggestion: 'Test layout on mobile devices using DevTools.', howToFix: SEO_INSTRUCTIONS.mobile_snapshot },

    // ── Security ──────────────────────────────────────────────────────────────
    { id: 'https', category: 'Security', title: 'SSL Checker & HTTPS Test', suggestion: 'Serve all content over HTTPS with a valid certificate.', howToFix: SEO_INSTRUCTIONS.https },
    { id: 'mixed_content', category: 'Security', title: 'Mixed Content Test (HTTP over HTTPS)', suggestion: 'Ensure all resources load over HTTPS.', howToFix: SEO_INSTRUCTIONS.mixed_content },
    { id: 'http2', category: 'Security', title: 'HTTP2 Test', suggestion: 'Serve content over HTTP/2 for multiplexed connections.', howToFix: SEO_INSTRUCTIONS.http2 },
    { id: 'hsts', category: 'Security', title: 'HSTS Test', suggestion: 'Add Strict-Transport-Security header to enforce HTTPS.', howToFix: SEO_INSTRUCTIONS.hsts },
    { id: 'safe_browsing', category: 'Security', title: 'Safe Browsing Test', suggestion: 'Ensure your site is not flagged by Google Safe Browsing.', howToFix: SEO_INSTRUCTIONS.safe_browsing },
    { id: 'server_signature', category: 'Security', title: 'Server Signature Test', suggestion: 'Disable server signature to hide technology stack.', howToFix: SEO_INSTRUCTIONS.server_signature },
    { id: 'directory_browsing', category: 'Security', title: 'Directory Browsing Test', suggestion: 'Disable directory listing on your web server.', howToFix: SEO_INSTRUCTIONS.directory_browsing },
    { id: 'plaintext_emails', category: 'Security', title: 'Plaintext Emails Test', suggestion: 'Obfuscate email addresses to prevent spam harvesting.', howToFix: SEO_INSTRUCTIONS.plaintext_emails },
    { id: 'unsafe_cross_origin', category: 'Security', title: 'Unsafe Cross-Origin Links Test', suggestion: 'Add rel="noopener noreferrer" to target="_blank" links.', howToFix: SEO_INSTRUCTIONS.unsafe_cross_origin },
    { id: 'spf_records', category: 'Security', title: 'SPF Records Test', suggestion: 'Add an SPF TXT record to your DNS to prevent email spoofing.', howToFix: SEO_INSTRUCTIONS.spf_records },
    { id: 'ads_txt', category: 'Security', title: 'Ads.txt Validation Test', suggestion: 'Create an /ads.txt file to authorize your ad network.', howToFix: SEO_INSTRUCTIONS.ads_txt },

    // ── Social ────────────────────────────────────────────────────────────────
    { id: 'og_tags', category: 'Social', title: 'Social Media Meta Tags Test (OG)', suggestion: 'Add Open Graph meta tags for social sharing.', howToFix: SEO_INSTRUCTIONS.og_tags },
    { id: 'twitter_card', category: 'Social', title: 'Twitter Card Test', suggestion: 'Add Twitter card meta tags for better X.com previews.', howToFix: SEO_INSTRUCTIONS.twitter_card },
    { id: 'social_meta', category: 'Social', title: 'Social Media Test', suggestion: 'Ensure og:image is 1200x630px for optimal previews.', howToFix: SEO_INSTRUCTIONS.social_meta },
    { id: 'social_media_preview', category: 'Social', title: 'Google Search Results Preview', suggestion: 'Ensure title + description display correctly in SERPs.', howToFix: SEO_INSTRUCTIONS.social_media_preview },

    // ── Analytics & Structure ─────────────────────────────────────────────────
    { id: 'analytics', category: 'Analytics', title: 'Google Analytics Test', suggestion: 'Connect Google Analytics to track visitors.', howToFix: SEO_INSTRUCTIONS.analytics },
    { id: 'structured_data', category: 'Structure', title: 'Structured Data Test', suggestion: 'Add JSON-LD structured data for rich results.', howToFix: SEO_INSTRUCTIONS.structured_data },
    { id: 'favicon', category: 'Structure', title: 'Favicon Test', suggestion: 'Provide a valid favicon.', howToFix: SEO_INSTRUCTIONS.favicon },
    { id: 'error_404', category: 'Structure', title: 'Custom 404 Error Page Test', suggestion: 'Create a helpful custom 404 page.', howToFix: SEO_INSTRUCTIONS.error_404 },
    { id: 'friendly_url', category: 'Structure', title: 'SEO Friendly URL Test', suggestion: 'Use descriptive, keyword-rich URLs.', howToFix: SEO_INSTRUCTIONS.friendly_url },

    // ── Links ─────────────────────────────────────────────────────────────────
    { id: 'broken_links', category: 'Links', title: 'Backlinks Test', suggestion: 'Fix or remove any 404 links on the page.', howToFix: SEO_INSTRUCTIONS.broken_links },
    { id: 'competitors', category: 'Links', title: 'Competitor Domains Test', suggestion: 'Analyze competitors to identify keyword gaps.', howToFix: SEO_INSTRUCTIONS.competitors },
    { id: 'backlinks', category: 'Links', title: 'External Backlinks Test', suggestion: 'Build quality backlinks from authoritative sites.', howToFix: SEO_INSTRUCTIONS.backlinks },
];

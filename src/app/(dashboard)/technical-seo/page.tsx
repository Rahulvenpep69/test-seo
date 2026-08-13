'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWebsite } from '@/context/website-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Code2, MapPin, FileText, Gauge, RotateCcw,
    CheckCircle2, AlertTriangle, PlusCircle, Upload,
    RefreshCw, Layers, ExternalLink, Search, Loader2,
    ArrowRight, Info, Zap, ChevronRight, ChevronUp, Image as ImageIcon, Globe,
    Shield, Smartphone, Link2, BarChart3, Share2, Tag, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEO_INSTRUCTIONS } from '@/lib/seo/instructions';
import { EXHAUSTIVE_CHECKS } from '@/lib/seo/checks';
import { generateTechnicalSeoPdf } from '@/lib/seo/reports';
import { isValidCrawlableUrl } from '@/lib/seo/crawler';
import { Download, FileDown } from 'lucide-react';

const tabs = [
    { id: 'all', label: 'All Pages', icon: Globe },
    { id: 'schema', label: 'Schema', icon: Code2 },
    { id: 'sitemap', label: 'Sitemap', icon: MapPin },
    { id: 'robots', label: 'Robots.txt', icon: FileText },
    { id: 'speed', label: 'Speed', icon: Gauge },
    { id: 'redirects', label: 'Broken Links', icon: RotateCcw },
];

// Category filter options for the checks view
const CATEGORY_FILTERS = [
    { id: 'all', label: 'All Checks', icon: Filter },
    { id: 'Content', label: 'Content', icon: FileText },
    { id: 'Indexing', label: 'Indexing', icon: Search },
    { id: 'Performance', label: 'Performance', icon: Gauge },
    { id: 'Security', label: 'Security', icon: Shield },
    { id: 'Mobile', label: 'Mobile', icon: Smartphone },
    { id: 'Code', label: 'Code', icon: Code2 },
    { id: 'Media', label: 'Media', icon: ImageIcon },
    { id: 'Social', label: 'Social', icon: Share2 },
    { id: 'Links', label: 'Links', icon: Link2 },
    { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'Structure', label: 'Structure', icon: Layers },
];

function CheckCard({ check, analysisResult }: { check: any; analysisResult: any }) {
    const [showFix, setShowFix] = useState(false);
    const [showList, setShowList] = useState(false);

    const status = analysisResult.results?.[check.id] || 'pending';

    // Helper to get raw value if it exists in technical or stats
    let displayValue = 'Analyzed';
    let detailsList: any[] = [];

    if (check.id === 'meta_title') displayValue = analysisResult.technical?.title || 'Missing';
    if (check.id === 'meta_desc') displayValue = analysisResult.technical?.metaDescription || 'Missing';
    if (check.id === 'h1_tags') {
        displayValue = (analysisResult.technical?.h1Count || 0) + ' found';
        detailsList = analysisResult.technical?.h1Details || [];
    }
    if (check.id === 'h2_tags') {
        detailsList = analysisResult.technical?.h2Details || [];
    }
    if (check.id === 'alt_tags' || check.id === 'img_alt_check') {
        displayValue = (analysisResult.technical?.imagesWithoutAlt || 0) + ' missing alt tags';
        detailsList = analysisResult.technical?.imagesWithoutAltDetails || [];
    }
    if (check.id === 'speed') displayValue = `${Math.round(analysisResult.stats?.performance?.performanceScore || 0)}/100`;
    if (check.id === 'html_size') {
        const kb = analysisResult.technical?.htmlSize ? (analysisResult.technical.htmlSize / 1024).toFixed(1) : '?';
        displayValue = `${kb} KB`;
    }
    if (check.id === 'broken_links') {
        displayValue = `${analysisResult.stats?.brokenLinks || 0} broken found`;
        detailsList = (analysisResult.stats?.brokenDetails || []).map((b: any) => `${b.url} (${b.status})`);
    }
    if (check.id === 'google_index') displayValue = analysisResult.stats?.authority?.indexed ? 'Indexed' : 'Not Indexed';
    if (check.id === 'inline_css') detailsList = analysisResult.technical?.inlineCssDetails || [];
    if (check.id === 'deprecated_html') detailsList = analysisResult.technical?.deprecatedTagsDetails || [];

    // New checks
    if (check.id === 'dom_size') displayValue = `${analysisResult.technical?.domElementCount || 0} elements`;
    if (check.id === 'viewport') displayValue = analysisResult.technical?.hasViewport ? (analysisResult.technical?.viewportContent || 'Set') : 'Missing';
    if (check.id === 'og_tags') {
        const has = analysisResult.technical;
        displayValue = [has?.hasOgTitle && 'og:title', has?.hasOgDesc && 'og:description', has?.hasOgImage && 'og:image']
            .filter(Boolean).join(', ') || 'None found';
    }
    if (check.id === 'twitter_card') displayValue = analysisResult.technical?.hasTwitterCard ? 'Found' : 'Missing';
    if (check.id === 'https') displayValue = analysisResult.results?.https === 'pass' ? 'Secure (HTTPS)' : 'Not Secure (HTTP)';
    if (check.id === 'charset_declaration') displayValue = analysisResult.technical?.charset || (analysisResult.technical?.hasCharset ? 'Set' : 'Missing');
    if (check.id === 'doctype') displayValue = analysisResult.technical?.hasDoctype ? 'HTML5' : 'Missing';
    if (check.id === 'lang_attr') displayValue = analysisResult.technical?.language || 'Missing';
    if (check.id === 'render_blocking') displayValue = `${analysisResult.technical?.renderBlockingScriptsCount || 0} blocking scripts`;
    if (check.id === 'image_aspect') displayValue = `${analysisResult.technical?.imagesWithoutDimensions || 0} images without dimensions`;
    if (check.id === 'lcp') displayValue = analysisResult.stats?.performance?.largestContentfulPaint || 'N/A';
    if (check.id === 'cls') displayValue = analysisResult.stats?.performance?.cumulativeLayoutShift || 'N/A';
    if (check.id === 'plaintext_emails') {
        detailsList = analysisResult.technical?.plaintextEmails || [];
        displayValue = detailsList.length > 0 ? `${detailsList.length} email(s) exposed` : 'None found';
    }
    if (check.id === 'unsafe_cross_origin') displayValue = `${analysisResult.technical?.unsafeCrossOriginCount || 0} unsafe links`;
    if (check.id === 'media_query') displayValue = `${analysisResult.technical?.mediaQueryCount || 0} media queries`;
    if (check.id === 'noindex_tag') displayValue = analysisResult.technical?.hasNoindex ? 'Noindex found' : 'Page is indexable';
    if (check.id === 'canonical_tag') displayValue = analysisResult.technical?.canonical || (analysisResult.technical?.hasCanonicalTag ? 'Set' : 'Missing');

    return (
        <div className="glass-card p-5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        {status === 'critical' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> :
                            status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> :
                                status === 'pass' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : null}
                        <span className="text-sm font-semibold">{check.title}</span>
                    </div>
                </div>
                <span className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                    status === 'pass' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                        status === 'critical' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                )}>
                    {status}
                </span>
            </div>

            <p className="text-[13px] text-muted-foreground mb-4">{check.suggestion}</p>

            {(detailsList.length > 0 || status !== 'pass') && (
                <div className="flex items-center gap-2 pt-1">
                    {detailsList.length > 0 && status !== 'pass' && (
                        <button
                            onClick={() => setShowList(!showList)}
                            className="bg-transparent hover:bg-white/5 text-brand-400 text-xs py-1.5 px-3 rounded-md flex items-center gap-1.5 transition-colors border border-brand-500/30"
                        >
                            <span className="font-medium text-[11px] uppercase tracking-wide">
                                {showList ? 'Hide list' : 'See full list'}
                            </span>
                            {showList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    {status !== 'pass' && (
                        <button
                            onClick={() => setShowFix(!showFix)}
                            className="bg-transparent hover:bg-white/5 text-zinc-300 text-xs py-1.5 px-3 rounded-md flex items-center gap-1.5 transition-colors border border-white/10"
                        >
                            <Info className="w-3.5 h-3.5" />
                            <span className="font-medium text-[11px] uppercase tracking-wide">How to fix</span>
                        </button>
                    )}
                </div>
            )}

            <AnimatePresence>
                {showList && detailsList.length > 0 && status !== 'pass' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 p-4 rounded-lg bg-black/40 border border-white/5 max-h-[300px] overflow-y-auto custom-scroll">
                            <ul className="list-disc pl-4 space-y-1.5 max-w-full">
                                {detailsList.map((item: string, i: number) => (
                                    <li key={i} className="text-xs text-zinc-400 break-all font-mono leading-relaxed">{item}</li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFix && status !== 'pass' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 px-5 py-4 rounded-lg bg-brand-500/10 border border-brand-500/20">
                            <div className="flex items-start gap-3">
                                <Zap className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-brand-400 mb-2 tracking-wider">Fix Instructions</p>
                                    <p className="text-[13px] text-zinc-300 leading-relaxed font-medium">{check.howToFix}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DashboardContent() {
    const { activeWebsite, analysisResult, isAnalyzing, runAnalysis } = useWebsite();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Set all as default tab
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
    const [url, setUrl] = useState('');
    const [crawlLimit, setCrawlLimit] = useState(0); // 0 = Unlimited crawl (all pages)
    const [crawlData, setCrawlData] = useState<Record<string, any>>({}); // Persistent storage of all page results
    const [selectedPage, setSelectedPage] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isFetchingPosts, setIsFetchingPosts] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [crawlProgress, setCrawlProgress] = useState<{
        totalDiscovered: number;
        crawled: number;
        yetToCrawl: number;
        failed: number;
        progressPercent: number;
        currentUrl: string;
        isComplete: boolean;
        isCrawling: boolean;
    }>({
        totalDiscovered: 0,
        crawled: 0,
        yetToCrawl: 0,
        failed: 0,
        progressPercent: 0,
        currentUrl: '',
        isComplete: false,
        isCrawling: false,
    });
    const [streamDiscoveredUrls, setStreamDiscoveredUrls] = useState<string[]>([]);

    const queryUrl = searchParams.get('url');

    // Sync activeTab with URL param
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tabs.some(t => t.id === tab)) {
            setActiveTab(tab);
        } else if (!tab) {
            setActiveTab('all'); // Default to all if no tab param
        }
    }, [searchParams]);

    // Update URL param when activeTab changes
    useEffect(() => {
        const currentTab = searchParams.get('tab');
        if (activeTab !== currentTab) {
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.set('tab', activeTab);
            router.replace(`?${newSearchParams.toString()}`);
        }
    }, [activeTab, searchParams, router]);

    // When active website changes in context, update url
    useEffect(() => {
        const resolveUrl = () => {
            if (queryUrl) return queryUrl;
            if (activeWebsite) return activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;
            return '';
        };
        const newUrl = resolveUrl();
        if (newUrl) setUrl(newUrl);
    }, [activeWebsite?.id, queryUrl]);

    const [isPageAnalyzing, setIsPageAnalyzing] = useState(false);
    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [localAnalysisResult, setLocalAnalysisResult] = useState<any>(null);

    async function loadLatestReport(websiteId: string, websiteUrl: string) {
        setIsReportsLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch(`/api/reports?websiteId=${websiteId}`);
            if (res.ok) {
                const reports = await res.json();
                // Find the latest report that has crawledPages > 1
                const latestCrawlReport = reports.find((r: any) => r.crawledPages > 1);

                if (latestCrawlReport && latestCrawlReport.fullResults) {
                    const parsed = typeof latestCrawlReport.fullResults === 'string'
                        ? JSON.parse(latestCrawlReport.fullResults)
                        : latestCrawlReport.fullResults;

                    if (parsed && Object.keys(parsed).length > 0) {
                        // Check if parsed is the wrapper response object or direct results
                        const isWrapper = parsed.results && !Object.keys(parsed).some(k => k.startsWith('http://') || k.startsWith('https://'));
                        const actualResults = isWrapper ? parsed.results : parsed;

                        // Populate crawlData
                        setCrawlData(actualResults);

                        const firstUrl = Object.keys(actualResults)[0];
                        setSelectedPage(firstUrl);
                        const resolvedSiteStats = latestCrawlReport.site_stats || parsed.site_stats || {
                            robots: actualResults[firstUrl]?.stats?.robots || parsed.site_stats?.robots,
                            sitemap: actualResults[firstUrl]?.stats?.sitemap || parsed.site_stats?.sitemap
                        };
                        setLocalAnalysisResult({
                            ...actualResults[firstUrl],
                            isCrawl: true,
                            allResults: actualResults,
                            site_stats: resolvedSiteStats,
                            stats: {
                                ...(actualResults[firstUrl]?.stats || {}),
                                robots: resolvedSiteStats.robots || actualResults[firstUrl]?.stats?.robots,
                                sitemap: resolvedSiteStats.sitemap || actualResults[firstUrl]?.stats?.sitemap
                            },
                            currentPage: firstUrl
                        });
                        setIsReportsLoading(false);
                        return true;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load latest crawl report:', e);
        }
        setIsReportsLoading(false);
        return false;
    }

    useEffect(() => {
        let isMounted = true;
        async function init() {
            if (queryUrl) {
                setUrl(queryUrl);
                handleCrawlUrl(queryUrl);
            } else if (activeWebsite) {
                const websiteUrl = activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;
                setUrl(websiteUrl);

                const loaded = await loadLatestReport(activeWebsite.id, websiteUrl);
                if (!loaded && isMounted) {
                    // No existing crawl report, run a fresh crawl
                    handleCrawlUrl(websiteUrl);
                }
            }
        }
        init();
        return () => { isMounted = false; };
    }, [queryUrl, activeWebsite?.id]);

    useEffect(() => {
        if (selectedPage && (!localAnalysisResult?.results || Object.keys(localAnalysisResult.results).length === 0) && !isPageAnalyzing) {
            handleAnalyze(selectedPage);
        }
    }, [selectedPage]);

    async function parseApiResponse(res: Response) {
        const text = await res.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Website or API server returned invalid response (${res.status}). Please check that the URL is active and accessible.`);
        }
        if (!res.ok && data?.error) {
            throw new Error(data.error);
        }
        return data;
    }

    async function handleAnalyze(targetUrl?: string) {
        const urlToAnalyze = targetUrl || url;
        if (!urlToAnalyze) return;

        setIsPageAnalyzing(true);
        setErrorMsg(null);

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlToAnalyze }),
            });
            const data = await parseApiResponse(res);

            if (data.error) {
                if (!targetUrl || targetUrl === url) {
                    setErrorMsg(data.error);
                } else {
                    console.warn(`[handleAnalyze] Page analysis warning for subpage ${targetUrl}:`, data.error);
                }
                return;
            }

            const pageResult = {
                results: data.results,
                technical: data.technical,
                structuredData: data.structuredData,
                stats: data.stats,
                overallScore: data.overallScore,
                criticalCount: data.criticalCount,
                warningCount: data.warningCount,
                passCount: data.passCount,
                score: data.overallScore,
            };

            // Update crawlData with the deep-analyzed page result
            setCrawlData(prev => ({ ...prev, [urlToAnalyze]: pageResult }));

            // Preserve crawl context if we are already in a crawl session
            setLocalAnalysisResult((prev: any) => ({
                ...pageResult,
                isCrawl: prev?.isCrawl || false,
                allResults: prev?.allResults || {},
                site_stats: prev?.site_stats,
                stats: {
                    ...(pageResult.stats || {}),
                    robots: prev?.site_stats?.robots || pageResult.stats?.robots,
                    sitemap: prev?.site_stats?.sitemap || pageResult.stats?.sitemap
                },
                currentPage: urlToAnalyze
            }));

            if (!targetUrl) setSelectedPage(urlToAnalyze);
        } catch (error: any) {
            console.error('Analysis failed', error);
            setErrorMsg(error?.message || 'Failed to analyze the website.');
        } finally {
            setIsPageAnalyzing(false);
        }
    }

    async function handleCrawlUrl(targetUrl?: string) {
        const crawlUrl = targetUrl || url;
        if (!crawlUrl) return;

        setErrorMsg(null);
        setCrawlProgress({
            totalDiscovered: 0,
            crawled: 0,
            yetToCrawl: 0,
            failed: 0,
            progressPercent: 0,
            currentUrl: crawlUrl,
            isComplete: false,
            isCrawling: true,
        });

        try {
            const res = await fetch('/api/crawl/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: crawlUrl, limit: 0 }),
            });

            if (!res.ok) {
                // Fallback to standard crawl POST route
                const fallbackRes = await fetch('/api/crawl', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: crawlUrl, limit: 0, websiteId: activeWebsite?.id }),
                });
                const data = await parseApiResponse(fallbackRes);
                const resultsCount = Object.keys(data.results || {}).length;
                const firstUrl = Object.keys(data.results || {})[0];
                setCrawlData(data.results || {});
                if (firstUrl) {
                    setSelectedPage(firstUrl);
                    setLocalAnalysisResult({
                        ...data.results[firstUrl],
                        isCrawl: true,
                        allResults: data.results,
                        site_stats: data.site_stats,
                        currentPage: firstUrl
                    });
                }
                setCrawlProgress({
                    totalDiscovered: resultsCount,
                    crawled: resultsCount,
                    yetToCrawl: 0,
                    failed: 0,
                    progressPercent: 100,
                    currentUrl: '',
                    isComplete: true,
                    isCrawling: false,
                });
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) return;

            const decoder = new TextDecoder();
            let accumulatedResults: Record<string, any> = {};
            let firstUrlSet = false;

            const updateAnalysisState = (resultsObj: Record<string, any>) => {
                const keys = Object.keys(resultsObj);
                if (keys.length === 0) return;
                const firstKey = keys[0];
                const targetKey = selectedPage && resultsObj[selectedPage] ? selectedPage : firstKey;
                setSelectedPage(targetKey);
                setLocalAnalysisResult({
                    ...resultsObj[targetKey],
                    isCrawl: true,
                    allResults: resultsObj,
                    currentPage: targetKey
                });
            };

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                for (const rawEvent of events) {
                    if (!rawEvent.trim()) continue;
                    const lines = rawEvent.split('\n');
                    let eventType = 'message';
                    let dataStr = '';

                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            eventType = line.slice(6).trim();
                        } else if (line.startsWith('data:')) {
                            dataStr += line.slice(5).trim();
                        }
                    }

                    if (dataStr) {
                        try {
                            const data = JSON.parse(dataStr);

                            if (eventType === 'progress' || data.totalDiscovered !== undefined) {
                                if (data.discoveredUrls && Array.isArray(data.discoveredUrls)) {
                                    setStreamDiscoveredUrls(data.discoveredUrls);
                                }
                                setCrawlProgress(prev => ({
                                    totalDiscovered: data.totalDiscovered !== undefined ? data.totalDiscovered : prev.totalDiscovered,
                                    crawled: data.crawled !== undefined ? data.crawled : prev.crawled,
                                    yetToCrawl: data.yetToCrawl !== undefined ? data.yetToCrawl : prev.yetToCrawl,
                                    failed: data.failed !== undefined ? data.failed : prev.failed,
                                    progressPercent: data.progressPercent !== undefined ? data.progressPercent : prev.progressPercent,
                                    currentUrl: data.currentUrl || prev.currentUrl,
                                    isComplete: !!data.isComplete,
                                    isCrawling: !data.isComplete,
                                }));

                                if (data.latestResult?.url) {
                                    const pageUrl = data.latestResult.url;
                                    accumulatedResults[pageUrl] = data.latestResult;
                                    setCrawlData(prev => ({ ...prev, [pageUrl]: data.latestResult }));
                                    updateAnalysisState(accumulatedResults);
                                }
                            }

                            if (eventType === 'complete' || data.isComplete) {
                                const finalCrawledCount = data.crawled !== undefined ? data.crawled : Math.max(Object.keys(accumulatedResults).length, 1);
                                setCrawlProgress(prev => ({
                                    ...prev,
                                    crawled: finalCrawledCount,
                                    totalDiscovered: data.totalDiscovered !== undefined ? data.totalDiscovered : Math.max(prev.totalDiscovered, finalCrawledCount),
                                    isComplete: true,
                                    isCrawling: false,
                                    progressPercent: 100,
                                    yetToCrawl: 0,
                                }));
                                updateAnalysisState(accumulatedResults);
                            }
                        } catch (e) {}
                    }
                }
            }

            setCrawlProgress(prev => ({
                ...prev,
                crawled: Math.max(prev.crawled, Object.keys(accumulatedResults).length),
                totalDiscovered: Math.max(prev.totalDiscovered, Object.keys(accumulatedResults).length),
                isComplete: true,
                isCrawling: false,
                progressPercent: 100,
                yetToCrawl: 0,
            }));
            updateAnalysisState(accumulatedResults);
        } catch (error: any) {
            console.error('Crawl stream failed', error);
            setErrorMsg(error?.message || 'Crawl failed. Please check connection and try again.');
            setCrawlProgress(prev => ({ ...prev, isCrawling: false }));
        }
    }

    async function handleCrawl() {
        handleCrawlUrl(url);
    }

    // Use local result if available, otherwise context
    const currentAnalysis = localAnalysisResult || analysisResult;
    const isGlobalAnalyzing = isAnalyzing || isPageAnalyzing || isReportsLoading;



    return (
        <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="space-y-1 shrink-0">
                    <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white bg-gradient-to-r from-white to-white/60 bg-clip-text">
                        Technical SEO Audit
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                        Deep site-wide crawl, internal links & technical health report
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                    <div className="relative flex-1 min-w-[220px] group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Enter website URL (e.g. sanbrix.com)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all h-[46px]"
                        />
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 px-3 h-[46px] rounded-xl text-xs font-semibold shrink-0">
                        <Globe className="w-3.5 h-3.5 text-brand-400" />
                        <span>All Pages (Unlimited)</span>
                    </div>

                    <button
                        onClick={() => handleCrawl()}
                        disabled={isGlobalAnalyzing || !url}
                        className="relative overflow-hidden group h-[46px] px-5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:bg-white/10 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0"
                    >
                        {isGlobalAnalyzing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Crawling...</span>
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Analyze Website</span>
                            </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:animate-shimmer" />
                    </button>

                    {currentAnalysis && (
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => {
                                    const targetUrl = selectedPage || url;
                                    if (targetUrl) {
                                        window.open(`/report?url=${encodeURIComponent(targetUrl)}`, '_blank');
                                    }
                                }}
                                className="h-[46px] px-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 text-brand-400 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span className="hidden sm:inline">View Report</span>
                            </button>
                            <button
                                onClick={() => {
                                    const targetUrl = selectedPage || url;
                                    if (targetUrl) {
                                        if (currentAnalysis) {
                                            generateTechnicalSeoPdf(targetUrl, currentAnalysis);
                                        } else {
                                            window.open(`/report?url=${encodeURIComponent(targetUrl)}`, '_blank');
                                        }
                                    }
                                }}
                                className="h-[46px] px-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                            >
                                <FileDown className="w-4 h-4 text-brand-400" />
                                <span className="hidden sm:inline">Download PDF</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Real-time Crawl Progress & Completion Banner */}
            {(crawlProgress.isCrawling || crawlProgress.isComplete || crawlProgress.totalDiscovered > 0) && (
                <div className={cn(
                    "p-5 rounded-2xl border transition-all duration-300 shadow-xl space-y-4 animate-fade-in",
                    crawlProgress.isCrawling
                        ? "bg-brand-500/10 border-brand-500/30"
                        : "bg-emerald-500/10 border-emerald-500/30"
                )}>
                    {/* Header Title */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-3 h-3 rounded-full",
                                crawlProgress.isCrawling ? "bg-brand-400 animate-ping" : "bg-emerald-400"
                            )} />
                            <h3 className="text-base font-semibold text-foreground">
                                {crawlProgress.isCrawling ? "Crawling Website in Real Time..." : "Crawling Completed"}
                            </h3>
                        </div>
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white/10 text-white border border-white/10">
                            {crawlProgress.progressPercent}% Completed
                        </span>
                    </div>

                    {/* Visual Animated Progress Bar */}
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden relative p-0.5">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
                                crawlProgress.isCrawling
                                    ? "from-brand-500 via-indigo-500 to-emerald-400 animate-pulse"
                                    : "from-emerald-500 to-teal-400"
                            )}
                            style={{ width: `${Math.max(5, crawlProgress.progressPercent)}%` }}
                        />
                    </div>

                    {/* Real-time Counters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-xs text-muted-foreground font-medium mb-1">Total Pages</div>
                            <div className="text-xl font-bold text-foreground font-mono">{crawlProgress.totalDiscovered.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="text-xs text-emerald-400 font-medium mb-1">Crawled</div>
                            <div className="text-xl font-bold text-emerald-400 font-mono">{crawlProgress.crawled.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <div className="text-xs text-amber-400 font-medium mb-1">Yet to Crawl</div>
                            <div className="text-xl font-bold text-amber-400 font-mono">{crawlProgress.yetToCrawl.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <div className="text-xs text-rose-400 font-medium mb-1">Failed</div>
                            <div className="text-xl font-bold text-rose-400 font-mono">{crawlProgress.failed.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Active URL / Summary Text */}
                    <div className="text-xs text-muted-foreground truncate font-mono pt-1">
                        {crawlProgress.isCrawling ? (
                            <span><strong className="text-brand-400">Active URL:</strong> {crawlProgress.currentUrl}</span>
                        ) : (
                            <span className="text-emerald-400 font-semibold">
                                Crawling Completed – {crawlProgress.totalDiscovered.toLocaleString()} pages discovered, {crawlProgress.crawled.toLocaleString()} crawled, {crawlProgress.failed.toLocaleString()} failed, {crawlProgress.yetToCrawl.toLocaleString()} remaining/skipped.
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {errorMsg ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in flex items-start gap-4 shadow-xl">
                    <div className="bg-red-500/20 p-2 rounded-lg shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-red-400 font-semibold mb-1">Scan Blocked or Failed</h4>
                        <p className="text-red-400/80 text-sm leading-relaxed">{errorMsg}</p>
                    </div>
                </div>
            ) : (!isGlobalAnalyzing && !currentAnalysis && url && !crawlProgress.isCrawling && (
                <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm animate-fade-in flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    Enter a URL and click Analyze to start the audit.
                </div>
            ))}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/8 w-fit overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                                activeTab === tab.id
                                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {!currentAnalysis && !isGlobalAnalyzing && (
                <div className="glass-card p-12 text-center">
                    <div className="bg-brand-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-brand-400" />
                    </div>
                    <h3 className="text-xl font-semibold">Ready to Audit</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        Enter a website URL above to perform a real-time technical SEO analysis.
                    </p>
                </div>
            )}

            {isGlobalAnalyzing && (
                <div className="glass-card p-12 text-center">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">Analyzing Site...</h3>
                    <p className="text-muted-foreground">Checking structured data, performance, and links</p>
                </div>
            )}

            {currentAnalysis && (
                <div className="space-y-6">
                    {activeTab === 'all' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-4">
                                <h3 className="font-semibold px-2">Discovered Pages</h3>
                                <div className="glass-card overflow-hidden divide-y divide-white/8">
                                    <div className="max-h-[600px] overflow-y-auto custom-scroll">
                                         {(() => {
                                             const normalizeCanonicalUrl = (uStr: string): string => {
                                                 if (!uStr) return '';
                                                 try {
                                                     const u = new URL(uStr.startsWith('http') ? uStr : `https://${uStr}`);
                                                     const host = u.hostname.replace(/^www\./, '').toLowerCase();
                                                     const path = u.pathname.replace(/\/+$/, '') || '/';
                                                     return `https://${host}${u.port ? ':' + u.port : ''}${path}`;
                                                 } catch {
                                                     return uStr;
                                                 }
                                             };

                                             const rootTargetNorm = normalizeCanonicalUrl(url || '');

                                             const rawPages = Array.from(new Set([
                                                 ...(url ? [url] : []),
                                                 ...streamDiscoveredUrls,
                                                 ...Object.keys(crawlData || {}),
                                                 ...Object.keys(currentAnalysis.allResults || {}),
                                                 ...(currentAnalysis.stats?.discoveredUrls || []),
                                             ])).filter(isValidCrawlableUrl);

                                             const canonicalSeen = new Set<string>();
                                             const uniquePages: string[] = [];

                                             for (const p of rawPages) {
                                                 const norm = normalizeCanonicalUrl(p);
                                                 if (!canonicalSeen.has(norm)) {
                                                     canonicalSeen.add(norm);
                                                     uniquePages.push(p);
                                                 }
                                             }

                                             const homePages: string[] = [];
                                             const subPages: string[] = [];

                                             for (const p of uniquePages) {
                                                 const norm = normalizeCanonicalUrl(p);
                                                 if (rootTargetNorm && norm === rootTargetNorm) {
                                                     homePages.push(p);
                                                 } else {
                                                     subPages.push(p);
                                                 }
                                             }

                                             const sortedPages = [...homePages, ...subPages];

                                             return (
                                                 <>
                                                     {/* Page count indicator */}
                                                     <div className="px-3 py-2 border-b border-white/8 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                                         {sortedPages.length.toLocaleString()} Pages Discovered
                                                     </div>
                                                     {sortedPages.map((p: string, i: number) => {
                                                         const pageData = crawlData[p] || currentAnalysis.allResults?.[p];
                                                         const pageScore = pageData?.overallScore !== undefined
                                                             ? pageData.overallScore
                                                             : pageData?.score !== undefined
                                                                 ? pageData.score
                                                                 : pageData?.status === 200
                                                                     ? (pageData.html?.includes('<title') ? 85 : 70)
                                                                     : pageData?.status >= 400 || pageData?.status === 0
                                                                         ? 0
                                                                         : 70;

                                                         return (
                                                             <button
                                                                 key={i}
                                                                 onClick={() => {
                                                                     setSelectedPage(p);
                                                                     if (pageData && pageData.results) {
                                                                         setLocalAnalysisResult({
                                                                             ...pageData,
                                                                             isCrawl: true,
                                                                             allResults: crawlData,
                                                                             site_stats: currentAnalysis.site_stats,
                                                                             currentPage: p
                                                                         });
                                                                     } else {
                                                                         handleAnalyze(p);
                                                                     }
                                                                 }}
                                                                 className={cn(
                                                                     "w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-white/5 flex items-center gap-2",
                                                                     selectedPage === p ? "bg-brand-500/5 text-brand-400 font-medium border-l-2 border-brand-500" : "text-muted-foreground border-l-2 border-transparent"
                                                                 )}
                                                             >
                                                                 <span className="flex-1 truncate min-w-0">{p}</span>
                                                                 <span className={cn(
                                                                     "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0",
                                                                     pageScore >= 80 ? "bg-green-500/20 text-green-400" :
                                                                         pageScore >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                                                                             "bg-red-500/20 text-red-400"
                                                                 )}>{pageScore}</span>
                                                             </button>
                                                         );
                                                     })}
                                                 </>
                                             );
                                         })()}

                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        Audit Details: <span className="text-brand-400 font-mono text-xs">{selectedPage}</span>
                                    </h3>
                                    <button
                                        onClick={() => selectedPage && handleAnalyze(selectedPage)}
                                        disabled={isGlobalAnalyzing} // isPageAnalyzing is now part of isAnalyzing from context
                                        className="btn-ghost py-1 text-[10px] flex items-center gap-1.5"
                                    >
                                        {isGlobalAnalyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-brand-400" />}
                                        Run Deep Audit
                                    </button>
                                </div>

                                {/* Summary Stats Bar */}
                                {currentAnalysis.results && Object.keys(currentAnalysis.results).length > 0 && (() => {
                                    const score = (currentAnalysis.overallScore !== undefined ? currentAnalysis.overallScore : currentAnalysis.score) !== undefined
                                        ? (currentAnalysis.overallScore ?? currentAnalysis.score)
                                        : (() => {
                                            const allStatuses = EXHAUSTIVE_CHECKS.map(c => currentAnalysis.results?.[c.id] || 'pending');
                                            const passCount = allStatuses.filter(s => s === 'pass').length;
                                            return Math.round((passCount / EXHAUSTIVE_CHECKS.length) * 100);
                                        })();

                                    const criticalCount = currentAnalysis.criticalCount !== undefined ? currentAnalysis.criticalCount :
                                        EXHAUSTIVE_CHECKS.map(c => currentAnalysis.results?.[c.id] || 'pending').filter(s => s === 'critical').length;

                                    const warningCount = currentAnalysis.warningCount !== undefined ? currentAnalysis.warningCount :
                                        EXHAUSTIVE_CHECKS.map(c => currentAnalysis.results?.[c.id] || 'pending').filter(s => s === 'warning').length;

                                    const passCount = currentAnalysis.passCount !== undefined ? currentAnalysis.passCount :
                                        EXHAUSTIVE_CHECKS.map(c => currentAnalysis.results?.[c.id] || 'pending').filter(s => s === 'pass').length;

                                    return (
                                        <div className="glass-card px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "text-2xl font-bold font-display w-14 h-14 rounded-full flex items-center justify-center border-2",
                                                    score >= 80 ? "text-green-400 border-green-500/40" :
                                                        score >= 50 ? "text-yellow-400 border-yellow-500/40" : "text-red-400 border-red-500/40"
                                                )}>{score}</div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">SEO Health Score</p>
                                                    <div className="w-32 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                                                        <div className={cn("h-full rounded-full", score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${score}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 ml-auto">
                                                {criticalCount > 0 && (
                                                    <div className="text-center px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                                        <p className="text-lg font-bold text-red-400">{criticalCount}</p>
                                                        <p className="text-[10px] text-red-400/70 uppercase font-semibold">Critical</p>
                                                    </div>
                                                )}
                                                {warningCount > 0 && (
                                                    <div className="text-center px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                                        <p className="text-lg font-bold text-yellow-400">{warningCount}</p>
                                                        <p className="text-[10px] text-yellow-400/70 uppercase font-semibold">Warnings</p>
                                                    </div>
                                                )}
                                                <div className="text-center px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                                    <p className="text-lg font-bold text-green-400">{passCount}</p>
                                                    <p className="text-[10px] text-green-400/70 uppercase font-semibold">Passed</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {isGlobalAnalyzing && selectedPage === currentAnalysis.currentPage && (
                                    <div className="glass-card p-8 text-center animate-pulse">
                                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
                                        <p className="text-sm font-medium">Fetching real-time metrics...</p>
                                    </div>
                                )}

                                {/* Category filter pills */}
                                <div className="flex flex-wrap gap-1.5 pb-2">
                                    {CATEGORY_FILTERS.map((cat) => {
                                        const CatIcon = cat.icon;
                                        const catCount = cat.id === 'all'
                                            ? EXHAUSTIVE_CHECKS.length
                                            : EXHAUSTIVE_CHECKS.filter(c => c.category === cat.id).length;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border',
                                                    activeCategory === cat.id
                                                        ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                                                        : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'
                                                )}
                                            >
                                                <CatIcon className="w-3 h-3" />
                                                {cat.label}
                                                <span className="opacity-60 text-[10px]">{catCount}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className={cn("grid grid-cols-1 gap-4 transition-opacity", isGlobalAnalyzing && selectedPage === currentAnalysis.currentPage && "opacity-50 pointer-events-none")}>
                                    {[...EXHAUSTIVE_CHECKS]
                                        .filter((check) => activeCategory === 'all' || check.category === activeCategory)
                                        .sort((a, b) => {
                                            const order: Record<string, number> = { 'critical': 0, 'warning': 1, 'pass': 2, 'info': 3, 'pending': 4 };
                                            const statusA = currentAnalysis.results?.[a.id] || 'pending';
                                            const statusB = currentAnalysis.results?.[b.id] || 'pending';
                                            return (order[statusA] ?? 5) - (order[statusB] ?? 5);
                                        })
                                        .map((check) => (
                                            <CheckCard key={check.id} check={check} analysisResult={currentAnalysis} />
                                        ))}
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'schema' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <p className="text-sm text-muted-foreground">
                                    {currentAnalysis.structuredData?.length || 0} JSON-LD schema blocks found
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {currentAnalysis.structuredData?.map((schema: any, i: number) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="glass-card p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-medium text-sm">{schema['@type'] || 'Structured Data'}</span>
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        </div>
                                        <div className="bg-black/20 p-2 rounded text-[10px] font-mono overflow-auto h-32 text-muted-foreground scrollbar-hide">
                                            <pre>{JSON.stringify(schema, null, 2)}</pre>
                                        </div>
                                    </motion.div>
                                ))}
                                {(!currentAnalysis.structuredData || currentAnalysis.structuredData.length === 0) && (
                                    <div className="col-span-full py-12 text-center glass-card">
                                        <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                                        <p className="text-sm font-semibold">No structured data found on this page.</p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{SEO_INSTRUCTIONS.schema_generator || 'Add JSON-LD schema to help search engines understand your content.'}</p>
                                        <Link
                                            href="/schema-generator"
                                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
                                        >
                                            <Code2 className="w-4 h-4" />
                                            <span>Generate JSON-LD Schema</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'sitemap' && (() => {
                        const sitemapObj = currentAnalysis.site_stats?.sitemap || currentAnalysis.stats?.sitemap;
                        return (
                            <div className="glass-card p-6 space-y-4">
                                <h3 className="font-semibold">Sitemap Detection</h3>
                                <p className="text-xs text-muted-foreground font-mono bg-black/20 p-2 rounded">
                                    {sitemapObj?.url || 'Not detected'}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                    <div className="glass-card p-4 text-center">
                                        <p className={cn("text-2xl font-bold font-display", sitemapObj?.exists ? "text-green-400" : "text-red-400")}>
                                            {sitemapObj?.exists ? 'Yes' : 'No'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Found in robots.txt / root</p>
                                    </div>
                                    <div className="glass-card p-4 text-center">
                                        <p className="text-2xl font-bold font-display text-brand-400">
                                            {sitemapObj?.size ? `${(sitemapObj.size / 1024).toFixed(1)} KB` : '-'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">File Size</p>
                                    </div>
                                    <div className="glass-card p-4 text-center">
                                        <p className="text-2xl font-bold font-display text-green-400">
                                            {currentAnalysis.stats?.discoveredUrls?.length || 0}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">URLs Found</p>
                                    </div>
                                </div>
                                {!sitemapObj?.exists && (
                                    <div className="mt-4 p-3 rounded bg-red-500/5 border border-red-500/10">
                                        <p className="text-[10px] text-red-300">
                                            <span className="font-bold mr-1">Fix:</span> {SEO_INSTRUCTIONS.sitemap}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {activeTab === 'robots' && (() => {
                        const robotsObj = currentAnalysis.site_stats?.robots || currentAnalysis.stats?.robots;
                        return (
                            <div className="glass-card p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">Robots.txt Analysis</h3>
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", robotsObj?.exists ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                        {robotsObj?.exists ? 'Found' : 'Missing'}
                                    </span>
                                </div>
                                <div className="bg-black/20 p-4 rounded-lg font-mono text-xs text-muted-foreground min-h-[100px]">
                                    {robotsObj?.isAllowed ? '✅ Googlebot is allowed to crawl this URL.' : '❌ Googlebot is blocked.'}
                                    <br /><br />
                                    {robotsObj?.sitemaps?.length > 0 && (
                                        <>
                                            Sitemaps declared:
                                            <ul className="list-disc pl-4 mt-1">
                                                {robotsObj.sitemaps.map((s: string) => <li key={s}>{s}</li>)}
                                            </ul>
                                        </>
                                    )}
                                </div>
                                {!robotsObj?.exists && (
                                    <div className="p-3 rounded bg-red-500/5 border border-red-500/10">
                                        <p className="text-[10px] text-red-300">
                                            <span className="font-bold mr-1">Fix:</span> {SEO_INSTRUCTIONS.robots}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {activeTab === 'speed' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <motion.div className="glass-card p-5 text-center flex flex-col justify-center">
                                    <div className={cn(
                                        "text-4xl font-bold font-display mx-auto mb-2 flex items-center justify-center w-24 h-24 rounded-full border-4 relative",
                                        (currentAnalysis.stats?.performance?.performanceScore || 0) > 85 ? "text-green-400 border-green-400/20" : "text-yellow-400 border-yellow-400/20"
                                    )}>
                                        {Math.round(currentAnalysis.stats?.performance?.performanceScore || 0)}
                                        {currentAnalysis.stats?.performance?.isSimulated && (
                                            <div className="absolute -bottom-2 -right-2 bg-brand-500 text-[8px] px-1.5 py-0.5 rounded-full text-white font-bold border border-white/20 animate-pulse">
                                                SIM
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-medium text-sm">Performance Score</p>
                                    {currentAnalysis.stats?.performance?.isSimulated && (
                                        <p className="text-[10px] text-muted-foreground mt-2 opacity-60 italic">Simulated scoring for crawl</p>
                                    )}
                                </motion.div>

                                <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { id: 'lcp', label: 'LCP', value: currentAnalysis.stats?.performance?.largestContentfulPaint || 'N/A', target: '< 2.5s', desc: 'Largest Contentful Paint' },
                                        { label: 'FCP', value: currentAnalysis.stats?.performance?.firstContentfulPaint || 'N/A', target: '< 1.8s', desc: 'First Contentful Paint' },
                                        { id: 'cls', label: 'CLS', value: currentAnalysis.stats?.performance?.cumulativeLayoutShift || 'N/A', target: '< 0.1', desc: 'Cumulative Layout Shift' },
                                        { label: 'TBT', value: currentAnalysis.stats?.performance?.totalBlockingTime || 'N/A', target: '< 200ms', desc: 'Total Blocking Time' },
                                    ].map((m) => (
                                        <div key={m.label} className="glass-card p-4">
                                            <p className="text-lg font-bold font-display">{m.value}</p>
                                            <p className="font-medium text-xs mt-1">{m.label}</p>
                                            <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                                            <span className="text-[10px] mt-2 block opacity-60">Target: {m.target}</span>
                                            {m.id && (
                                                <div className="mt-3 pt-3 border-t border-white/5">
                                                    <p className="text-[9px] text-brand-300 leading-relaxed">{SEO_INSTRUCTIONS[m.id]}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'redirects' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-semibold text-lg">Internal & External Links Report</h3>
                                <p className="text-sm text-muted-foreground">
                                    {currentAnalysis.stats?.scannedLinks || 0} unique links scanned ({currentAnalysis.stats?.brokenLinks || 0} broken)
                                </p>
                            </div>
                            <div className="glass-card divide-y divide-white/8 overflow-hidden">
                                {currentAnalysis.stats?.allLinks?.filter((link: any) => !link.ok).map((link: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded border font-bold uppercase",
                                            link.ok ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                        )}>
                                            {link.status || (link.ok ? '200' : 'ERR')}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn(
                                                    "text-[9px] px-1.5 py-px rounded font-medium",
                                                    link.isInternal ? "bg-brand-500/20 text-brand-400" : "bg-white/10 text-muted-foreground"
                                                )}>
                                                    {link.type}
                                                </span>
                                                <p className="text-xs font-mono text-muted-foreground truncate">{link.url}</p>
                                            </div>
                                            {!link.ok && <p className="text-[10px] text-red-300 font-medium">{link.reason}</p>}
                                        </div>
                                        {!link.ok && (
                                            <div className="max-w-[200px] hidden md:block">
                                                <p className="text-[9px] text-brand-300 leading-tight">{SEO_INSTRUCTIONS.broken_links}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!currentAnalysis.stats?.allLinks || currentAnalysis.stats?.allLinks.filter((link: any) => !link.ok).length === 0) && (
                                    <div className="p-12 text-center">
                                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                        <p className="font-medium">No broken links found on this page.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                </div>
            )}
        </div>
    );
}

export default function TechnicalSeoPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-500" /><p className="mt-4 text-zinc-400">Loading Dashboard...</p></div>}>
            <DashboardContent />
        </Suspense>
    );
}

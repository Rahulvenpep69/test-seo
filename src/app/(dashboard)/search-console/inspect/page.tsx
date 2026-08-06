'use client';

import React, { useState } from 'react';
import { useWebsite } from '@/context/website-context';
import {
    Search, ShieldCheck, Globe, Clock,
    Smartphone, CheckCircle2, AlertCircle,
    ChevronRight, ExternalLink, RefreshCw,
    Code2, MapPin, Zap, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export default function UrlInspectionPage() {
    const { activeWebsite } = useWebsite();
    const searchParams = useSearchParams();
    const [url, setUrl] = useState(searchParams.get('url') || '');
    const [isInspecting, setIsInspecting] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Auto-inspect if URL is provided in params
    React.useEffect(() => {
        const queryUrl = searchParams.get('url');
        if (queryUrl && activeWebsite) {
            setUrl(queryUrl);
            performInspection(queryUrl);
        }
    }, [searchParams, activeWebsite?.id]);

    const handleInspect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || !activeWebsite) return;
        performInspection(url);
    };

    const performInspection = async (targetUrl: string) => {
        if (!activeWebsite) return;
        setIsInspecting(true);
        setResult(null);
        try {
            const res = await fetch('/api/gsc/inspect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ websiteId: activeWebsite.id, url: targetUrl }),
            });

            if (res.ok) {
                const data = await res.json();
                // Map GSC API to UI
                const indexResult = data.indexStatusResult || {};
                const mobileResult = data.mobileUsabilityResult || {};
                const richResult = data.richResultsResult || {};

                setResult({
                    status: indexResult.verdict === 'PASS' ? 'indexed' : 'error',
                    verdict: indexResult.verdict,
                    lastCrawl: indexResult.lastCrawlTime ? new Date(indexResult.lastCrawlTime).toLocaleString() : 'N/A',
                    crawledAs: indexResult.crawlingUserAgent === 'MOBILE' ? 'Smartphone' : 'Desktop',
                    crawlAllowed: indexResult.robotsTxtState === 'ALLOWED' ? 'Yes' : 'No',
                    indexingAllowed: indexResult.indexingState === 'INDEXING_ALLOWED' ? 'Yes' : 'No',
                    pageFetch: indexResult.pageFetchState === 'SUCCESS' ? 'Successful' : (indexResult.pageFetchState || 'Failed'),
                    canonical: indexResult.googleCanonical || indexResult.userCanonical || 'N/A',
                    sitemap: indexResult.sitemap?.[0] || 'None detected',
                    referringPage: indexResult.referringUrls?.[0] || 'None detected',
                    mobileStatus: mobileResult.verdict === 'PASS' ? 'pass' : 'fail',
                    mobileVerdict: mobileResult.verdict === 'PASS' ? 'Page is mobile friendly' : 'Page is not mobile friendly',
                    coverageState: indexResult.coverageState || 'Unknown',
                    richResults: richResult.detectedItems?.map((item: any) => ({
                        name: item.richResultType,
                        status: 'Valid markup detected'
                    })) || []
                });
            }
        } catch (error) {
            console.error('Failed to inspect URL');
        } finally {
            setIsInspecting(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1 text-premium-gradient">URL Inspection</h1>
                    <p className="text-muted-foreground">Check how Google sees a specific page on your site.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="glass-card p-6 bg-brand-500/5 border-brand-500/20">
                <form onSubmit={handleInspect} className="max-w-3xl mx-auto flex gap-3">
                    <div className="relative flex-1">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Enter any URL on your site (e.g. https://example.com/page)"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:border-brand-500/50 outline-none transition-all placeholder:text-muted-foreground/30"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isInspecting || !url}
                        className="btn-primary px-8 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isInspecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Inspect
                    </button>
                </form>
                <p className="text-[11px] text-center mt-4 text-muted-foreground/60 font-semibold tracking-wide flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    AUTHORIZED PROPERTY INSPECTION
                </p>
            </div>

            <AnimatePresence mode="wait">
                {result ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        {/* Main Status Column */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className={cn(
                                "glass-card p-8 border-l-4 transition-all",
                                result.status === 'indexed' ? "border-l-green-500 bg-green-500/[0.02]" : "border-l-yellow-500 bg-yellow-500/[0.02]"
                            )}>
                                <div className="flex items-start gap-6">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center",
                                        result.status === 'indexed' ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                                    )}>
                                        {result.status === 'indexed' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={cn(
                                            "text-xl font-bold mb-2",
                                            result.status === 'indexed' ? "text-green-400" : "text-yellow-400"
                                        )}>
                                            {result.status === 'indexed' ? 'URL is on Google' : 'URL has issues'}
                                        </h3>
                                        <p className="text-muted-foreground text-sm max-w-lg mb-6">
                                            {result.coverageState}. {result.status === 'indexed'
                                                ? 'It can appear in Google Search results with all relevant enhancements.'
                                                : 'It might not appear in search results or might have limited functionality.'}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <button
                                                className="btn-primary text-xs py-2 px-6"
                                                onClick={() => window.open('https://search.google.com/search-console/inspect', '_blank')}
                                            >
                                                Request Indexing (via GSC)
                                            </button>
                                            <button className="btn-secondary text-xs py-2 px-6" onClick={() => window.open(`https://search.google.com/search-console/inspect?resource_id=${activeWebsite?.domain}&url=${url}`, '_blank')}>View in GSC</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coverage Details */}
                            <div className="glass-card overflow-hidden">
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h4 className="font-bold text-sm tracking-wide flex items-center gap-2 uppercase">
                                        <MapPin className="w-4 h-4 text-brand-400" />
                                        Discovery & Crawling
                                    </h4>
                                </div>
                                <div className="divide-y divide-white/5">
                                    <InfoRow label="Sitemaps" value={result.sitemap} />
                                    <InfoRow label="Referring Page" value={result.referringPage} />
                                    <InfoRow label="Last Crawl" value={result.lastCrawl} icon={Clock} />
                                    <InfoRow label="Crawled As" value={result.crawledAs} icon={Smartphone} />
                                    <InfoRow label="Crawl Allowed?" value={result.crawlAllowed} status={result.crawlAllowed === 'Yes' ? 'pass' : 'fail'} />
                                    <InfoRow label="Page Fetch" value={result.pageFetch} status={result.pageFetch === 'Successful' ? 'pass' : 'fail'} />
                                    <InfoRow label="Indexing Allowed?" value={result.indexingAllowed} status={result.indexingAllowed === 'Yes' ? 'pass' : 'fail'} />
                                    <InfoRow label="Google-selected Canonical" value={result.canonical} />
                                </div>
                            </div>

                            {/* Enhancements */}
                            <div className="glass-card overflow-hidden">
                                <div className="p-5 border-b border-white/5">
                                    <h4 className="font-bold text-sm tracking-wide flex items-center gap-2 uppercase">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                        Enhancements & Experience
                                    </h4>
                                </div>
                                <div className="divide-y divide-white/5">
                                    <InfoRow label="Mobile Usability" value={result.mobileVerdict} status={result.mobileStatus} />
                                    {result.richResults.map((rr: any, i: number) => (
                                        <InfoRow key={i} label={rr.name} value={rr.status} status="pass" />
                                    ))}
                                    {result.richResults.length === 0 && (
                                        <div className="p-4 text-xs text-muted-foreground italic text-center">No other enhancements detected</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar / Tools Column */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="glass-card p-6 border-brand-500/20">
                                <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    External Tools
                                </h4>
                                <div className="space-y-3">
                                    <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`} target="_blank" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                                        <span className="text-xs font-semibold">Rich Results Test</span>
                                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                    <a href={`https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}`} target="_blank" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                                        <span className="text-xs font-semibold">PageSpeed Insights</span>
                                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                    <a href={`https://search.google.com/test/mobile-friendly?url=${encodeURIComponent(url)}`} target="_blank" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                                        <span className="text-xs font-semibold">Mobile Friendly Test</span>
                                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                </div>
                            </div>

                            <div className="glass-card p-6 bg-brand-500/5 border-brand-500/10">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-brand-400" />
                                    Indexing Tip
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    If this page has recently been updated, it may take several days for Google to re-crawl and update its index. You can manually request a crawl in the Search Console dashboard.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Search className="w-12 h-12 mb-4 text-muted-foreground/30" />
                        <p className="text-sm font-medium">Search for a URL above to see its inspection results</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function InfoRow({ label, value, icon: Icon, status }: any) {
    return (
        <div className="flex items-center justify-between p-4 group hover:bg-white/[0.01]">
            <div className="flex items-center gap-3">
                {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/50" />}
                <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={cn(
                    "text-[12px] font-bold",
                    status === 'pass' ? "text-green-400" : "text-white"
                )}>
                    {value}
                </span>
                {status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
            </div>
        </div>
    );
}

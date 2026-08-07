'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWebsite } from '@/context/website-context';
import { FileCode, Check, Copy, Download, Loader2, Search, Settings2, ShieldCheck, FileText, Server, AlertTriangle, XCircle, CheckCircle2, List, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

function SitemapGeneratorContent() {
    const { activeWebsite } = useWebsite();
    const searchParams = useSearchParams();

    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    // Options
    const [includeImages, setIncludeImages] = useState(false);
    const [autoSplit, setAutoSplit] = useState(true);
    const [customPriority, setCustomPriority] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (activeWebsite) {
            setStats({
                lastGenerated: activeWebsite.sitemapLastGenerated,
                lastSubmitted: activeWebsite.sitemapLastSubmitted,
                urlCount: activeWebsite.sitemapUrlCount,
                status: activeWebsite.sitemapStatus,
                autoUpdate: activeWebsite.sitemapAutoUpdate
            });
            if (activeWebsite.sitemapXml) {
                setResult({ sitemapXml: activeWebsite.sitemapXml });
            }
        }
    }, [activeWebsite]);

    useEffect(() => {
        const queryUrl = searchParams.get('url');
        if (queryUrl) {
            setUrl(queryUrl);
        } else if (activeWebsite) {
            setUrl(activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`);
        }
    }, [searchParams, activeWebsite]);

    const handleGenerate = async () => {
        if (!url) return;
        setIsAnalyzing(true);
        setErrorMsg(null);

        try {
            const res = await fetch('/api/seo/sitemap-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    websiteId: activeWebsite?.id,
                    options: { includeImages, autoSplit, customPriority }
                })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            setResult(data);
            setStats(data.stats);
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to generate sitemap.xml");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCopy = () => {
        if (!result?.sitemapXml) return;
        navigator.clipboard.writeText(result.sitemapXml);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!result?.sitemapXml) return;
        const blob = new Blob([result.sitemapXml], { type: 'application/xml' });
        const objUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = result.isIndex ? 'sitemap_index.xml' : 'sitemap.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-[1200px] mx-auto overflow-x-hidden pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-white flex items-center gap-3">
                        <FileCode className="w-8 h-8 text-brand-400" />
                        SEO-Optimized Sitemap.xml Generator
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Generate a clean, professional sitemap.xml with smart filtering and priority assignment.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column: Inputs & Options */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">Website URL</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={!url || isAnalyzing}
                            className="w-full btn-primary py-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-brand-500/20"
                        >
                            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            {isAnalyzing ? "Crawling Website..." : (stats?.lastGenerated ? "Regenerate Sitemap" : "Generate Sitemap")}
                        </button>
                    </div>

                    <div className="glass-card p-6 space-y-6">
                        <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                            <Settings2 className="w-5 h-5 text-brand-400" />
                            <h3 className="font-semibold text-white">Smart SEO Filters</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-[11px] text-muted-foreground space-y-2">
                                <p className="font-bold text-white/60 uppercase tracking-wider text-[9px]">Auto-Exclusion Rules:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>System folders (/_files/, /admin/, login)</li>
                                    <li>Files (.pdf, .jpg, .png, etc.)</li>
                                    <li>URL Parameters (?utm, ?filter)</li>
                                    <li>Low-value pages (/general-, /test)</li>
                                </ul>
                            </div>

                            <label className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={includeImages}
                                    onChange={e => setIncludeImages(e.target.checked)}
                                    className="mt-1 bg-black/40 border-white/20 rounded text-brand-500 focus:ring-brand-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">Include Lastmod</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Include the &lt;lastmod&gt; tag in the output.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={autoSplit}
                                    onChange={e => setAutoSplit(e.target.checked)}
                                    className="mt-1 bg-black/40 border-white/20 rounded text-brand-500 focus:ring-brand-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">Smart Split (GSC Ready)</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Split if &gt; 1000 URLs (standard safety limit).</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {errorMsg}
                        </div>
                    )}
                </div>

                {/* Right column: Results */}
                <div className="lg:col-span-2 space-y-6">
                    {!result && !isAnalyzing && (
                        <div className="glass-card flex flex-col items-center justify-center p-20 text-muted-foreground opacity-50 h-full border-dashed">
                            <Globe className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Ready to Clean & Optimize</p>
                            <p className="text-sm mt-2 text-center max-w-sm">Enter a URL to crawl up to 3 levels deep and generate a clean structure.</p>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="glass-card flex flex-col items-center justify-center p-20 text-muted-foreground h-full">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-500" />
                            <p className="animate-pulse font-medium text-white">Crawling Website...</p>
                            <p className="text-xs text-muted-foreground mt-2 italic text-center">Identifying core pages, filtering files, and assigning smart priorities...</p>
                        </div>
                    )}

                    {result && !isAnalyzing && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Automation Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                                <div className="glass-card p-4 flex flex-col items-center justify-center text-center border-white/5">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Status</span>
                                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded", stats?.status === 'COMPLETED' ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400")}>
                                        {stats?.status || 'IDLE'}
                                    </span>
                                </div>
                                <div className="glass-card p-4 flex flex-col items-center justify-center text-center border-white/5">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total URLs</span>
                                    <span className="text-lg font-bold text-white">{stats?.urlCount || 0}</span>
                                </div>
                                <div className="glass-card p-4 flex flex-col items-center justify-center text-center border-white/5">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Last Generated</span>
                                    <span className="text-[11px] font-medium text-white/80">{stats?.lastGenerated ? new Date(stats.lastGenerated).toLocaleDateString() : 'Never'}</span>
                                </div>
                                <div className="glass-card p-4 flex flex-col items-center justify-center text-center border-white/5">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Auto-Update</span>
                                    <span className={cn("text-[11px] font-bold", stats?.autoUpdate ? "text-green-400" : "text-white/40")}>
                                        {stats?.autoUpdate ? 'ACTIVE (24H)' : 'DISABLED'}
                                    </span>
                                </div>
                            </div>

                            {/* Stats */}
                            {result.summary && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="glass-card p-6 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Crawled URLs</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-bold text-white">{result.summary.totalDiscovered}</span>
                                                <span className="text-xs text-muted-foreground">found</span>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-full bg-brand-500/10 text-brand-400">
                                            <List className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="glass-card p-6 flex items-center justify-between border-green-500/20 bg-green-500/5">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Included URLs</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-bold text-green-400">{result.summary.totalIncluded}</span>
                                                <span className="text-xs text-muted-foreground">indexable</span>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-full bg-green-500/10 text-green-400">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section: Excluded URLs */}
                            {result.summary && result.excluded && (
                                <div className="glass-card flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                                            <XCircle className="w-4 h-4 text-red-400" />
                                            Excluded URLs (Cleaned)
                                        </h3>
                                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                            {result.summary.totalExcluded} Filtered
                                        </span>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto custom-scroll">
                                        <table className="w-full text-left text-xs">
                                            <thead className="sticky top-0 bg-surface z-10 border-b border-white/10">
                                                <tr className="text-muted-foreground bg-white/5">
                                                    <th className="px-4 py-3 font-medium">URL Path / Asset</th>
                                                    <th className="px-4 py-3 font-medium text-right">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {result.excluded.map((item: any, i: number) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-4 py-3 font-mono opacity-80 group-hover:opacity-100 truncate max-w-[350px]">
                                                            {item.url}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 text-[9px] font-bold border border-red-400/20 uppercase tracking-tighter">
                                                                {item.reason}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {result.excluded.length === 0 && (
                                                    <tr>
                                                        <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground italic">
                                                            No URLs were excluded.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Sitemap.xml Output */}
                            <div className="glass-card flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-brand-500/10 to-transparent">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-brand-400" />
                                        <h3 className="font-semibold text-white">Sitemap.xml Output</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCopy}
                                            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2 h-9"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? "Copied" : "Copy XML"}
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="btn-primary py-1.5 px-4 text-xs flex items-center gap-2 h-9 shadow-lg shadow-brand-500/20"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Download (.xml)
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={result.sitemapXml}
                                        readOnly
                                        className="w-full min-h-[400px] bg-black/40 resize-none p-6 font-mono text-xs text-brand-100/90 focus:outline-none leading-relaxed custom-scroll"
                                    />
                                    <div className="absolute top-0 right-0 h-full w-4 flex flex-col items-center py-4 opacity-20 pointer-events-none">
                                        <div className="w-[1px] h-full bg-brand-500/20" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SitemapGeneratorPage() {
    return (
        <Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>}>
            <SitemapGeneratorContent />
        </Suspense>
    );
}

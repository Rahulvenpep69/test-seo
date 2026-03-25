'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWebsite } from '@/context/website-context';
import { Bot, Check, Copy, Download, Loader2, Search, Settings2, ShieldCheck, FileText, Server, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function RobotsGeneratorContent() {
    const { activeWebsite } = useWebsite();
    const searchParams = useSearchParams();

    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Options
    const [mode, setMode] = useState<'standard' | 'advanced'>('standard');
    const [blockQueryParams, setBlockQueryParams] = useState(true);
    const [crawlDelay, setCrawlDelay] = useState(false);
    const [specificBot, setSpecificBot] = useState('*');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const queryUrl = searchParams.get('url');
        if (queryUrl) {
            setUrl(queryUrl);
        } else if (activeWebsite) {
            setUrl(activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`);
        }
    }, [searchParams, activeWebsite]);

    const handleAnalyze = async () => {
        if (!url) return;
        setIsAnalyzing(true);
        setErrorMsg(null);

        try {
            const res = await fetch('/api/seo/robots-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    options: { mode, blockQueryParams, crawlDelay, specificBot }
                })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            setResult(data);
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to generate robots.txt");
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        if (result && !isAnalyzing) {
            handleAnalyze();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, blockQueryParams, crawlDelay, specificBot]);

    const handleCopy = () => {
        if (!result?.robotsTxt) return;
        navigator.clipboard.writeText(result.robotsTxt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!result?.robotsTxt) return;
        const blob = new Blob([result.robotsTxt], { type: 'text/plain' });
        const objUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = 'robots.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-[1200px] mx-auto overflow-x-hidden pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-white flex items-center gap-3">
                        <Bot className="w-8 h-8 text-brand-400" />
                        Robots.txt Analyzer & Auto Fix
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Smart SEO assistant that audits and fixes robots.txt like a professional SEO expert
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
                            onClick={handleAnalyze}
                            disabled={!url || isAnalyzing}
                            className="w-full btn-primary py-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-brand-500/20"
                        >
                            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            {isAnalyzing ? "Analyzing Website..." : "Analyze & Generate"}
                        </button>
                    </div>

                    <div className="glass-card p-6 space-y-6">
                        <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                            <Settings2 className="w-5 h-5 text-brand-400" />
                            <h3 className="font-semibold text-white">Generation Options</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2 pb-2">
                                <label className="text-sm font-medium text-white/80">Generation Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setMode('standard')}
                                        className={cn("py-2 px-3 rounded-lg text-sm font-medium border transition-colors", mode === 'standard' ? "bg-brand-500/20 border-brand-500 text-brand-400" : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10")}
                                    >
                                        Standard (Safe)
                                    </button>
                                    <button
                                        onClick={() => setMode('advanced')}
                                        className={cn("py-2 px-3 rounded-lg text-sm font-medium border transition-colors", mode === 'advanced' ? "bg-red-500/20 border-red-500 text-red-400" : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10")}
                                    >
                                        Advanced (Strict)
                                    </button>
                                </div>
                                {mode === 'advanced' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 flex items-start gap-2 mt-2 animate-fade-in">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <p><strong>Warning:</strong> This method blocks <em>everything</em> by default (`Disallow: /`) and only allows specific discovered hubs. Use only if you need strict crawl budget control.</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Target Bot (User-agent)</label>
                                <select
                                    value={specificBot}
                                    onChange={e => setSpecificBot(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500/50 outline-none"
                                >
                                    <option value="*">All Bots (*)</option>
                                    <option value="Googlebot">Googlebot</option>
                                    <option value="Bingbot">Bingbot</option>
                                    <option value="Slurp">Yahoo Slurp</option>
                                    <option value="DuckDuckBot">DuckDuckBot</option>
                                    <option value="Baiduspider">Baiduspider</option>
                                    <option value="YandexBot">YandexBot</option>
                                </select>
                            </div>

                            <label className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={blockQueryParams}
                                    onChange={e => setBlockQueryParams(e.target.checked)}
                                    className="mt-1 bg-black/40 border-white/20 rounded text-brand-500 focus:ring-brand-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">Block Query Params</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Disallow `/*?` to prevent indexing dynamic URLs.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={crawlDelay}
                                    onChange={e => setCrawlDelay(e.target.checked)}
                                    className="mt-1 bg-black/40 border-white/20 rounded text-brand-500 focus:ring-brand-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">Add Crawl Delay</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Adds a 10s delay to prevent server overload.</p>
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

                {/* Right column: Audit & Output View */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Placeholder before analyzing */}
                    {!result && !isAnalyzing && (
                        <div className="glass-card flex flex-col items-center justify-center p-20 text-muted-foreground opacity-50 h-full border-dashed">
                            <Server className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Enter a URL to audit your robots.txt</p>
                            <p className="text-sm mt-2 text-center max-w-sm">We will securely analyze the existing file and automatically generate SEO fixes for you. </p>
                        </div>
                    )}

                    {/* Analyzing Spinner */}
                    {isAnalyzing && (
                        <div className="glass-card flex flex-col items-center justify-center p-20 text-muted-foreground h-full">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-500" />
                            <p className="animate-pulse">Auditing your robots.txt structurally...</p>
                        </div>
                    )}

                    {/* Results */}
                    {result && !isAnalyzing && (
                        <div className="space-y-6 animate-fade-in">

                            {/* Score header */}
                            <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="space-y-1 text-center sm:text-left">
                                    <h2 className="text-xl font-bold text-white">SEO Health Score</h2>
                                    <p className="text-sm text-muted-foreground">Based on industry standard structural rules</p>
                                </div>
                                <div className="relative flex items-center justify-center w-24 h-24">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="48" cy="48" r="40" className="text-white/10" strokeWidth="8" fill="none" />
                                        <circle cx="48" cy="48" r="40" className={getScoreColor(result.score)} strokeWidth="8" fill="none"
                                            strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * result.score) / 100} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className={cn("text-2xl font-bold font-display", getScoreColor(result.score))}>{result.score}</span>
                                        <span className="text-[10px] text-muted-foreground -mt-1 uppercase">Score</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 1 & 2 Grid: Current vs Issues */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Current File */}
                                <div className="glass-card flex flex-col hover-card">
                                    <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                        <h3 className="font-semibold text-white flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-brand-400" />
                                            Current robots.txt
                                        </h3>
                                    </div>
                                    <div className="p-4 flex-1">
                                        {result.currentRobotsTxt ? (
                                            <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono p-4 bg-black/40 rounded-lg border border-white/5 max-h-[300px] overflow-y-auto custom-scroll">
                                                {result.currentRobotsTxt}
                                            </pre>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-red-500/5 rounded-lg border border-red-500/10">
                                                <XCircle className="w-8 h-8 text-red-400 mb-3" />
                                                <p className="text-red-200 font-medium">No robots.txt found</p>
                                                <p className="text-xs text-red-300 mt-1 opacity-80">Generating an optimized version automatically.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Issues List */}
                                <div className="glass-card flex flex-col">
                                    <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                        <h3 className="font-semibold text-white flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                            Issues & Fixes
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-4 max-h-[340px] overflow-y-auto custom-scroll flex-1">
                                        {result.issues && result.issues.length > 0 ? (
                                            result.issues.map((issue: any, i: number) => (
                                                <div key={i} className={cn("p-4 rounded-xl border text-sm space-y-3",
                                                    issue.type === 'error' ? "bg-red-500/5 border-red-500/20" : "bg-yellow-500/5 border-yellow-500/20"
                                                )}>
                                                    <div>
                                                        <p className="flex items-center gap-2 font-semibold">
                                                            {issue.type === 'error' ? <XCircle className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                                                            <span className={issue.type === 'error' ? 'text-red-400' : 'text-yellow-400'}>Issue:</span> {issue.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1 ml-6 leading-relaxed">{issue.message}</p>
                                                    </div>
                                                    <div className="pl-6 pt-3 border-t border-white/10">
                                                        <p className="flex items-center gap-2 font-medium text-green-400">
                                                            <CheckCircle2 className="w-4 h-4" /> Fix: <span className="text-green-200/90 text-xs">{issue.fix}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-green-500/5 rounded-lg border border-green-500/10">
                                                <CheckCircle2 className="w-8 h-8 text-green-400 mb-3" />
                                                <p className="text-green-200 font-medium">Perfect Health!</p>
                                                <p className="text-xs text-green-300 mt-1 opacity-80">No issues found in your robots.txt.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Optimized Code Editor View */}
                            <div className="glass-card flex flex-col">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-brand-500/10 to-transparent">
                                    <div className="flex items-center gap-2 mb-4 sm:mb-0">
                                        <Bot className="w-5 h-5 text-brand-400" />
                                        <h3 className="font-semibold text-white">Optimized robots.txt</h3>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <button
                                            onClick={handleCopy}
                                            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? "Copied" : "Copy Code"}
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Download .txt
                                        </button>
                                    </div>
                                </div>
                                <div className="p-0">
                                    <textarea
                                        value={result.robotsTxt}
                                        readOnly
                                        className="w-full min-h-[400px] bg-[#0d0d12] resize-none p-6 font-mono text-sm text-brand-100 focus:outline-none leading-loose custom-scroll"
                                    />
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RobotsGeneratorPage() {
    return (
        <Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>}>
            <RobotsGeneratorContent />
        </Suspense>
    );
}

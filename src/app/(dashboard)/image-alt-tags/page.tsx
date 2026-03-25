'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWebsite } from '@/context/website-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, PlusCircle, Upload,
    RefreshCw, ExternalLink, Search, Loader2,
    Zap, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

function DashboardContent() {
    const { activeWebsite, analysisResult, isAnalyzing } = useWebsite();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [url, setUrl] = useState('');
    const [localAnalysisResult, setLocalAnalysisResult] = useState<any>(null);
    const [isPageAnalyzing, setIsPageAnalyzing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isGeneratingAlts, setIsGeneratingAlts] = useState(false);
    const [suggestedAlts, setSuggestedAlts] = useState<Record<string, { alt: string, source: string }>>({});
    const [isApplyingAlt, setIsApplyingAlt] = useState<string | null>(null);
    const [showWPConnect, setShowWPConnect] = useState(false);
    const [wpConfig, setWpConfig] = useState({
        url: '',
        username: '',
        appPassword: '',
        cookie: ''
    });
    const [wpPosts, setWpPosts] = useState<any[]>([]);
    const [isFetchingPosts, setIsFetchingPosts] = useState(false);

    // Sync url with context/params
    useEffect(() => {
        const resolveUrl = () => {
            const qUrl = searchParams.get('url');
            if (qUrl) return qUrl;
            if (activeWebsite) return activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;
            return '';
        };
        const newUrl = resolveUrl();
        if (newUrl) setUrl(newUrl);
    }, [activeWebsite?.id, searchParams]);

    // Initial analysis if URL is present
    useEffect(() => {
        const queryUrl = searchParams.get('url');
        if (queryUrl) {
            handleAnalyze(queryUrl);
        } else if (activeWebsite) {
            const websiteUrl = activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;
            handleAnalyze(websiteUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, activeWebsite?.id]);

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
            const data = await res.json();

            if (data.error) {
                setErrorMsg(data.error);
                return;
            }
            setLocalAnalysisResult(data);

            // Automatically trigger AI generation if there are missing tags
            if (data.technical?.imagesWithoutAlt > 0) {
                handleGenerateAlts(data);
            }
        } catch (error: any) {
            setErrorMsg(error?.message || 'Failed to analyze the website.');
        } finally {
            setIsPageAnalyzing(false);
        }
    }

    const currentAnalysis = localAnalysisResult || analysisResult;
    const isGlobalAnalyzing = isAnalyzing || isPageAnalyzing;

    const handleFetchWPPosts = async () => {
        if (!wpConfig.url || !wpConfig.username || !wpConfig.appPassword) {
            setErrorMsg("Please provide WordPress credentials first.");
            setShowWPConnect(true);
            return;
        }
        setIsFetchingPosts(true);
        try {
            const res = await fetch('/api/integration/wordpress/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wpConfig)
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setWpPosts(data);
                setShowWPConnect(false);
            } else {
                setErrorMsg(data.message || "Failed to fetch WordPress posts.");
            }
        } catch (e) {
            setErrorMsg("Failed to connect to WordPress.");
        } finally {
            setIsFetchingPosts(false);
        }
    };

    const handleGenerateAlts = async (customAnalysis?: any) => {
        const analysis = customAnalysis || currentAnalysis;
        if (!analysis?.technical?.allImages) return;
        setIsGeneratingAlts(true);
        try {
            const res = await fetch('/api/seo/generate-alt-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images: analysis.technical.allImages,
                    pageTitle: analysis.technical.title,
                    pageDescription: analysis.technical.metaDescription,
                    keywords: analysis.results?.keywords
                })
            });
            const data = await res.json();
            if (data.altTags) {
                const newSuggestedAlts: Record<string, { alt: string, source: string }> = { ...suggestedAlts };
                data.altTags.forEach((item: any) => {
                    newSuggestedAlts[item.image] = { alt: item.alt, source: item.source };
                });
                setSuggestedAlts(newSuggestedAlts);
            } else {
                setErrorMsg(data.error || "Failed to generate alt tags.");
            }
        } catch (e) {
            setErrorMsg("Error connecting to AI service.");
        } finally {
            setIsGeneratingAlts(false);
        }
    };

    const handleApplyAlt = async (imageSrc: string, newAlt: string) => {
        if (!wpConfig.url) {
            setShowWPConnect(true);
            return;
        }
        const currentUrl = url;
        const matchingPost = wpPosts.find(p =>
            p.link === currentUrl ||
            p.link === currentUrl + '/' ||
            currentUrl === p.link + '/'
        );

        if (!matchingPost) {
            if (wpPosts.length === 0) {
                await handleFetchWPPosts();
                return;
            }
            setErrorMsg("Could not find this page in your WordPress site. Please ensure the URLs match.");
            return;
        }

        setIsApplyingAlt(imageSrc);
        try {
            const res = await fetch('/api/integration/wordpress/apply-alt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...wpConfig,
                    postId: matchingPost.id,
                    postType: matchingPost.type,
                    imageSrc,
                    newAlt
                })
            });
            const result = await res.json();
            if (result.success) {
                // To reflect the change, we update the local image record in currentAnalysis
                if (localAnalysisResult?.technical?.allImages) {
                    const updatedImages = localAnalysisResult.technical.allImages.map((img: any) =>
                        img.src === imageSrc ? { ...img, alt: newAlt } : img
                    );
                    setLocalAnalysisResult({
                        ...localAnalysisResult,
                        technical: {
                            ...localAnalysisResult.technical,
                            allImages: updatedImages,
                            imagesWithoutAlt: Math.max(0, localAnalysisResult.technical.imagesWithoutAlt - (currentAnalysis.technical.allImages.find((i: any) => i.src === imageSrc)?.alt ? 0 : 1))
                        }
                    });
                }
                setSuggestedAlts(prev => {
                    const next = { ...prev };
                    delete next[imageSrc];
                    return next;
                });
            } else {
                setErrorMsg(result.message || "Failed to apply alt tag.");
            }
        } catch (e) {
            setErrorMsg("Error applying alt tag.");
        } finally {
            setIsApplyingAlt(null);
        }
    };

    const handleCopyAll = () => {
        if (!currentAnalysis?.technical?.allImages) return;
        const csvContent = currentAnalysis.technical.allImages.map((img: any) => {
            const currentAlt = img.alt || '';
            const suggested = suggestedAlts[img.src]?.alt;
            const finalAlt = suggested !== undefined ? suggested : currentAlt;
            return `${img.src}\\t${finalAlt}`;
        }).join('\\n');
        navigator.clipboard.writeText(csvContent);
        alert('All Alt Tags copied to clipboard!');
    };

    const handleDownloadCSV = () => {
        if (!currentAnalysis?.technical?.allImages) return;
        const csvRows = ['Image URL,Alt Text,Source'];
        currentAnalysis.technical.allImages.forEach((img: any) => {
            const currentAlt = img.alt || '';
            const suggested = suggestedAlts[img.src];
            const finalAlt = suggested?.alt !== undefined ? suggested.alt : currentAlt;
            const source = suggested?.source || 'existing';
            csvRows.push(`"${img.src}","${finalAlt.replace(/"/g, '""')}","${source}"`);
        });
        const blob = new Blob([csvRows.join('\\n')], { type: 'text/csv' });
        const urlObj = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', urlObj);
        a.setAttribute('download', 'alt-tags.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto overflow-x-hidden">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1 min-w-0 xl:min-w-[300px]">
                    <h1 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-white bg-gradient-to-r from-white to-white/60 bg-clip-text truncate">
                        Image Alt Tag Automation
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base truncate">
                        AI-powered SEO optimization for website images
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto flex-1 xl:max-w-[700px]">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Enter website URL..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm md:text-base text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all font-medium"
                        />
                    </div>
                    <button
                        onClick={() => handleAnalyze()}
                        disabled={isGlobalAnalyzing || !url}
                        className="relative overflow-hidden group h-[48px] md:h-[54px] px-8 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-bold shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shrink-0 min-w-max"
                    >
                        {isGlobalAnalyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="whitespace-nowrap">Analyze Images</span>
                            </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:animate-shimmer" />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in flex items-start gap-4 shadow-xl">
                    <div className="bg-red-500/20 p-2 rounded-lg shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-red-400 font-semibold mb-1">Scan Blocked or Failed</h4>
                        <p className="text-red-400/80 text-sm leading-relaxed">{errorMsg}</p>
                    </div>
                </div>
            )}

            {!currentAnalysis && !isGlobalAnalyzing && (
                <div className="glass-card p-12 text-center">
                    <div className="bg-brand-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-brand-400" />
                    </div>
                    <h3 className="text-xl font-semibold">Ready to Optimize</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        Enter a website URL above to analyze images and generate AI alt tags.
                    </p>
                </div>
            )}

            {isGlobalAnalyzing && (
                <div className="glass-card p-12 text-center">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">Analyzing Images...</h3>
                    <p className="text-muted-foreground">Extracting image sources and contextual data</p>
                </div>
            )}

            {currentAnalysis && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-semibold text-lg">Image Optimization</h3>
                        <p className="text-sm text-muted-foreground">
                            {currentAnalysis.technical?.allImages?.length || 0} images found ({currentAnalysis.technical?.imagesWithoutAlt || 0} missing alt tags)
                        </p>
                    </div>

                    {currentAnalysis.technical?.imagesWithoutAlt > 0 && (
                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 animate-fade-in flex items-start gap-4 shadow-xl">
                            <div className="bg-yellow-500/20 p-2 rounded-lg shrink-0">
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-yellow-400 font-semibold mb-1">Missing Alt Tags Detected</h4>
                                <p className="text-yellow-400/80 text-sm leading-relaxed">
                                    {currentAnalysis.technical?.imagesWithoutAlt} images on this page are missing alt tags.
                                </p>
                                <div className="mt-3 flex items-center gap-3">
                                    <button
                                        onClick={handleGenerateAlts}
                                        disabled={isGeneratingAlts}
                                        className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
                                    >
                                        {isGeneratingAlts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                        Generate Alt Tags (AI)
                                    </button>
                                    <button
                                        onClick={() => setShowWPConnect(true)}
                                        className="btn-ghost text-xs py-2 px-4 flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Connect WordPress
                                    </button>
                                </div>
                                {Object.keys(suggestedAlts).length > 0 && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <button onClick={handleCopyAll} className="bg-transparent hover:bg-white/5 text-xs py-1.5 px-3 rounded text-zinc-300 border border-white/10 transition-colors">
                                            Copy All to Clipboard
                                        </button>
                                        <button onClick={handleDownloadCSV} className="bg-transparent hover:bg-white/5 text-xs py-1.5 px-3 rounded text-zinc-300 border border-white/10 transition-colors">
                                            Download CSV
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {showWPConnect && (
                        <div className="glass-card p-6 space-y-4 border-brand-500/30">
                            <h4 className="font-semibold text-sm">Connect to WordPress</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="WordPress URL"
                                    value={wpConfig.url}
                                    onChange={(e) => setWpConfig(prev => ({ ...prev, url: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                                />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={wpConfig.username}
                                    onChange={(e) => setWpConfig(prev => ({ ...prev, username: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                                />
                                <input
                                    type="password"
                                    placeholder="Application Password"
                                    value={wpConfig.appPassword}
                                    onChange={(e) => setWpConfig(prev => ({ ...prev, appPassword: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white md:col-span-2"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowWPConnect(false)} className="px-4 py-2 text-xs text-muted-foreground hover:text-white transition-colors">Cancel</button>
                                <button
                                    onClick={handleFetchWPPosts}
                                    disabled={isFetchingPosts}
                                    className="btn-primary text-xs py-2 px-6 flex items-center gap-2"
                                >
                                    {isFetchingPosts ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Verify Connection
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="glass-card divide-y divide-white/8 overflow-hidden">
                        {currentAnalysis.technical?.allImages?.length > 0 ? (
                            currentAnalysis.technical.allImages.map((img: any, i: number) => {
                                const currentAlt = img.alt || '';
                                const suggestionMatch = suggestedAlts[img.src];
                                const displayAlt = suggestionMatch ? suggestionMatch.alt : currentAlt;
                                const isMissing = !currentAlt;
                                const isAiSuggested = !!suggestionMatch;
                                const source = suggestionMatch?.source || '';

                                return (
                                    <div key={i} className="flex flex-col sm:flex-row items-start gap-4 p-4 hover:bg-white/5 transition-colors relative">
                                        <div className="shrink-0 w-24 h-24 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden border border-white/10 group relative">
                                            <img src={img.src} alt="" className="object-cover w-full h-full transition-transform group-hover:scale-110" onError={(e) => { (e.target as any).src = 'https://via.placeholder.com/150?text=IMG' }} />
                                            {isMissing && <div className="absolute top-1 right-1 bg-yellow-500 rounded-full w-2 h-2 shadow-glow-yellow" />}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <div className="pr-0 md:pr-40 relative">
                                                <p className="text-[10px] font-mono text-muted-foreground truncate mb-2 opacity-60 bg-black/20 p-1.5 rounded inline-block max-w-full">{img.src}</p>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    {isMissing ? (
                                                        <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 font-bold uppercase tracking-wider shrink-0">Missing Alt</span>
                                                    ) : (
                                                        <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-wider shrink-0 truncate max-w-full">Current Alt: {currentAlt}</span>
                                                    )}
                                                </div>

                                                {/* Status Badge Inline on mobile, absolute on md+ */}
                                                {isAiSuggested && (
                                                    <div className="md:absolute md:top-0 md:right-0 mt-2 md:mt-0" title="Alt tags are generated automatically for SEO optimization">
                                                        <span className={cn(
                                                            "text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm w-fit max-w-full",
                                                            source === 'openai' ? "text-green-400 bg-green-500/10 border border-green-500/20" :
                                                                source === 'gemini' ? "text-blue-400 bg-blue-500/10 border border-blue-500/20" :
                                                                    "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20"
                                                        )}>
                                                            <Zap className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{source === 'openai' ? 'AI Generated (OpenAI)' : source === 'gemini' ? 'AI Generated (Gemini)' : 'Auto Generated (Fast Mode)'}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={displayAlt}
                                                    onChange={(e) => setSuggestedAlts(prev => ({ ...prev, [img.src]: { alt: e.target.value, source: prev[img.src]?.source || 'manual' } }))}
                                                    placeholder="Enter descriptive alt tag..."
                                                    className={cn(
                                                        "w-full bg-black/20 border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 pr-28",
                                                        isAiSuggested ? "border-brand-500/40 focus:ring-brand-500/20 text-brand-200" : "border-white/10 focus:ring-white/10 text-white"
                                                    )}
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleApplyAlt(img.src, displayAlt)}
                                                        disabled={isApplyingAlt === img.src || (!displayAlt && !currentAlt)}
                                                        className="btn-primary text-[10px] py-1.5 px-4 font-bold rounded-md shadow-lg shadow-brand-500/20"
                                                    >
                                                        {isApplyingAlt === img.src ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : !isGlobalAnalyzing && (
                            <div className="p-12 text-center">
                                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                <p className="font-medium text-muted-foreground">No images found on this page.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ImageAltTagsPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-500" /></div>}>
            <DashboardContent />
        </Suspense>
    );
}

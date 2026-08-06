'use client';

import React, { useState, useEffect } from 'react';
import { useWebsite } from '@/context/website-context';
import {
    BarChart3, MousePointer2, Eye, Target,
    TrendingUp, ArrowUpRight, Search, Globe,
    ChevronRight, RefreshCw, AlertCircle, Info,
    ExternalLink, Smartphone, Monitor, Tablet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SearchConsolePage() {
    const { activeWebsite } = useWebsite();
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [needsMapping, setNeedsMapping] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
        trends: {
            clicks: '--%',
            impressions: '--%',
            ctr: '--%',
            position: '--'
        } as any,
        dateSeries: [] as any[]
    });
    const [indexingSummary, setIndexingSummary] = useState<any>(null);

    const checkStatusAndData = async () => {
        if (!activeWebsite) return;
        setIsLoading(true);
        setErrorMsg(null);
        try {
            // Fetch performance
            const perfRes = await fetch(`/api/gsc/performance?websiteId=${activeWebsite.id}`);
            if (perfRes.ok) {
                const data = await perfRes.json();
                setIsConnected(!!data.isConnected);
                if (data.dateSeries && data.dateSeries.length > 0) {
                    setStats({
                        totalClicks: data.totalClicks,
                        totalImpressions: data.totalImpressions,
                        averageCtr: data.averageCtr,
                        averagePosition: data.averagePosition,
                        trends: data.trends,
                        dateSeries: data.dateSeries
                    });
                }
                // Check for success/error in URL params
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('success') === 'connected') {
                    setSuccessMsg('Google Search Console connected successfully!');
                    window.history.replaceState({}, '', '/search-console');
                } else if (urlParams.get('error')) {
                    setErrorMsg(`Connection failed: ${urlParams.get('error')}`);
                    window.history.replaceState({}, '', '/search-console');
                }
            } else {
                const errData = await perfRes.json();
                setErrorMsg(errData.error || 'Failed to load GSC status');
            }

            // Fetch indexing summary
            const indexRes = await fetch(`/api/gsc/indexing?websiteId=${activeWebsite.id}`);
            if (indexRes.ok) {
                const indexData = await indexRes.json();
                setIndexingSummary(indexData.indexingSummary);
            }
        } catch (error) {
            console.error('Failed to fetch GSC data', error);
            setErrorMsg('Network error — could not load Search Console data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkStatusAndData();
    }, [activeWebsite?.id]);

    const handleConnect = async () => {
        setErrorMsg(null);
        try {
            const res = await fetch('/api/gsc/auth');
            if (res.ok) {
                const { url } = await res.json();
                window.location.href = url;
            } else {
                const errData = await res.json().catch(() => ({}));
                setErrorMsg(errData.error || `Failed to start Google auth (status ${res.status}). Check your Google OAuth credentials.`);
            }
        } catch (error) {
            console.error('Failed to get auth URL', error);
            setErrorMsg('Network error — could not reach the auth endpoint.');
        }
    };

    const handleSync = async (propertyUrl?: string) => {
        if (!activeWebsite) return;
        setIsSyncing(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/api/gsc/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ websiteId: activeWebsite.id, propertyUrl })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMsg('Data synced successfully!');
                checkStatusAndData();
            } else if (data.needsMapping) {
                setNeedsMapping(true);
                fetchProperties();
            } else {
                setErrorMsg(data.error || 'Sync failed. Please try again.');
            }
        } catch (error) {
            console.error('Sync failed', error);
            setErrorMsg('Network error during sync. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    const fetchProperties = async () => {
        try {
            const res = await fetch('/api/gsc/properties');
            if (res.ok) {
                const data = await res.json();
                setProperties(data);
            }
        } catch (error) {
            console.error('Failed to fetch properties');
        }
    };

    if (!activeWebsite) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                    <Globe className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Website Selected</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                    Please select a website from the switcher to view its Search Console data.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Search Console</h1>
                    <p className="text-muted-foreground">Monitor your Google Search performance and indexing status.</p>
                </div>

                <div className="flex items-center gap-3">
                    {isConnected && (
                        <button
                            onClick={() => handleSync()}
                            disabled={isSyncing}
                            className={cn("btn-secondary py-2 flex items-center", isSyncing && "opacity-70")}
                        >
                            <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
                            {isSyncing ? 'Syncing...' : 'Sync Data'}
                        </button>
                    )}
                    {!isConnected && !isLoading && (
                        <button
                            onClick={handleConnect}
                            className="btn-primary py-2 flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Connect GSC
                        </button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
                <div className="glass-card p-4 border-red-500/30 bg-red-500/5 flex items-start gap-3 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-red-300">{errorMsg}</p>
                    </div>
                    <button onClick={() => setErrorMsg(null)} className="text-muted-foreground hover:text-white transition-colors text-xs">✕</button>
                </div>
            )}

            {/* Success Message */}
            {successMsg && (
                <div className="glass-card p-4 border-green-500/30 bg-green-500/5 flex items-start gap-3 rounded-xl">
                    <Info className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-green-300">{successMsg}</p>
                    </div>
                    <button onClick={() => setSuccessMsg(null)} className="text-muted-foreground hover:text-white transition-colors text-xs">✕</button>
                </div>
            )}

            {needsMapping && (
                <div className="glass-card p-6 border-yellow-500/20 bg-yellow-500/5">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-yellow-400 shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-bold text-yellow-400 mb-1">Property Mapping Required</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                We couldn&apos;t automatically find a matching Search Console property for <b>{activeWebsite.domain || activeWebsite.subdomain}</b>.
                                Please select the correct property from your account.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {properties.map((p: any) => (
                                    <button
                                        key={p.siteUrl}
                                        onClick={() => handleSync(p.siteUrl)}
                                        className="text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-brand-500/50 transition-all text-sm truncate"
                                    >
                                        {p.siteUrl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Onboarding Card — shown when GSC is not connected */}
            {!isConnected && !isLoading && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="glass-card p-8 md:p-12 border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/5 relative overflow-hidden"
                >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-br from-brand-500/20 to-accent-500/20 rounded-3xl flex items-center justify-center mb-6 border border-brand-500/20">
                            <Search className="w-10 h-10 text-brand-400" />
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold mb-3">
                            Connect Google Search Console
                        </h2>
                        <p className="text-muted-foreground mb-8 max-w-lg leading-relaxed">
                            Link your Google Search Console account to unlock real-time search performance data,
                            indexing insights, and keyword analytics — all in one dashboard.
                        </p>

                        {/* Feature highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <MousePointer2 className="w-5 h-5 text-blue-400 mb-2 mx-auto" />
                                <p className="text-sm font-semibold mb-1">Click Analytics</p>
                                <p className="text-xs text-muted-foreground">Track clicks, impressions, CTR & position trends</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <Globe className="w-5 h-5 text-green-400 mb-2 mx-auto" />
                                <p className="text-sm font-semibold mb-1">Indexing Status</p>
                                <p className="text-xs text-muted-foreground">Monitor which pages Google has indexed</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <BarChart3 className="w-5 h-5 text-brand-400 mb-2 mx-auto" />
                                <p className="text-sm font-semibold mb-1">Query Insights</p>
                                <p className="text-xs text-muted-foreground">See what people search to find your site</p>
                            </div>
                        </div>

                        <button
                            onClick={handleConnect}
                            className="btn-primary py-3 px-8 flex items-center gap-2 text-base font-semibold"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Connect Google Search Console
                        </button>
                        <p className="text-xs text-muted-foreground mt-3">
                            We only request read-only access to your search data.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Connected content — stats, charts, indexing */}
            {(isConnected || isLoading) && (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Total Clicks"
                            value={stats.totalClicks.toLocaleString()}
                            icon={MousePointer2}
                            trend={stats.trends.clicks}
                            color="text-blue-400"
                            isLoading={isLoading}
                        />
                        <StatCard
                            label="Total Impressions"
                            value={stats.totalImpressions.toLocaleString()}
                            icon={Eye}
                            trend={stats.trends.impressions}
                            color="text-brand-400"
                            isLoading={isLoading}
                        />
                        <StatCard
                            label="Average CTR"
                            value={`${stats.averageCtr.toFixed(1)}%`}
                            icon={TrendingUp}
                            trend={stats.trends.ctr}
                            color="text-green-400"
                            isLoading={isLoading}
                        />
                        <StatCard
                            label="Average Position"
                            value={stats.averagePosition.toFixed(1)}
                            icon={Target}
                            trend={stats.trends.position}
                            color="text-brand-400"
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Main Content Areas */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Performance Chart */}
                        <div className="lg:col-span-2 glass-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-brand-400" />
                                    Performance Trend
                                </h3>
                                <div className="flex bg-white/5 rounded-lg p-1 text-xs">
                                    <button className="px-3 py-1 rounded-md bg-white/10">30 Days</button>
                                </div>
                            </div>

                            <div className="h-[300px] flex items-end justify-between gap-2 px-2">
                                {stats.dateSeries.length > 0 ? stats.dateSeries.map((item: any, i: number) => {
                                    const maxClicks = Math.max(...stats.dateSeries.map((t: any) => t.clicks)) || 1;
                                    const height = (item.clicks / maxClicks) * 100;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div className="w-full relative h-[250px] bg-white/5 rounded-t-lg overflow-hidden flex items-end">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${height}%` }}
                                                    className="w-full bg-brand-500/40 group-hover:bg-brand-500/60 transition-colors"
                                                />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-medium">{item.date}</span>
                                        </div>
                                    );
                                }) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm italic">
                                        {isLoading ? 'Loading performance data...' : 'No performance data available yet. Click "Sync Data" to fetch the latest data.'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Indexing Summary */}
                        <div className="glass-card p-6">
                            <h3 className="font-semibold mb-6 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-brand-400" />
                                Indexing Status
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-green-400">Indexed</p>
                                            <p className="text-[10px] text-muted-foreground truncate">Via sitemaps</p>
                                        </div>
                                    </div>
                                    <p className="text-xl font-bold">{indexingSummary?.totalIndexed || 0}</p>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                            <Globe className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold">Submitted</p>
                                            <p className="text-[10px] text-muted-foreground truncate">Total URLs</p>
                                        </div>
                                    </div>
                                    <p className="text-xl font-bold">{indexingSummary?.totalSubmitted || 0}</p>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-400/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-yellow-400">Issues</p>
                                            <p className="text-[10px] text-muted-foreground truncate">Detected {indexingSummary?.status === 'ERR' ? 'errors' : 'none'}</p>
                                        </div>
                                    </div>
                                    <p className="text-xl font-bold text-yellow-400">{indexingSummary?.totalNotIndexed || 0}</p>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <Link
                                        href="/search-console/indexing"
                                        className="w-full btn-secondary text-xs flex items-center justify-center"
                                    >
                                        Full Index Report
                                        <ChevronRight className="w-3 h-3 ml-1" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* URL Inspection Tool Quick Access */}
            <div className="glass-card p-8 bg-gradient-to-br from-brand-500/10 to-accent-500/5 border-brand-500/20">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1 text-center md:text-left">
                        <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto md:ml-0">
                            <Search className="w-6 h-6 text-brand-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">URL Inspection Tool</h3>
                        <p className="text-muted-foreground">
                            Check the index status of any page on your site and request Google to re-crawl them.
                        </p>
                    </div>
                    <div className="w-full md:w-[400px]">
                        <form action="/search-console/inspect" method="GET" className="relative">
                            <input
                                name="url"
                                type="text"
                                placeholder="https://example.com/blog-post"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-4 pr-32 focus:border-brand-500/50 outline-none transition-all"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-2 bottom-2 px-6 bg-brand-500 hover:bg-brand-600 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                            >
                                Inspect
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, trend, color, isLoading }: any) {
    const isNeutral = !trend || trend === '--%' || trend === '--' || trend === '0%' || trend === '0.0';
    const isPositive = !isNeutral && typeof trend === 'string' && trend.startsWith('+');
    const isNegative = !isNeutral && !isPositive;

    return (
        <div className="glass-card p-5 group hover:border-brand-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-brand-500/10 transition-colors">
                    <Icon className="w-4 h-4" />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
                    <div className="h-4 w-16 bg-white/5 animate-pulse rounded" />
                </div>
            ) : (
                <div className="flex items-end justify-between">
                    <div>
                        <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                isPositive && "bg-green-500/10 text-green-400",
                                isNegative && "bg-red-500/10 text-red-400",
                                isNeutral && "bg-white/5 text-muted-foreground"
                            )}>
                                {trend}
                            </span>
                            <span className="text-[10px] text-muted-foreground">vs last period</span>
                        </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/30" />
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, Globe, Search, Sparkles, ArrowUpRight, AlertTriangle,
    CheckCircle2, Zap, BarChart3, XCircle, FileDown, Loader2,
    RefreshCw, ExternalLink, Server, FileText
} from 'lucide-react';
import { generateTechnicalSeoPdf } from '@/lib/seo/reports';
import Link from 'next/link';
import { cn, getScoreColor } from '@/lib/utils';
import { useWebsite } from '@/context/website-context';

export default function DashboardPage() {
    const { activeWebsite, websites, setActiveWebsiteId, analysisResult, isAnalyzing, runAnalysis } = useWebsite();

    const [isLoading, setIsLoading] = useState(true);
    const [websites_full, setWebsitesFull] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);

    // Fetch profile and websites on load
    useEffect(() => {
        let isMounted = true;
        async function fetchData() {
            try {
                const [profileData, websitesData] = await Promise.all([
                    fetch('/api/profile').then(r => r.ok ? r.json() : null),
                    fetch('/api/websites').then(r => r.ok ? r.json() : [])
                ]);
                if (isMounted) {
                    if (profileData) setProfile(profileData);
                    if (websitesData) setWebsitesFull(websitesData);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchData();
        return () => { isMounted = false; };
    }, []);

    // Auto-analyze when active website changes if no result exists
    useEffect(() => {
        if (activeWebsite && !analysisResult && !isAnalyzing) {
            runAnalysis();
        }
    }, [activeWebsite?.id, analysisResult, isAnalyzing, runAnalysis]);

    // Compute display data
    const activeSiteFull = websites_full.find(w => w.id === activeWebsite?.id);
    const latestReport = activeSiteFull?.seoReports?.[0];

    const toggleSiteStatus = async (siteId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        if (!confirm(`Are you sure you want to ${newStatus === 'ACTIVE' ? 'enable' : 'disable'} this website?`)) return;

        try {
            const res = await fetch(`/api/websites/${siteId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                // Update local state to reflect the change visually immediately
                setWebsitesFull(websites_full.map(w => w.id === siteId ? { ...w, status: newStatus } : w));

                // Also update the context if we have a way, or let it refresh on next load
                // We'll just rely on the local state update for immediate feedback
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to update website status');
            }
        } catch (error) {
            alert('Failed to update website status');
        }
    };

    const overallScore = analysisResult
        ? (() => {
            const totalChecks = Object.keys(analysisResult.results || {}).length;
            const passes = Object.values(analysisResult.results || {}).filter((v: any) => v === 'pass').length;
            const warnings = Object.values(analysisResult.results || {}).filter((v: any) => v === 'warning').length;
            const issuePoints = (passes * 3) + warnings;
            const issueMax = totalChecks * 3;
            const daPoints = (analysisResult.stats?.authority?.domainAuthority || 0) * 0.3;
            const spamPoints = (100 - (analysisResult.stats?.authority?.spamScore || 0)) * 0.2;
            const earnedPoints = issuePoints + daPoints + spamPoints;
            const maxPoints = issueMax + 50;
            return Math.min(100, Math.floor((earnedPoints / maxPoints) * 100));
        })()
        : (latestReport?.overallScore || 0);

    const totalIssues = analysisResult
        ? Object.values(analysisResult.results || {}).filter((v: any) => v === 'critical' || v === 'warning').length
        : websites_full.reduce((acc, site) => acc + (site.seoReports?.[0]?.issuesFound || 0), 0);

    const stats = [
        {
            label: activeWebsite ? `${activeWebsite.name} Score` : 'Overall SEO Score',
            value: isAnalyzing ? '...' : overallScore.toString(),
            unit: '/100',
            icon: Search,
            color: 'text-brand-400'
        },
        {
            label: 'Active Websites',
            value: websites.length.toString(),
            unit: '',
            icon: Globe,
            color: 'text-green-400'
        },
        {
            label: 'AI Credits Left',
            value: profile?.aiCredits ? (profile.aiCredits.total - profile.aiCredits.used) : '0',
            unit: '',
            icon: Sparkles,
            color: 'text-accent-400'
        },
        {
            label: 'Issues Found',
            value: isAnalyzing ? '...' : totalIssues.toString(),
            unit: '',
            icon: AlertTriangle,
            color: 'text-yellow-400'
        },
    ];

    const getWebsiteUrl = () => {
        if (!activeWebsite) return '';
        return activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;
    };

    const quickActions = [
        {
            label: 'SEO Dashboard',
            href: activeWebsite ? `/seo?url=${encodeURIComponent(getWebsiteUrl())}&autoScan=true` : '/seo',
            icon: Search,
            color: 'from-brand-600 to-brand-500',
            desc: 'Full SEO analysis'
        },
        {
            label: 'AI Tools',
            href: '/ai-tools',
            icon: Sparkles,
            color: 'from-accent-600 to-accent-500',
            desc: 'Generate content'
        },
        {
            label: 'Ads Analysis',
            href: '/ads',
            icon: BarChart3,
            color: 'from-green-600 to-green-500',
            desc: 'Competitor ads'
        },
        {
            label: 'Technical SEO',
            href: activeWebsite ? `/technical-seo?url=${encodeURIComponent(getWebsiteUrl())}` : '/technical-seo',
            icon: Server,
            color: 'from-orange-600 to-orange-500',
            desc: 'Crawl & audit'
        },
        {
            label: 'Rank Tracking',
            href: '/keywords',
            icon: TrendingUp,
            color: 'from-purple-600 to-purple-500',
            desc: 'Monitor positions'
        },
        {
            label: 'Reports',
            href: '/reports',
            icon: FileText,
            color: 'from-cyan-600 to-cyan-500',
            desc: 'Download reports'
        },
    ];

    const subScores = [
        {
            label: 'Technical',
            score: analysisResult ? calcSubscore(analysisResult.results, ['meta_title', 'meta_desc', 'canonical', 'meta_robots', 'hreflang', 'html_lang']) : (latestReport?.technicalScore || 0)
        },
        {
            label: 'Content',
            score: analysisResult ? calcSubscore(analysisResult.results, ['h1_tags', 'h2_tags', 'content_length', 'keyword_density', 'duplicate_content']) : (latestReport?.contentScore || 0)
        },
        {
            label: 'Speed',
            score: analysisResult
                ? Math.round(analysisResult.stats?.performance?.performanceScore || 0)
                : (latestReport?.speedScore || 0)
        },
        {
            label: 'Schema',
            score: analysisResult
                ? (analysisResult.structuredData?.length > 0 ? 85 : 10)
                : (latestReport?.schemaScore || 0)
        },
        {
            label: 'Sitemap',
            score: analysisResult
                ? (analysisResult.stats?.sitemap?.exists ? 90 : 20)
                : (latestReport?.sitemapScore || 0)
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        {activeWebsite
                            ? <>Showing real-time data for <span className="text-brand-400 font-medium">{activeWebsite.name}</span></>
                            : 'Select a website from the top bar to see its data'}
                    </p>
                </div>
                {activeWebsite && (
                    <button
                        onClick={() => runAnalysis()}
                        disabled={isAnalyzing}
                        className="btn-primary py-2 text-sm"
                    >
                        {isAnalyzing
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
                            : <><RefreshCw className="w-4 h-4" />Re-analyze</>}
                    </button>
                )}
            </div>

            {isAnalyzing && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20"
                >
                    <Loader2 className="w-5 h-5 text-brand-400 animate-spin flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-brand-300">Running real-time SEO analysis...</p>
                        <p className="text-xs text-muted-foreground">
                            Crawling {activeWebsite?.domain || `${activeWebsite?.subdomain}.antigravity.run`} — checking technical health, speed, and schema.
                        </p>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="glass-card-hover p-5"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={cn('p-2 rounded-lg bg-white/8')}>
                                    <Icon className={cn('w-4 h-4', stat.color)} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold font-display">
                                <span className={stat.color}>{stat.value}</span>
                                <span className="text-muted-foreground text-lg">{stat.unit}</span>
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold font-display">My Websites</h2>
                            <div className="flex items-center gap-4">
                                <Link href="/onboarding" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                                    Add new <ArrowUpRight className="w-3 h-3" />
                                </Link>
                                {activeWebsite && (
                                    <button
                                        onClick={() => {
                                            const url = activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;
                                            if (analysisResult) {
                                                generateTechnicalSeoPdf(url, analysisResult);
                                            } else if (latestReport?.fullResults) {
                                                try {
                                                    const results = typeof latestReport.fullResults === 'string' ? JSON.parse(latestReport.fullResults) : latestReport.fullResults;
                                                    generateTechnicalSeoPdf(url, { results, stats: { performance: { performanceScore: latestReport.speedScore }, score: latestReport.overallScore } });
                                                } catch (e) {
                                                    window.open(`/report?url=${encodeURIComponent(url)}`, '_blank');
                                                }
                                            } else {
                                                window.open(`/report?url=${encodeURIComponent(url)}`, '_blank');
                                            }
                                        }}
                                        className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-white font-medium transition-all flex items-center gap-2"
                                    >
                                        <FileDown className="w-3.5 h-3.5 text-brand-400" />
                                        <span>Export PDF</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {websites_full.map((site, i) => {
                                const siteReport = site.seoReports?.[0];
                                const score = siteReport?.overallScore || 0;
                                const isActive = activeWebsite?.id === site.id;
                                const siteUrl = site.domain || `https://${site.subdomain}.antigravity.run`;
                                return (
                                    <div
                                        key={site.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            isActive
                                                ? "bg-brand-500/10 border-brand-500/30 ring-1 ring-brand-500/20"
                                                : "bg-white/4 border-white/8 hover:bg-white/6"
                                        )}
                                    >
                                        <div
                                            className="flex items-center gap-4 cursor-pointer flex-1"
                                            onClick={() => setActiveWebsiteId(site.id)}
                                        >
                                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isActive ? "bg-brand-500/30" : "bg-brand-500/20")}>
                                                <Globe className={cn("w-5 h-5", isActive ? "text-brand-300" : "text-brand-400")} />
                                            </div>
                                            <div>
                                                <p className={cn("font-medium", isActive && "text-brand-300")}>{site.name}</p>
                                                <p className="text-xs text-muted-foreground">{siteUrl}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isActive && isAnalyzing ? (
                                                <div className="w-11 h-11 rounded-full border-2 border-brand-500 flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "w-11 h-11 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                                                    isActive && analysisResult
                                                        ? (overallScore >= 80 ? "border-green-500 text-green-400" : overallScore >= 50 ? "border-brand-500 text-brand-400" : "border-red-500 text-red-400")
                                                        : (score >= 80 ? "border-green-500 text-green-400" : score >= 50 ? "border-brand-500 text-brand-400" : "border-red-500 text-red-400")
                                                )}>
                                                    {isActive && analysisResult ? overallScore : score}
                                                </div>
                                            )}

                                            <div className="h-4 w-px bg-white/10 mx-1" />

                                            {/* Persistent Toggle */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent row click
                                                    toggleSiteStatus(site.id, site.status || 'ACTIVE');
                                                }}
                                                className={cn(
                                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-background",
                                                    (site.status || 'ACTIVE') === 'ACTIVE' ? 'bg-green-500' : 'bg-white/20'
                                                )}
                                                title={(site.status || 'ACTIVE') === 'ACTIVE' ? 'Disable Website' : 'Enable Website'}
                                            >
                                                <span className="sr-only">Toggle status</span>
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                        (site.status || 'ACTIVE') === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {activeWebsite && analysisResult && (
                        <div className="glass-card p-6">
                            <h2 className="font-semibold font-display flex items-center gap-2 mb-4">
                                <Zap className="w-4 h-4 text-brand-400" />
                                Live Analysis — {activeWebsite.name}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { label: 'Title', status: analysisResult.results?.meta_title, desc: analysisResult.technical?.title || 'Not found' },
                                    { label: 'Meta Desc', status: analysisResult.results?.meta_desc, desc: analysisResult.technical?.metaDescription ? 'Found' : 'Missing' },
                                    { label: 'H1 Tag', status: analysisResult.results?.h1_tags, desc: `${analysisResult.technical?.h1Count || 0} found` },
                                    { label: 'HTTPS', status: analysisResult.results?.https, desc: analysisResult.technical?.isHttps ? 'Secure' : 'Not secure' },
                                    { label: 'Sitemap', status: analysisResult.stats?.sitemap?.exists ? 'pass' : 'warning', desc: analysisResult.stats?.sitemap?.exists ? 'Found' : 'Missing' },
                                    { label: 'Performance', status: (analysisResult.stats?.performance?.performanceScore || 0) >= 70 ? 'pass' : 'warning', desc: `${Math.round(analysisResult.stats?.performance?.performanceScore || 0)}/100` },
                                ].map((item) => (
                                    <div key={item.label} className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg border",
                                        item.status === 'pass' ? "bg-green-500/5 border-green-500/15" :
                                            item.status === 'critical' ? "bg-red-500/5 border-red-500/15" :
                                                "bg-yellow-500/5 border-yellow-500/15"
                                    )}>
                                        {item.status === 'pass'
                                            ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                            : item.status === 'critical'
                                                ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                                : <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />}
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold">{item.label}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h2 className="font-semibold font-display">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((action, i) => {
                            const Icon = action.icon;
                            return (
                                <Link key={action.label} href={action.href} className="glass-card-hover p-4 flex flex-col items-center gap-3 text-center group">
                                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', action.color)}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-foreground group-hover:text-brand-300 transition-colors block">{action.label}</span>
                                        <span className="text-[10px] text-muted-foreground">{action.desc}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="font-medium mb-4 flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-brand-400" />
                            SEO Score Breakdown
                        </h3>
                        <div className="space-y-3">
                            {subScores.map((item) => (
                                <div key={item.label}>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <span className={cn('font-semibold', getScoreColor(item.score))}>{item.score}</span>
                                    </div>
                                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.score}%` }}
                                            className={cn(
                                                'h-full rounded-full',
                                                item.score >= 80 ? 'bg-green-500' : item.score >= 60 ? 'bg-brand-500' : item.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                            )}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function calcSubscore(results: Record<string, string> = {}, keys: string[]): number {
    const relevant = keys.filter(k => k in results);
    if (!relevant.length) return 0;
    const passes = relevant.filter(k => results[k] === 'pass').length;
    return Math.round((passes / relevant.length) * 100);
}

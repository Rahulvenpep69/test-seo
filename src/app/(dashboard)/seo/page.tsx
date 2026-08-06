'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, RefreshCw, AlertTriangle, CheckCircle2, Info, Zap,
    Server, FileText, Gauge, Code2, MapPin, Globe, ArrowUpRight,
    Check, XCircle
} from 'lucide-react';
import { cn, getScoreColor, getScoreLabel } from '@/lib/utils';
import { showToast } from '@/components/ui/toaster';
import { useWebsite } from '@/context/website-context';

import { SEO_INSTRUCTIONS } from '@/lib/seo/instructions';
import { EXHAUSTIVE_CHECKS } from '@/lib/seo/checks';

const defaultOverallScore = 72;

const defaultSubScores = [
    { label: 'Technical', score: 68, icon: Server, desc: 'Crawlability, indexing, HTTPS' },
    { label: 'Content', score: 81, icon: FileText, desc: 'Meta, headings, word count' },
    { label: 'Speed', score: 55, icon: Gauge, desc: 'Core Web Vitals, load time' },
    { label: 'Schema', score: 30, icon: Code2, desc: 'Structured data markup' },
    { label: 'Sitemap', score: 90, icon: MapPin, desc: 'Sitemap & robots.txt' },
    { label: 'Domain Authority', score: 0, icon: Globe, desc: 'Heuristic site authority' },
    { label: 'Spam Score', score: 0, icon: AlertTriangle, desc: 'Heuristic spam detection' },
];

const exhaustiveChecks = EXHAUSTIVE_CHECKS;

type Severity = 'pass' | 'critical' | 'warning' | 'info' | 'pending';
type CheckItem = typeof exhaustiveChecks[0] & { severity: Severity };

const defaultIssues: CheckItem[] = exhaustiveChecks.map(check => ({ ...check, severity: 'pending' }));

const severityConfig = {
    critical: { icon: XCircle, class: 'badge-critical', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    warning: { icon: AlertTriangle, class: 'badge-warning', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    info: { icon: Info, class: 'badge-info', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    pass: { icon: CheckCircle2, class: 'badge-success', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    pending: { icon: RefreshCw, class: 'badge-neutral', color: 'text-muted-foreground', bg: 'bg-white/5 border-white/10' }
};

function ScoreGauge({ score }: { score: number }) {
    const circumference = 2 * Math.PI * 54;
    const progress = ((100 - score) / 100) * circumference;

    return (
        <div className="relative w-40 h-40 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <motion.circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={score >= 80 ? '#22c55e' : score >= 60 ? '#6366f1' : score >= 40 ? '#eab308' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: progress }}
                    transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-4xl font-bold font-display', getScoreColor(score))}>{score}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{getScoreLabel(score)}</span>
            </div>
        </div>
    );
}

function SeoContent() {
    const searchParams = useSearchParams();
    const { activeWebsite, analysisResult, isAnalyzing: isAnalyzingGlobal, runAnalysis } = useWebsite();

    const [overallScore, setOverallScore] = useState(0);
    const [subScores, setSubScores] = useState(defaultSubScores.map(s => ({ ...s, score: 0 })));
    const [issues, setIssues] = useState<CheckItem[]>(defaultIssues);

    const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'pass'>('all');

    // Resolve the URL: query param takes priority, then active website domain
    const resolveUrl = () => {
        const qUrl = searchParams.get('url');
        if (qUrl) return qUrl;
        if (activeWebsite) return activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;
        return '';
    };
    const [scanUrl, setScanUrl] = useState(resolveUrl);

    // When active website changes, update scanUrl
    const qUrl = searchParams.get('url');
    const autoScan = searchParams.get('autoScan') === 'true';

    useEffect(() => {
        const newUrl = resolveUrl();
        if (newUrl) setScanUrl(newUrl);
    }, [activeWebsite?.id, qUrl]);

    useEffect(() => {
        if (autoScan && qUrl) {
            setScanUrl(qUrl);
            runAnalysis(qUrl);
        } else if (!qUrl && activeWebsite && !analysisResult && !isAnalyzingGlobal) {
            // Auto-scan the active website when navigating to /seo if no results
            runAnalysis();
        }
    }, [qUrl, autoScan, activeWebsite?.id]);

    // SYNC: When global analysis result changes, update local state
    useEffect(() => {
        if (!analysisResult) {
            setOverallScore(0);
            setSubScores(defaultSubScores.map(s => ({ ...s, score: 0 })));
            setIssues(defaultIssues);
            return;
        }

        // Map real results to the exhaustive array
        const apiResults: Record<string, Severity> = analysisResult.results;

        const updatedIssues = defaultIssues.map(issue => {
            const apiSev = apiResults[issue.id];
            return {
                ...issue,
                severity: apiSev || 'info'
            };
        });

        setIssues(updatedIssues);

        // Calculate precise score based on how many rules passed
        const totalChecks = updatedIssues.length;
        const passes = updatedIssues.filter(i => i.severity === 'pass').length;
        const warnings = updatedIssues.filter(i => i.severity === 'warning').length;

        const issuePoints = (passes * 3) + warnings;
        const issueMax = totalChecks * 3;

        const daPoints = (analysisResult.stats?.authority?.domainAuthority || 0) * 0.3;
        const spamPoints = (100 - (analysisResult.stats?.authority?.spamScore || 0)) * 0.2;

        const earnedPoints = issuePoints + daPoints + spamPoints;
        const maxOverallPoints = issueMax + 30 + 20;

        const newOverallScore = Math.floor((earnedPoints / maxOverallPoints) * 100);
        setOverallScore(newOverallScore);

        const calculateSubscore = (category: string) => {
            const subset = updatedIssues.filter(i => i.category === category || i.category === 'Code');
            if (!subset.length) return 85;
            const sPasses = subset.filter(i => i.severity === 'pass').length;
            return Math.floor((sPasses / subset.length) * 100);
        };

        setSubScores(defaultSubScores.map(sub => {
            if (sub.label === 'Domain Authority') return { ...sub, score: analysisResult.stats?.authority?.domainAuthority || 0 };
            if (sub.label === 'Spam Score') return { ...sub, score: analysisResult.stats?.authority?.spamScore || 0 };

            return {
                ...sub,
                score: sub.label === 'Speed' ? (analysisResult.stats?.performance?.performanceScore || calculateSubscore('Performance')) :
                    sub.label === 'Content' ? calculateSubscore('Content') :
                        sub.label === 'Technical' ? calculateSubscore('Structure') :
                            calculateSubscore('Indexing')
            };
        }));
    }, [analysisResult]);

    async function runScan(overrideUrl?: string) {
        await runAnalysis(overrideUrl || scanUrl);
    }

    const filteredIssues = filter === 'all' ? issues : issues.filter((i) => i.severity === filter);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display">SEO Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Complete health analysis of your website</p>
                </div>
                <div className="flex flex-col sm:flex-row w-full lg:w-auto items-center gap-3">
                    <div className="relative w-full sm:w-auto">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Globe className="w-4 h-4 text-muted-foreground text-opacity-70" />
                        </div>
                        <input
                            type="url"
                            placeholder="Enter website URL to scan..."
                            value={scanUrl}
                            onChange={(e) => setScanUrl(e.target.value)}
                            className="w-full sm:w-80 h-10 pl-9 pr-4 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder:text-muted-foreground transition-all"
                        />
                    </div>
                    <button onClick={() => runScan()} disabled={isAnalyzingGlobal || !scanUrl} className="btn-primary w-full sm:w-auto flex-shrink-0">
                        <RefreshCw className={cn('w-4 h-4', isAnalyzingGlobal && 'animate-spin')} />
                        {isAnalyzingGlobal ? 'Scanning...' : 'Run Scan'}
                    </button>
                </div>
            </div>

            {/* Overall score + subscores */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Big score */}
                <div className="glass-card p-6 flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-muted-foreground mb-4">Overall SEO Score</p>
                    <ScoreGauge score={overallScore} />
                    <div className="mt-4 flex gap-3">
                        {[{ label: 'Issues', val: issues.length }, { label: 'Critical', val: issues.filter(i => i.severity === 'critical').length }].map((s) => (
                            <div key={s.label} className="text-center">
                                <p className="text-xl font-bold">{s.val}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sub scores */}
                <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {subScores.map((sub, i) => {
                        const Icon = sub.icon;
                        return (
                            <motion.div
                                key={sub.label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className="glass-card-hover p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <Icon className="w-4 h-4 text-muted-foreground" />
                                    <span className={cn('text-lg font-bold font-display', getScoreColor(sub.score))}>
                                        {sub.score}
                                    </span>
                                </div>
                                <p className="font-medium text-sm">{sub.label}</p>
                                <p className="text-xs text-muted-foreground mt-1">{sub.desc}</p>
                                <div className="mt-3 h-1.5 bg-white/8 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${sub.score}%` }}
                                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                                        className={cn(
                                            'h-full rounded-full',
                                            sub.score >= 80 ? 'bg-green-500' :
                                                sub.score >= 60 ? 'bg-brand-500' :
                                                    sub.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                        )}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Issues table */}
            <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="font-semibold font-display flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-brand-400" />
                        Comprehensive Audit Results ({filteredIssues.length})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'critical', 'warning', 'pass'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all border',
                                    filter === f
                                        ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                                        : 'bg-white/5 text-muted-foreground border-transparent hover:bg-white/10 hover:border-white/10'
                                )}
                            >
                                {f} ({f === 'all' ? issues.length : issues.filter(i => i.severity === f).length})
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto custom-scroll pr-2">
                    <AnimatePresence>
                        {filteredIssues.map((issue, i) => {
                            const config = severityConfig[issue.severity];
                            const Icon = config.icon;
                            return (
                                <motion.div
                                    key={issue.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className={cn(
                                        'flex items-start gap-4 p-4 rounded-xl border transition-colors',
                                        config.bg
                                    )}
                                >
                                    <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.color, issue.severity === 'pending' && 'animate-spin')} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <p className="font-medium text-sm text-foreground">{issue.title}</p>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10 uppercase tracking-wider">
                                                {issue.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{issue.suggestion}</p>
                                        {issue.severity !== 'pass' && issue.severity !== 'pending' && (
                                            <div className="mt-2 p-2 rounded bg-white/5 border border-white/10 text-[10px] text-brand-300 leading-relaxed">
                                                <span className="font-bold uppercase tracking-wider text-[9px] text-muted-foreground block mb-1">How to improve:</span>
                                                {issue.howToFix}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default function SeoPage() {
    return (
        <Suspense fallback={<div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-brand-500" /></div>}>
            <SeoContent />
        </Suspense>
    );
}

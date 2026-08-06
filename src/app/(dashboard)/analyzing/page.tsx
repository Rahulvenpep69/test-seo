'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWebsite } from '@/context/website-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Zap, Search, ShieldCheck, Globe, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function AnalyzingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { refreshWebsites } = useWebsite();
    const [status, setStatus] = useState({
        scanned: false,
        crawled: false,
        saved: false
    });
    const url = searchParams.get('url');
    const websiteId = searchParams.get('id');

    useEffect(() => {
        if (!url || !websiteId) return;

        async function runAnalysis() {
            try {
                // 1. Run SEO Scan
                const scanRes = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, websiteId })
                });
                if (scanRes.ok) setStatus(s => ({ ...s, scanned: true }));

                // 2. Run Technical Crawl
                const crawlRes = await fetch('/api/crawl', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, limit: 50 })
                });
                if (crawlRes.ok) setStatus(s => ({ ...s, crawled: true }));

                setStatus(s => ({ ...s, saved: true }));
                // Refresh websites list so it shows up in switcher immediately
                refreshWebsites();
            } catch (error) {
                console.error('In-depth analysis failed', error);
            }
        }

        runAnalysis();
    }, [url, websiteId]);

    const steps = [
        { id: 'scanned', label: 'Benchmark SEO Health', icon: Zap },
        { id: 'crawled', label: 'Crawl Site Architecture', icon: Search },
        { id: 'saved', label: 'Generate Reports', icon: ShieldCheck }
    ];

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <div className="max-w-md w-full space-y-8 text-center">
                <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto border-4 border-brand-500/20">
                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold font-display tracking-tight">Analyzing Your Site</h1>
                    <p className="text-muted-foreground">Checking &quot;{url}&quot; for 30+ SEO parameters</p>
                </div>

                <div className="glass-card p-6 space-y-4 text-left">
                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        const isDone = (status as any)[step.id];
                        const isCurrent = i === Object.values(status).filter(Boolean).length;

                        return (
                            <div key={step.id} className={cn(
                                "flex items-center gap-4 p-3 rounded-lg transition-all",
                                isDone ? "bg-green-500/5" : isCurrent ? "bg-brand-500/5 animate-pulse" : "opacity-40"
                            )}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    isDone ? "bg-green-500 text-white" : "bg-white/10 text-muted-foreground"
                                )}>
                                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                </div>
                                <span className={cn(
                                    "text-sm font-medium",
                                    isDone ? "text-green-400" : isCurrent ? "text-brand-400" : "text-muted-foreground"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {status.saved && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pt-4"
                        >
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="btn-primary w-full py-4 text-lg gap-2"
                            >
                                View Dashboard <ArrowRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function AnalyzingPage() {
    return (
        <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-brand-500 animate-spin" /></div>}>
            <AnalyzingContent />
        </Suspense>
    );
}

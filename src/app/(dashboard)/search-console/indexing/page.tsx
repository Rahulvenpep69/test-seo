'use client';

import React, { useState, useEffect } from 'react';
import { useWebsite } from '@/context/website-context';
import {
    AlertCircle, CheckCircle2, ChevronRight,
    FileText, Globe, Layers, Search,
    ArrowRight, Info, Filter, MoreHorizontal,
    Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function IndexingReportPage() {
    const { activeWebsite } = useWebsite();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [summary, setSummary] = useState<any[]>([]);

    useEffect(() => {
        if (!activeWebsite) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/gsc/indexing?websiteId=${activeWebsite.id}`);
                if (res.ok) {
                    const result = await res.json();
                    setData(result);

                    // Map real data to UI format
                    const sitemaps = result.sitemaps || [];
                    const perf = result.performanceSummary || {};
                    const indexing = result.indexingSummary || {};

                    setSummary([
                        { status: 'Submitted URLs', count: indexing.totalSubmitted || 0, trend: 'Total', color: 'text-brand-400', bg: 'bg-brand-500/10' },
                        { status: 'Indexed URLs', count: indexing.totalIndexed || 0, trend: 'Success', color: 'text-green-400', bg: 'bg-green-500/10' },
                        { status: 'Total Clicks', count: perf.totalClicks, trend: perf.trends?.clicks || 'Synced', color: 'text-brand-400', bg: 'bg-brand-500/10' },
                        { status: 'Sitemap Status', count: indexing.status || 'OK', trend: 'Healthy', color: indexing.status === 'ERR' ? 'text-red-400' : 'text-green-400', bg: 'bg-green-500/10' },
                    ]);
                }
            } catch (error) {
                console.error('Failed to fetch indexing data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [activeWebsite?.id]);

    const detailedIssues = data?.sitemaps?.map((s: any) => {
        let totalSubmitted = 0;
        if (s.contents) {
            s.contents.forEach((c: any) => totalSubmitted += parseInt(c.submitted || '0'));
        }
        return {
            reason: s.path.split('/').pop() || 'Sitemap',
            validation: s.errors > 0 ? 'Errors' : 'Success',
            trend: s.type || 'XML',
            count: totalSubmitted
        };
    }) || [];

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-white/5 rounded w-1/4" />
                    <div className="h-4 bg-white/5 rounded w-1/2" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded" />)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Indexing Report</h1>
                    <p className="text-muted-foreground">Monitor which pages on your site are included in Google Search results.</p>
                </div>
                {data?.property?.lastSyncedAt && (
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/5 shadow-sm">
                        <Clock className="w-3 h-3 text-brand-400" />
                        <span>Last Synced: {new Date(data.property.lastSyncedAt).toLocaleString()}</span>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {summary.map((item, i) => (
                    <div key={i} className={cn("glass-card p-5 border-l-4", item.color === 'text-green-400' || item.color === 'text-brand-400' ? 'border-l-brand-400' : 'border-l-muted-foreground/20')}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">{item.status}</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black">{item.count}</span>
                            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", item.trend === 'Healthy' || item.trend === 'Total' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-muted-foreground')}>
                                {item.trend}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sitemaps */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-bold flex items-center gap-3">
                        <Globe className="w-5 h-5 text-brand-400" />
                        Submitted Sitemaps
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Files that tell Google about the pages on your site.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sitemap Path</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status / Errors</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">URLs Found</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {detailedIssues.length > 0 ? (
                                detailedIssues.map((issue: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => window.open(data?.sitemaps?.[i]?.path, '_blank')}>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-mono truncate max-w-xs group-hover:text-brand-400 transition-colors" title={data?.sitemaps?.[i]?.path}>
                                                {issue.reason}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium uppercase text-muted-foreground/60">{issue.trend}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-1 rounded-full border",
                                                issue.validation === 'Errors' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                                            )}>
                                                {issue.validation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right tabular-nums font-bold">{issue.count}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-sm italic">
                                        No sitemaps submitted to this property yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tips / Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 bg-brand-500/5 border-brand-500/20">
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-brand-400" />
                        Indexing Pro Tip
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        If you have recently added a lot of content, it might take a few days for Google to discover and index all of it. Ensure your <Link href="/sitemap-generator" className="text-brand-400 hover:underline">Sitemap</Link> is up to date and submitted in the GSC dashboard.
                    </p>
                </div>
                <div className="glass-card p-6">
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-premium-gradient">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Validations
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        When you fix an issue that was preventing indexing, use the &quot;Request Indexing&quot; tool here or in the GSC dashboard to tell Google to re-evaluate the affected URLs.
                    </p>
                </div>
            </div>
        </div>
    );
}

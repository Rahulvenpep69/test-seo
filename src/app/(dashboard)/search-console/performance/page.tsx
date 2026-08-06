'use client';

import React, { useState, useEffect } from 'react';
import { useWebsite } from '@/context/website-context';
import {
    BarChart3, MousePointer2, Eye, Target,
    TrendingUp, ArrowUpRight, Search, Globe,
    ChevronDown, Filter, Calendar, Download,
    Smartphone, Monitor, Tablet, List,
    RefreshCw, Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function GscPerformancePage() {
    const { activeWebsite } = useWebsite();
    const [isLoading, setIsLoading] = useState(true);
    const [viewType, setViewType] = useState<'queries' | 'pages' | 'countries' | 'devices'>('queries');
    const [data, setData] = useState<any>(null);

    const fetchData = async () => {
        if (!activeWebsite) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/gsc/performance?websiteId=${activeWebsite.id}`);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch performance data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeWebsite?.id]);

    const getTableContent = () => {
        if (!data) return [];
        switch (viewType) {
            case 'queries': return data.queries || [];
            case 'pages': return data.pages || [];
            case 'countries': return data.countries || [];
            case 'devices': return data.devices || [];
            default: return [];
        }
    };

    const tableRows = getTableContent();

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Performance Report</h1>
                    <p className="text-muted-foreground">Detailed analysis of your search traffic and keyword rankings.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn-secondary py-2 text-xs">
                        <Calendar className="w-3.5 h-3.5 mr-2" />
                        Last 28 Days
                    </button>
                    <button className="btn-secondary py-2 text-xs">
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden glass-card">
                <MiniStat label="Clicks" value={data?.totalClicks?.toLocaleString() || '0'} color="bg-blue-500/20 text-blue-400" />
                <MiniStat label="Impressions" value={data?.totalImpressions?.toLocaleString() || '0'} color="bg-brand-500/20 text-brand-400" />
                <MiniStat label="Avg. CTR" value={`${data?.averageCtr?.toFixed(1) || '0.0'}%`} color="bg-green-500/20 text-green-400" />
                <MiniStat label="Avg. Position" value={data?.averagePosition?.toFixed(1) || '0.0'} color="bg-brand-500/20 text-brand-400" />
            </div>

            {/* Main Data Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex border-b border-white/5">
                    <TabButton active={viewType === 'queries'} onClick={() => setViewType('queries')} label="Queries" />
                    <TabButton active={viewType === 'pages'} onClick={() => setViewType('pages')} label="Pages" />
                    <TabButton active={viewType === 'countries'} onClick={() => setViewType('countries')} label="Countries" />
                    <TabButton active={viewType === 'devices'} onClick={() => setViewType('devices')} label="Devices" />
                </div>

                <div className="p-4 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-semibold hover:bg-white/10">
                            <Filter className="w-3 h-3" />
                            Filter
                        </button>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Showing top {viewType}</p>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-20">
                            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    ) : tableRows.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.01]">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        {viewType === 'queries' ? 'Query' : viewType === 'pages' ? 'Page' : viewType === 'countries' ? 'Country' : 'Device'}
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right w-32">Clicks</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right w-32">Impressions</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right w-24">CTR</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right w-24">Position</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {tableRows.map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 font-medium text-sm group-hover:text-brand-400 transition-colors truncate max-w-[400px]">
                                            {row.query || row.page || row.country || row.device}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right tabular-nums">{row.clicks}</td>
                                        <td className="px-6 py-4 text-sm text-right tabular-nums text-muted-foreground">{Number(row.impressions).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-right tabular-nums text-green-400 font-medium">{row.ctr}%</td>
                                        <td className="px-6 py-4 text-sm text-right tabular-nums text-brand-400 font-bold">{row.position}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <Info className="w-8 h-8 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground text-sm">No data available for this view.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 flex items-center justify-center">
                    <button className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors flex items-center gap-2">
                        View all {viewType}
                        <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value, color }: any) {
    return (
        <div className="p-6 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-white transition-colors">{label}</span>
            <span className={cn("text-xl font-black tabular-nums border-b-2 border-transparent group-hover:border-current pb-1 transition-all", color.split(' ')[1])}>{value}</span>
        </div>
    );
}

function TabButton({ active, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-8 py-4 text-sm font-semibold transition-all relative",
                active ? "text-brand-400 bg-brand-500/[0.03]" : "text-muted-foreground hover:text-white"
            )}
        >
            {label}
            {active && (
                <motion.div
                    layoutId="active-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400"
                />
            )}
        </button>
    );
}

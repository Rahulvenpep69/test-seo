'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3, Search, Plus, Globe, TrendingUp,
    ExternalLink, Trash2, RefreshCw, Shield,
    ArrowUpRight, Users, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CompetitorTrackingPage() {
    const [competitors, setCompetitors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function fetchCompetitors() {
            try {
                const query = search ? `?q=${encodeURIComponent(search)}` : '';
                const res = await fetch(`/api/admin/competitors${query}`);
                const data = await res.json();
                if (res.ok) setCompetitors(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to fetch competitors:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchCompetitors();
    }, [search]);

    const avgDA = competitors.length > 0
        ? Math.round(competitors.reduce((acc, c) => acc + (c.domainAuthority || 0), 0) / competitors.length)
        : 0;

    const statCards = [
        { label: 'Total Tracked', value: competitors.length, icon: BarChart3, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        { label: 'Avg Domain Authority', value: avgDA || '—', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Active Sites', value: competitors.filter(c => c.status !== 'INACTIVE').length, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Websites Using', value: new Set(competitors.map(c => c.websiteId)).size, icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Competitor Tracking
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Monitor competitor websites tracked by your users — domain authority, rankings, and activity.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.location.reload()} className="btn-secondary py-2 text-sm flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Sync Data
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-card p-5 relative overflow-hidden group hover:border-white/20 transition-all"
                    >
                        <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-20", stat.bg)} />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className={cn("p-2 rounded-lg bg-white/5 border border-white/10")}>
                                <stat.icon className={cn("w-4 h-4", stat.color)} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold relative z-10">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium relative z-10">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by competitor domain or site name..."
                    className="input-base pl-10 w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Competitors Table */}
            <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h3 className="text-sm font-semibold">All Tracked Competitors</h3>
                    <span className="text-xs text-muted-foreground">{competitors.length} results</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/2">
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Competitor Domain</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tracked By (Website)</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Domain Authority</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Since</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">Loading competitors...</td></tr>
                            ) : competitors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-muted-foreground font-medium">No competitors tracked yet</p>
                                        <p className="text-muted-foreground/60 text-xs mt-1">Users can add competitor domains from their website dashboard.</p>
                                    </td>
                                </tr>
                            ) : competitors.map((comp) => (
                                <tr key={comp.id} className="hover:bg-white/2 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{comp.domain}</p>
                                                <a
                                                    href={`https://${comp.domain}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] text-muted-foreground hover:text-brand-400 flex items-center gap-0.5 transition-colors w-fit"
                                                >
                                                    Visit <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-brand-400 font-medium">{comp.website?.name || 'Unknown'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {comp.domainAuthority ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                                                    comp.domainAuthority >= 70 ? "border-green-500 text-green-400" :
                                                        comp.domainAuthority >= 40 ? "border-yellow-500 text-yellow-400" :
                                                            "border-red-500/50 text-red-400"
                                                )}>
                                                    {comp.domainAuthority}
                                                </div>
                                            </div>
                                        ) : <span className="text-muted-foreground/40 text-sm">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-muted-foreground">
                                        {comp.createdAt ? new Date(comp.createdAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={`https://${comp.domain}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all"
                                                title="Visit Site"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                            <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all" title="Remove">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

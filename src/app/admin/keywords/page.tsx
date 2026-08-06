'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Database, Search, Filter, Download, TrendingUp,
    TrendingDown, Minus, Globe, ArrowUpRight, BarChart3,
    Hash, Target, RefreshCw, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KeywordDatabasePage() {
    const [keywords, setKeywords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function fetchKeywords() {
            try {
                const query = search ? `?q=${encodeURIComponent(search)}` : '';
                const res = await fetch(`/api/admin/keywords${query}`);
                const data = await res.json();
                if (res.ok) setKeywords(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to fetch keywords:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchKeywords();
    }, [search]);

    const avgPosition = keywords.length > 0
        ? Math.round(keywords.reduce((acc, k) => acc + (k.position || 0), 0) / keywords.length)
        : 0;
    const topKeywords = keywords.filter(k => (k.position || 99) <= 10).length;

    const statCards = [
        { label: 'Total Keywords', value: keywords.length, icon: Hash, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        { label: 'Top 10 Rankings', value: topKeywords, icon: Target, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Avg Position', value: avgPosition || '—', icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Sites Tracked', value: new Set(keywords.map(k => k.websiteId)).size, icon: Globe, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ];

    const getTrendIcon = (change: number) => {
        if (change > 0) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
        if (change < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
        return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Keyword Database
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Monitor keyword rankings, search volumes, and position changes across all tracked websites.</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary py-2 text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button onClick={() => window.location.reload()} className="btn-primary py-2 text-sm flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
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
                            <div className={cn("p-2 rounded-lg bg-white/5 border border-white/10", stat.bg)}>
                                <stat.icon className={cn("w-4 h-4", stat.color)} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold relative z-10">{stat.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium relative z-10">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by keyword or website..."
                    className="input-base pl-10 w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Keywords Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/8 bg-white/2">
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keyword</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Website</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Position</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Change</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Volume</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Updated</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">Loading keywords...</td></tr>
                            ) : keywords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <Database className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-muted-foreground font-medium">No keywords tracked yet</p>
                                        <p className="text-muted-foreground/60 text-xs mt-1">Users can add keywords from the keyword tracking feature in their dashboard.</p>
                                    </td>
                                </tr>
                            ) : keywords.map((keyword) => (
                                <tr key={keyword.id} className="hover:bg-white/2 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-brand-500/60 flex-shrink-0" />
                                            <span className="text-sm font-medium">{keyword.keyword}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-3.5 h-3.5 text-muted-foreground/50" />
                                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{keyword.website?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn(
                                            "inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold border-2",
                                            (keyword.position || 0) <= 3 ? "border-green-500 text-green-400 bg-green-500/10" :
                                                (keyword.position || 0) <= 10 ? "border-brand-500 text-brand-400 bg-brand-500/10" :
                                                    (keyword.position || 0) <= 30 ? "border-yellow-500 text-yellow-400 bg-yellow-500/10" :
                                                        "border-red-500/50 text-red-400 bg-red-500/10"
                                        )}>
                                            {keyword.position || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {getTrendIcon(keyword.positionChange || 0)}
                                            <span className={cn(
                                                "text-xs font-bold",
                                                (keyword.positionChange || 0) > 0 ? "text-green-400" :
                                                    (keyword.positionChange || 0) < 0 ? "text-red-400" : "text-muted-foreground"
                                            )}>
                                                {Math.abs(keyword.positionChange || 0)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {keyword.searchVolume ? keyword.searchVolume.toLocaleString() : '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-muted-foreground">
                                        {keyword.updatedAt ? new Date(keyword.updatedAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-white/8 bg-white/2 flex items-center justify-between text-xs text-muted-foreground">
                    <p>Total {keywords.length} keywords tracked</p>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Top 3</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500" /> Top 10</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Top 30</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

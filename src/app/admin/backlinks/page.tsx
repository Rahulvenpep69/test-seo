'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Search, Download, ExternalLink, Trash2,
    RefreshCw, Link2, Shield, Globe, TrendingUp,
    CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BacklinkDatabasePage() {
    const [backlinks, setBacklinks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        async function fetchBacklinks() {
            try {
                const params = new URLSearchParams();
                if (search) params.append('q', search);
                if (typeFilter) params.append('type', typeFilter);
                const res = await fetch(`/api/admin/backlinks?${params.toString()}`);
                const data = await res.json();
                if (res.ok) setBacklinks(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to fetch backlinks:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchBacklinks();
    }, [search, typeFilter]);

    const dofollowCount = backlinks.filter(b => b.type === 'DOFOLLOW').length;
    const dofollowPct = backlinks.length > 0 ? Math.round((dofollowCount / backlinks.length) * 100) : 0;
    const avgDA = backlinks.length > 0
        ? Math.round(backlinks.reduce((acc, b) => acc + (b.domainAuthority || 0), 0) / backlinks.length)
        : 0;

    const statCards = [
        { label: 'Total Backlinks', value: backlinks.length, icon: Link2, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        { label: 'Dofollow %', value: `${dofollowPct}%`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Avg Domain Authority', value: avgDA || '—', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Unique Domains', value: new Set(backlinks.map(b => b.sourceUrl?.split('/')[2])).size, icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20"><CheckCircle2 className="w-3 h-3" />Active</span>;
            case 'LOST':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" />Lost</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><AlertCircle className="w-3 h-3" />Unknown</span>;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Backlink Database
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Platform-wide backlink index — sources, authority, link type, and live status.</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary py-2 text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button onClick={() => window.location.reload()} className="btn-primary py-2 text-sm flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Re-Crawl
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
                        <div className="mb-3 relative z-10">
                            <div className={cn("p-2 rounded-lg bg-white/5 border border-white/10 w-fit")}>
                                <stat.icon className={cn("w-4 h-4", stat.color)} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold relative z-10">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium relative z-10">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by source URL or target domain..."
                        className="input-base pl-10 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="input-base text-sm px-4"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">All Link Types</option>
                    <option value="DOFOLLOW">Dofollow</option>
                    <option value="NOFOLLOW">Nofollow</option>
                </select>
            </div>

            {/* Backlinks Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/8 bg-white/2">
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source URL</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">DA</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">Loading backlinks...</td></tr>
                            ) : backlinks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <Link2 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-muted-foreground font-medium">No backlinks in the database</p>
                                        <p className="text-muted-foreground/60 text-xs mt-1">Run a backlink crawl from a website&apos;s dashboard to populate this table.</p>
                                    </td>
                                </tr>
                            ) : backlinks.map((link) => (
                                <tr key={link.id} className="hover:bg-white/2 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[220px]">{link.sourceUrl}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-medium truncate max-w-[140px]">{link.targetUrl || link.website?.name}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                            link.type === 'DOFOLLOW'
                                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                        )}>
                                            {link.type || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-bold">{link.domainAuthority || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(link.status || 'ACTIVE')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={link.sourceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                            <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-white/8 bg-white/2 text-xs text-muted-foreground">
                    Total {backlinks.length} backlinks indexed
                </div>
            </div>
        </div>
    );
}

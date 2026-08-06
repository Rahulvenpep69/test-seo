'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileText, Search, Download, Filter,
    Globe, Clock, CheckCircle2, Send,
    AlertCircle, Eye, Trash2, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReportsManagementPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        async function fetchReports() {
            try {
                const query = search ? `?q=${encodeURIComponent(search)}` : '';
                const res = await fetch(`/api/admin/audits${query}`);
                const data = await res.json();
                if (res.ok) setReports(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to fetch reports');
            } finally {
                setIsLoading(false);
            }
        }
        fetchReports();
    }, [search]);

    const filteredReports = statusFilter
        ? reports.filter(r => (r.overallScore >= 80 ? 'GOOD' : r.overallScore >= 50 ? 'AVERAGE' : 'POOR') === statusFilter)
        : reports;

    const statCards = [
        { label: 'Total Reports', value: reports.length, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        { label: 'High Quality (≥80)', value: reports.filter(r => r.overallScore >= 80).length, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Need Attention (<50)', value: reports.filter(r => r.overallScore < 50).length, color: 'text-red-400', bg: 'bg-red-500/10' },
        { label: 'Generated Today', value: reports.filter(r => new Date(r.createdAt) > new Date(Date.now() - 86400000)).length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    ];

    const getScoreBadge = (score: number) => {
        const label = score >= 80 ? 'GOOD' : score >= 50 ? 'AVERAGE' : 'POOR';
        const cls = score >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
            score >= 50 ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
                'bg-red-500/10 text-red-400 border-red-500/20';
        return <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", cls)}>{label}</span>;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Reports Management
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">View, download, and manage all generated SEO audit reports across the platform.</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary py-2 text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export All
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
                        className="glass-card p-5 relative overflow-hidden hover:border-white/20 transition-all"
                    >
                        <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-20", stat.bg)} />
                        <p className="text-2xl font-bold relative z-10">{stat.value.toLocaleString()}</p>
                        <p className={cn("text-xs font-semibold mt-1 relative z-10", stat.color)}>{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by website name or domain..."
                        className="input-base pl-10 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="input-base text-sm px-4"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Scores</option>
                    <option value="GOOD">Good (≥80)</option>
                    <option value="AVERAGE">Average (50–79)</option>
                    <option value="POOR">Poor (&lt;50)</option>
                </select>
            </div>

            {/* Reports Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/8 bg-white/2">
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Report / Website</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">SEO Score</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quality</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Issues</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Generated</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">Loading reports...</td></tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-muted-foreground font-medium">No reports found</p>
                                        <p className="text-muted-foreground/60 text-xs mt-1">Run SEO audits from the Websites page to generate reports.</p>
                                    </td>
                                </tr>
                            ) : filteredReports.map((report) => (
                                <tr key={report.id} className="hover:bg-white/2 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{report.website?.name || 'Untitled'}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{report.website?.domain || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={cn(
                                            "inline-flex items-center justify-center w-10 h-10 rounded-full border-2 text-xs font-bold",
                                            report.overallScore >= 80 ? "border-green-500 text-green-400" :
                                                report.overallScore >= 50 ? "border-brand-500 text-brand-400" :
                                                    "border-red-500 text-red-400"
                                        )}>
                                            {report.overallScore}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{getScoreBadge(report.overallScore)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn(
                                            "text-sm font-bold",
                                            (report.issuesFound || 0) > 10 ? "text-red-400" :
                                                (report.issuesFound || 0) > 5 ? "text-yellow-400" : "text-green-400"
                                        )}>
                                            {report.issuesFound || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all" title="View Report">
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button className="p-1.5 rounded-lg hover:bg-brand-500/20 text-muted-foreground hover:text-brand-400 transition-all" title="Download PDF">
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all" title="Delete">
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
                    Showing {filteredReports.length} of {reports.length} reports
                </div>
            </div>
        </div>
    );
}

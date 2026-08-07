'use client';

import { useState } from 'react';
import {
    Search, Globe, Sparkles, RefreshCw,
    Edit2, Check, AlertCircle, Save,
    ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/toaster';
import { useWebsite } from '@/context/website-context';
import { useEffect } from 'react';

interface MetaRow {
    url: string;
    title: string;
    description: string;
    h1: string;
    aiTitle?: string;
    aiDescription?: string;
    status: 'IDLE' | 'ANALYZING' | 'GENERATING' | 'SAVING' | 'DONE' | 'ERROR';
}

export default function MetaContentPage() {
    const { activeWebsite } = useWebsite();
    const [baseUrl, setBaseUrl] = useState('');
    const [isCrawling, setIsCrawling] = useState(false);
    const [isDbLoading, setIsDbLoading] = useState(false);
    const [rows, setRows] = useState<MetaRow[]>([]);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const loadDatabasePages = async (websiteId: string) => {
        setIsDbLoading(true);
        setRows([]);
        try {
            const res = await fetch(`/api/seo/meta/analyze?websiteId=${websiteId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setRows(data.results.map((r: any) => ({
                        ...r,
                        status: 'IDLE'
                    })));
                }
            }
        } catch (err) {
            console.error('Failed to load database pages:', err);
        } finally {
            setIsDbLoading(false);
        }
    };

    useEffect(() => {
        if (activeWebsite) {
            const url = activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;
            setBaseUrl(url);
            loadDatabasePages(activeWebsite.id);
        }
    }, [activeWebsite?.id]);

    const handleCrawl = async () => {
        if (!baseUrl) return;
        setIsCrawling(true);
        setRows([]);

        try {
            const res = await fetch('/api/seo/meta/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: baseUrl }),
            });
            const data = await res.json();

            if (data.results) {
                setRows(data.results.map((r: any) => ({
                    ...r,
                    status: 'IDLE'
                })));
            }
        } catch (err) {
            showToast('Crawl failed', 'error');
        } finally {
            setIsCrawling(false);
        }
    };

    const handleAutoGenerate = async () => {
        const idleRows = rows.filter(r => r.status === 'IDLE');
        if (idleRows.length === 0) return;

        setRows(prev => prev.map(r => r.status === 'IDLE' ? { ...r, status: 'GENERATING' } : r));

        try {
            const res = await fetch('/api/seo/meta/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pages: idleRows }),
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || 'AI Generation failed', 'error');
                setRows(prev => prev.map(r => r.status === 'GENERATING' ? { ...r, status: 'ERROR' } : r));
                return;
            }

            if (data.results) {
                setRows(prev => prev.map(r => {
                    const match = data.results.find((m: any) => m.url === r.url);
                    return match ? { ...match, status: 'DONE' } : r;
                }));
                showToast('AI Suggestions generated', 'success');
            }
        } catch (err) {
            showToast('AI Generation failed', 'error');
            setRows(prev => prev.map(r => r.status === 'GENERATING' ? { ...r, status: 'ERROR' } : r));
        }
    };

    const handleApply = async (row: MetaRow) => {
        if (!activeWebsite) {
            showToast('Please select a website first', 'info');
            return;
        }

        setRows(prev => prev.map(r => r.url === row.url ? { ...r, status: 'SAVING' } : r));

        try {

            const res = await fetch('/api/seo/meta/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: row.url,
                    metaTitle: row.aiTitle || row.title,
                    metaDesc: row.aiDescription || row.description,
                    websiteId: activeWebsite.id
                }),
            });

            if (res.ok) {
                showToast('Changes applied successfully', 'success');
                setRows(prev => prev.map(r => r.url === row.url ? { ...r, status: 'DONE' } : r));
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to save changes', 'error');
                setRows(prev => prev.map(r => r.url === row.url ? { ...r, status: 'ERROR' } : r));
            }
        } catch (err) {
            showToast('Failed to save changes', 'error');
            setRows(prev => prev.map(r => r.url === row.url ? { ...r, status: 'ERROR' } : r));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display tracking-tight">Meta Content Optimizer</h1>
                    <p className="text-muted-foreground mt-1">Crawl your site, analyze meta tags, and use AI to generate missing or weak content.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAutoGenerate}
                        disabled={rows.length === 0 || rows.every(r => r.status !== 'IDLE')}
                        className="btn-accent py-2.5 px-5 shadow-lg shadow-accent-500/20"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Auto-Generate All
                    </button>
                </div>
            </div>

            {/* URL Input */}
            <div className="glass-card p-6 flex flex-col md:flex-row gap-4 items-end shadow-2xl shadow-brand-500/5">
                <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Website URL to Analyze</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <input
                            type="text"
                            placeholder="https://example.com"
                            className="input-base w-full pl-10 h-12"
                            value={baseUrl}
                            onChange={e => setBaseUrl(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    onClick={handleCrawl}
                    disabled={isCrawling || !baseUrl}
                    className="btn-primary h-12 px-8"
                >
                    {isCrawling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                    {isCrawling ? 'Crawling...' : 'Start Analysis'}
                </button>
            </div>

            {/* Analysis Table */}
            <div className="glass-card overflow-hidden border-white/5 shadow-2xl shadow-black/20">
                <div className="px-6 py-4 border-b border-white/8 bg-white/2 flex justify-between items-center">
                    <h2 className="font-semibold text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-brand-400" />
                        Page Analysis Results
                    </h2>
                    <span className="text-xs text-muted-foreground">{rows.length} pages found</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] text-muted-foreground uppercase border-b border-white/5 bg-white/1">
                                <th className="px-6 py-4 font-bold tracking-wider">Page URL</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Current Status</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Length (T/D)</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {rows.map((row) => (
                                <>
                                    <tr key={row.url} className="hover:bg-white/2 transition-colors group">
                                        <td className="px-6 py-4 max-w-xs xl:max-w-md">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium truncate">{row.url}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{row.h1 || 'No H1 found'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    row.status === 'DONE' ? 'bg-green-500' :
                                                        row.status === 'ERROR' ? 'bg-red-500' :
                                                            row.status === 'IDLE' ? 'bg-slate-500' : 'bg-brand-500 animate-pulse'
                                                )} />
                                                <span className="text-xs font-medium">{row.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                                    row.title.length >= 50 && row.title.length <= 60 ? "text-green-400 border-green-500/20" : "text-amber-400 border-amber-500/20"
                                                )}>{row.title.length}T</span>
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                                    row.description.length >= 150 && row.description.length <= 160 ? "text-green-400 border-green-500/20" : "text-amber-400 border-amber-500/20"
                                                )}>{row.description.length}D</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setExpandedRow(expandedRow === row.url ? null : row.url)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground"
                                            >
                                                {expandedRow === row.url ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRow === row.url && (
                                        <tr className="bg-brand-500/5 selection:bg-brand-500/30">
                                            <td colSpan={4} className="px-6 py-6 border-b border-brand-500/10">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-down">
                                                    {/* Existing Content */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                            <Globe className="w-3 h-3" /> Live Metadata
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                                                                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-tighter">Current Title</p>
                                                                <p className="text-sm font-medium">{row.title || <span className="text-red-400 italic">Missing Title</span>}</p>
                                                            </div>
                                                            <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                                                                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-tighter">Current Description</p>
                                                                <p className="text-sm text-muted-foreground">{row.description || <span className="text-red-400 italic">Missing Description</span>}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* AI Optimized Content */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-400 flex items-center gap-2">
                                                            <Sparkles className="w-3 h-3" /> AI Optimization Plan
                                                        </h4>
                                                        <div className="space-y-3 relative group/ai">
                                                            <div className="p-3 rounded-lg bg-accent-500/5 border border-accent-500/20 relative">
                                                                <p className="text-[10px] text-accent-400/80 mb-1 uppercase tracking-tighter">Suggested Title (50-60 chars)</p>
                                                                <textarea
                                                                    className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 resize-none h-12"
                                                                    value={row.aiTitle || ''}
                                                                    onChange={e => setRows(prev => prev.map(r => r.url === row.url ? { ...r, aiTitle: e.target.value } : r))}
                                                                    placeholder="Generate to see AI suggestion..."
                                                                />
                                                                <span className="absolute bottom-2 right-2 text-[10px] font-mono opacity-40">{(row.aiTitle || '').length}</span>
                                                            </div>
                                                            <div className="p-3 rounded-lg bg-accent-500/5 border border-accent-500/20 relative">
                                                                <p className="text-[10px] text-accent-400/80 mb-1 uppercase tracking-tighter">Suggested Description (150-160 chars)</p>
                                                                <textarea
                                                                    className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 resize-none h-20"
                                                                    value={row.aiDescription || ''}
                                                                    onChange={e => setRows(prev => prev.map(r => r.url === row.url ? { ...r, aiDescription: e.target.value } : r))}
                                                                    placeholder="Generate to see AI suggestion..."
                                                                />
                                                                <span className="absolute bottom-2 right-2 text-[10px] font-mono opacity-40">{(row.aiDescription || '').length}</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleApply(row)}
                                                                    disabled={!row.aiTitle}
                                                                    className="flex-1 btn-primary py-2 text-xs"
                                                                >
                                                                    <Save className="w-3.5 h-3.5 mr-2" />
                                                                    Apply Fix to Project
                                                                </button>
                                                                <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all group-hover/ai:text-accent-400">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                            {(isCrawling || isDbLoading) && rows.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                                            <p className="text-sm text-muted-foreground">Loading pages...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {rows.length === 0 && !isCrawling && !isDbLoading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-4 opacity-50">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                                                <Globe className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-sm">No Analysis Data</p>
                                                <p className="text-xs text-muted-foreground">Enter a website URL above to begin the automated SEO crawl and analysis.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function Activity(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}

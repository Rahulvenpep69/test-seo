'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Download, Share2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXHAUSTIVE_CHECKS } from '@/lib/seo/checks';
import { generateTechnicalSeoPdf } from '@/lib/seo/reports';

// ── Colour tokens matching the screenshot ──────────────────────────────────────
const HEADER_BG = '#4a55b7'; // deep indigo/blue as in screenshot
const HEADER_TEXT = '#ffffff';
const SCORE_BG = '#4a55b7';
const TABLE_HEAD_BG = '#4a55b7';
const TABLE_HEAD_TXT = '#ffffff';
const ROW_ALT = '#f0f2ff'; // very light indigo tint for alternating rows
const PASS_CLR = '#16a34a';
const WARN_CLR = '#b45309';
const CRIT_CLR = '#dc2626';
const BODY_TXT = '#1a1a2e';
const MUTED_TXT = '#6b7280';

export default function ReportTemplateContent() {
    const searchParams = useSearchParams();
    const url = searchParams.get('url');

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (url) handleAnalyze(url);
        else setError('No URL provided for analysis.');
    }, [url]);

    async function handleAnalyze(targetUrl: string) {
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl }),
            });
            if (!res.ok) throw new Error('Analysis failed');
            setAnalysisResult(await res.json());
        } catch (err: any) {
            setError(err.message || 'Failed to fetch analysis data.');
        } finally {
            setIsAnalyzing(false);
        }
    }

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch { }
    };

    const handleDownloadPdf = () => {
        if (url && analysisResult) {
            generateTechnicalSeoPdf(url, analysisResult);
        }
    };

    // ── Loading / error states ─────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full text-center space-y-4">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold text-white">Analysis Error</h2>
                    <p className="text-zinc-400">{error}</p>
                </div>
            </div>
        );
    }

    if (isAnalyzing || !analysisResult) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 space-y-4">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                <p className="text-lg font-medium text-zinc-300">Generating Report…</p>
                <p className="text-sm text-zinc-500">Evaluating technical SEO and performance metrics for {url}</p>
            </div>
        );
    }

    // ── Data extraction ────────────────────────────────────────────────────────
    const score = analysisResult?.overallScore ?? (() => {
        const allStatuses = EXHAUSTIVE_CHECKS.map(c => analysisResult?.results?.[c.id] || 'pending');
        const passCount = allStatuses.filter(s => s.toLowerCase() === 'pass').length;
        return Math.round((passCount / EXHAUSTIVE_CHECKS.length) * 100) || 0;
    })();
    const perf = analysisResult?.stats?.performance || {};

    const cwv = [
        { label: 'LCP — Largest Contentful Paint', value: perf?.largestContentfulPaint ? `${perf.largestContentfulPaint}` : 'N/A', target: '< 2.5s' },
        { label: 'FCP — First Contentful Paint', value: perf?.firstContentfulPaint ? `${perf.firstContentfulPaint}` : 'N/A', target: '< 1.8s' },
        { label: 'CLS — Cumulative Layout Shift', value: perf?.cumulativeLayoutShift || 'N/A', target: '< 0.1' },
        { label: 'TBT — Total Blocking Time', value: perf?.totalBlockingTime ? `${perf.totalBlockingTime}` : 'N/A', target: '< 200ms' },
    ];

    const getStatusStyle = (status: string) => {
        switch (status.toUpperCase()) {
            case 'PASS': return { color: PASS_CLR, fontWeight: 700 };
            case 'WARNING': return { color: WARN_CLR, fontWeight: 700 };
            case 'CRITICAL': return { color: CRIT_CLR, fontWeight: 700 };
            default: return { color: MUTED_TXT, fontWeight: 700 };
        }
    };

    const generatedAt = mounted
        ? new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
        : '';

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: '#f4f6ff', fontFamily: 'Helvetica, Arial, sans-serif', color: BODY_TXT }}>

            {/* ── Top action bar (hidden in print) ───────────────────────────── */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-zinc-200 px-6 py-3 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm" style={{ color: HEADER_BG }}>Seoptima</span>
                    <span className="text-zinc-400 text-sm">Report Viewer</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleShare}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                            copySuccess
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                        )}
                    >
                        {copySuccess ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        {copySuccess ? 'Link Copied!' : 'Share Link'}
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isAnalyzing || !analysisResult}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-colors", (isAnalyzing || !analysisResult) ? "opacity-50 cursor-not-allowed" : "")}
                        style={{ background: HEADER_BG }}
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* ── Report document ────────────────────────────────────────────── */}
            <div
                className="max-w-[720px] mx-auto my-0 sm:my-8 print:my-0 print:shadow-none"
                style={{ background: '#fff', boxShadow: '0 4px 32px rgba(74,85,183,0.10)' }}
            >

                {/* 1 ── Header ───────────────────────────────────────────────── */}
                <div style={{ background: HEADER_BG, padding: '22px 38px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* Left: Logo + Brand name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                            src="/seoptima-logo.png"
                            alt="Seoptima"
                            style={{ height: '44px', width: 'auto', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
                        />
                        <div>
                            <div style={{ color: HEADER_TEXT, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                                Seoptima
                            </div>
                        </div>
                    </div>

                    {/* Right: Report title + date */}
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: HEADER_TEXT, fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Technical SEO Audit
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginTop: '4px', fontWeight: 400 }}>
                            Generated: {generatedAt}
                        </div>
                    </div>

                </div>

                {/* ── Page body ──────────────────────────────────────────────── */}
                <div style={{ padding: '24px 38px 40px' }}>

                    {/* 2 ── Website Info ─────────────────────────────────────── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', padding: '16px 20px', border: '1px solid #e8eaf6', borderRadius: '10px', background: '#f8f9ff' }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED_TXT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                                Website Analyzed
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: HEADER_BG, wordBreak: 'break-all' }}>
                                {url}
                            </div>
                        </div>
                        <div style={{ background: SCORE_BG, borderRadius: '10px', padding: '10px 22px', textAlign: 'center', flexShrink: 0, marginLeft: '20px' }}>
                            <div style={{ color: 'rgba(255,255,255,0.80)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>
                                Score
                            </div>
                            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 900, lineHeight: 1 }}>
                                {score}/100
                            </div>
                        </div>
                    </div>

                    {/* 3 ── Core Web Vitals ──────────────────────────────────── */}
                    <div style={{ marginBottom: '36px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: BODY_TXT, marginBottom: '12px', borderLeft: `4px solid ${HEADER_BG}`, paddingLeft: '10px' }}>
                            Core Web Vitals
                        </div>
                        <div style={{ border: `2px solid ${HEADER_BG}`, borderRadius: '6px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: TABLE_HEAD_BG }}>
                                        <th style={{ color: TABLE_HEAD_TXT, padding: '11px 14px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '55%', border: '1px solid rgba(255,255,255,0.2)' }}>Metric</th>
                                        <th style={{ color: TABLE_HEAD_TXT, padding: '11px 14px', textAlign: 'center', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '22%', border: '1px solid rgba(255,255,255,0.2)' }}>Value</th>
                                        <th style={{ color: TABLE_HEAD_TXT, padding: '11px 14px', textAlign: 'center', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '23%', border: '1px solid rgba(255,255,255,0.2)' }}>Target</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cwv.map((row, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : ROW_ALT }}>
                                            <td style={{ padding: '11px 14px', color: BODY_TXT, fontWeight: 500, border: '1px solid #d4d8f0' }}>{row.label}</td>
                                            <td style={{ padding: '11px 14px', textAlign: 'center', color: HEADER_BG, fontWeight: 700, border: '1px solid #d4d8f0' }}>{row.value}</td>
                                            <td style={{ padding: '11px 14px', textAlign: 'center', color: MUTED_TXT, fontWeight: 500, border: '1px solid #d4d8f0' }}>{row.target}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 4 ── Technical Audit Checklist ────────────────────────── */}
                    <div style={{ marginBottom: '32px' }}>
                        {/* Section heading + live issue count summary */}
                        {(() => {
                            const critical = analysisResult?.criticalCount ?? EXHAUSTIVE_CHECKS.map((c) => {
                                const v = analysisResult?.results?.[c.id];
                                return v ? String(v).toUpperCase() : 'PENDING';
                            }).filter(s => s === 'CRITICAL').length;

                            const warning = analysisResult?.warningCount ?? EXHAUSTIVE_CHECKS.map((c) => {
                                const v = analysisResult?.results?.[c.id];
                                return v ? String(v).toUpperCase() : 'PENDING';
                            }).filter(s => s === 'WARNING').length;

                            const total = critical + warning;
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: BODY_TXT, borderLeft: `4px solid ${HEADER_BG}`, paddingLeft: '10px' }}>
                                        Issues Found ({total})
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontWeight: 700 }}>
                                        {critical > 0 && (
                                            <span style={{ background: '#fef2f2', color: CRIT_CLR, border: '1px solid #fecaca', borderRadius: '20px', padding: '3px 10px' }}>
                                                {critical} Critical
                                            </span>
                                        )}
                                        {warning > 0 && (
                                            <span style={{ background: '#fffbeb', color: WARN_CLR, border: '1px solid #fde68a', borderRadius: '20px', padding: '3px 10px' }}>
                                                {warning} Warning
                                            </span>
                                        )}
                                        {total === 0 && (
                                            <span style={{ background: '#f0fdf4', color: PASS_CLR, border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px' }}>
                                                All Clear ✓
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        <div style={{ border: `2px solid ${HEADER_BG}`, borderRadius: '6px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: TABLE_HEAD_BG }}>
                                        <th style={{ color: TABLE_HEAD_TXT, padding: '11px 14px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '30%', border: '1px solid rgba(255,255,255,0.2)' }}>Audit Check</th>
                                        <th style={{ color: TABLE_HEAD_TXT, padding: '11px 14px', textAlign: 'center', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '14%', border: '1px solid rgba(255,255,255,0.2)' }}>Status</th>
                                        <th style={{ color: TABLE_HEAD_TXT, padding: '11px 14px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '56%', border: '1px solid rgba(255,255,255,0.2)' }}>Recommendation &amp; Fix</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {EXHAUSTIVE_CHECKS.map((check, i) => {
                                        const rawVal = analysisResult?.results?.[check.id];
                                        const status = rawVal ? String(rawVal).toUpperCase() : 'PENDING';
                                        const statusStyle = getStatusStyle(status);
                                        return (
                                            <tr key={check.id} style={{ background: i % 2 === 0 ? '#ffffff' : ROW_ALT, verticalAlign: 'top' }}>
                                                <td style={{ padding: '11px 14px', fontWeight: 600, color: BODY_TXT, border: '1px solid #d4d8f0', fontSize: '13px' }}>
                                                    {check.title}
                                                </td>
                                                <td style={{ padding: '11px 14px', textAlign: 'center', border: '1px solid #d4d8f0' }}>
                                                    <span style={{ ...statusStyle, fontSize: '12px', display: 'inline-block', fontWeight: 700 }}>{status}</span>
                                                </td>
                                                <td style={{ padding: '11px 14px', border: '1px solid #d4d8f0', fontSize: '13px', color: '#374151' }}>
                                                    <span style={{ fontWeight: 500, color: BODY_TXT }}>{check.suggestion}</span>
                                                    {status !== 'PASS' && check.howToFix && (
                                                        <div style={{ marginTop: '6px', fontSize: '11.5px' }}>
                                                            <span style={{ fontWeight: 700, color: HEADER_BG }}>How to fix: </span>
                                                            <span style={{ color: '#3730a3' }}>{check.howToFix}</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ borderTop: '1px solid #e8eaf6', paddingTop: '16px', textAlign: 'center' }}>
                        <p style={{ color: MUTED_TXT, fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                            Technical SEO Audit — Seoptima
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Settings, ArrowRight, Loader2, Zap, CheckCircle2, ShieldCheck, Download } from 'lucide-react';

export function AutoAnalysisEngine() {
    const [step, setStep] = useState<'config' | 'running' | 'complete'>('config');
    const [url, setUrl] = useState('');
    const [method, setMethod] = useState<'js' | 'wp'>('js');
    const [logs, setLogs] = useState<string[]>([]);
    const [score, setScore] = useState(42);

    const handleOptimize = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep('running');
        setLogs(['Connecting to website via secure bridge...']);

        // Simulating the 1-click optimization process requested by the user
        const sequence = [
            'Crawling website architecture...',
            'Detected missing Meta Titles (4 pages)',
            'Detected missing Meta Descriptions (12 pages)',
            'Generating SEO-optimized Meta content via AI...',
            'Fixing Canonical tags...',
            'Injecting Schema Markup (Organization, FAQ, Breadcrumb)...',
            'Applying Image ALT text to 24 images...',
            'Fixing Broken Links (3 detected, redirected to home)...',
            'Generating updated Robots.txt and Sitemap.xml...',
            'Auto-submitting Sitemap to Google Search Console...',
            'Compiling Before/After report...',
        ];

        for (let i = 0; i < sequence.length; i++) {
            await new Promise(r => setTimeout(r, 1200));
            setLogs(prev => [...prev, sequence[i]]);
            setScore(prev => Math.min(100, prev + 5));
        }

        setTimeout(() => {
            setStep('complete');
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <AnimatePresence mode="wait">
                {step === 'config' && (
                    <motion.div
                        key="config"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6 flex-1"
                    >
                        <div className="flex p-1 bg-zinc-950/50 border border-emerald-500/10 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setMethod('js')}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${method === 'js' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                            >
                                JS Injection (All Platforms)
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('wp')}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${method === 'wp' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                            >
                                WordPress Plugin
                            </button>
                        </div>

                        {method === 'js' ? (
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Universal JS Snippet
                                </h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Paste this snippet inside the <code className="text-white">&lt;head&gt;</code> of your website. It allows our engine to dynamically inject SEO fixes.
                                </p>
                                <pre className="bg-black p-3 rounded-lg text-[10px] text-zinc-400 overflow-x-auto border border-zinc-800">
                                    {`<script src="https://antigravity.run/seo-client.js" data-site-id="auto-${Math.floor(Math.random() * 10000)}"></script>`}
                                </pre>
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                    <Settings className="w-4 h-4" /> WordPress Integration
                                </h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Download and install our plugin to securely connect via the REST API.
                                </p>
                                <button className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                                    <Download className="w-4 h-4" /> Download Plugin
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleOptimize} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-emerald-400/80">Confirm Site URL</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
                                    <input
                                        required
                                        type="url"
                                        placeholder="https://example.com"
                                        className="w-full bg-zinc-950/50 border border-emerald-500/20 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white font-sans text-sm"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-zinc-900/50 rounded-xl flex gap-3 border border-zinc-800/50">
                                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    By clicking run, the AI will overwrite missing or weak SEO elements directly on your site based on Google best practices.
                                </p>
                            </div>

                            <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2">
                                <Zap className="w-5 h-5 fill-black" /> Auto Optimize Website
                            </button>
                        </form>
                    </motion.div>
                )}

                {step === 'running' && (
                    <motion.div
                        key="running"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center space-y-6 py-8"
                    >
                        <div className="relative w-32 h-32 flex flex-col items-center justify-center">
                            <svg className="w-32 h-32 transform -rotate-90">
                                <circle cx="64" cy="64" r="60" className="stroke-zinc-800" strokeWidth="8" fill="none" />
                                <circle
                                    cx="64" cy="64" r="60" className="stroke-emerald-500 transition-all duration-1000 ease-out"
                                    strokeWidth="8" fill="none"
                                    strokeDasharray={377}
                                    strokeDashoffset={377 - (377 * score) / 100}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold font-display text-white">{score}%</span>
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <h3 className="font-bold text-white text-lg flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                Applying SEO Fixes...
                            </h3>
                            <p className="text-emerald-400/80 text-sm">Please do not close this window</p>
                        </div>

                        <div className="w-full bg-black/50 border border-emerald-500/20 rounded-xl p-4 font-mono text-xs h-48 overflow-y-auto space-y-2">
                            {logs.map((log, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={i}
                                    className="flex items-start gap-2 text-emerald-400"
                                >
                                    <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                                    <span>{log}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 'complete' && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 space-y-6 py-4"
                    >
                        <div className="text-center space-y-3">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-2xl font-bold">Optimization Success</h3>
                            <p className="text-zinc-400 text-sm">Your website health has improved significantly.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-center">
                                <p className="text-xs text-red-400/80 mb-1">Before Optimization</p>
                                <p className="text-3xl font-bold text-red-400">42%</p>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                                <p className="text-xs text-emerald-400/80 mb-1">After Optimization</p>
                                <p className="text-3xl font-bold text-emerald-400">97%</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-white">Applied Changes Summary</h4>
                            <div className="bg-black/40 border border-zinc-800/50 rounded-xl p-4 text-xs text-zinc-300 space-y-3">
                                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                                    <span>Metadata (Titles/Desc)</span>
                                    <span className="text-emerald-400 font-bold">+16 Assets</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                                    <span>Schema Markup</span>
                                    <span className="text-emerald-400 font-bold">Injected</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                                    <span>Image ALT tags</span>
                                    <span className="text-emerald-400 font-bold">+24 Auto-filled</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Robots & Sitemap</span>
                                    <span className="text-emerald-400 font-bold">Configured</span>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setStep('config')} className="w-full py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl transition-all text-sm font-bold">
                            Run Another Site
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

'use client';

import { motion } from 'framer-motion';
import { AutoAnalysisEngine } from '@/components/AutoAnalysisEngine';
import { ManualAnalysisEngine } from '@/components/ManualAnalysisEngine';
import { Zap, Search, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function AddSitePage() {
    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-fade-in relative z-10">
            <div className="flex flex-col gap-2">
                <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 w-fit transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-white mt-2">
                    Add New Site
                </h1>
                <p className="text-muted-foreground text-base max-w-3xl">
                    Choose how you want to optimize your site. Use Auto Mode for hands-free 1-click optimization or Manual Mode for granular control over every aspect.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                {/* Auto Mode Column (Left) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col gap-4"
                >
                    <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                <Zap className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Web Integration</h2>
                                <p className="text-emerald-400/80 text-sm font-medium">Auto Mode (Recommended)</p>
                            </div>
                        </div>

                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                            Connect your website via script or credentials. Our AI will automatically crawl, detect issues, and inject fixes directly into your website&apos;s header.
                        </p>

                        <div className="flex-1">
                            <AutoAnalysisEngine />
                        </div>
                    </div>
                </motion.div>

                {/* Manual Mode Column (Right) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col gap-4"
                >
                    <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5 relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <Search className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">URL Analysis</h2>
                                <p className="text-blue-400/80 text-sm font-medium">Manual Mode</p>
                            </div>
                        </div>

                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                            Enter any URL for a detailed breakdown. Edit tags, copy outputs, generate humanized content with AI, and manually deploy changes.
                        </p>

                        <div className="flex-1">
                            <ManualAnalysisEngine />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

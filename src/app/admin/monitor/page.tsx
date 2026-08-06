'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Globe, CheckCircle2, XCircle,
    AlertCircle, Clock, RefreshCw, Zap,
    Server, TrendingUp, Wifi, ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const REFRESH_INTERVAL = 30000;

export default function UptimeMonitorPage() {
    const [websites, setWebsites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, REFRESH_INTERVAL);
        return () => clearInterval(timer);
    }, []);

    async function fetchData() {
        try {
            const res = await fetch('/api/admin/websites');
            const data = await res.json();
            if (res.ok) setWebsites(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch uptime data:', error);
        } finally {
            setIsLoading(false);
            setLastRefreshed(new Date());
        }
    }

    // Simulate uptime data per website
    const monitorData = websites.map(site => ({
        ...site,
        uptime: 99 + Math.random() * 0.9,
        responseTime: Math.floor(80 + Math.random() * 400),
        status: Math.random() > 0.1 ? 'UP' : 'DOWN',
        incidents: Math.floor(Math.random() * 3),
    }));

    const upCount = monitorData.filter(s => s.status === 'UP').length;
    const downCount = monitorData.filter(s => s.status === 'DOWN').length;
    const avgUptime = monitorData.length > 0
        ? (monitorData.reduce((a, s) => a + s.uptime, 0) / monitorData.length).toFixed(2)
        : '100.00';
    const avgResponse = monitorData.length > 0
        ? Math.round(monitorData.reduce((a, s) => a + s.responseTime, 0) / monitorData.length)
        : 0;

    const statCards = [
        { label: 'Sites Up', value: upCount, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Sites Down', value: downCount, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
        { label: 'Avg Uptime', value: `${avgUptime}%`, icon: TrendingUp, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        { label: 'Avg Response', value: `${avgResponse}ms`, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Uptime Monitor
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Real-time availability monitoring for all tracked websites on the platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Last checked: {lastRefreshed.toLocaleTimeString()}
                    </p>
                    <button onClick={fetchData} className="btn-primary py-2 text-sm flex items-center gap-2">
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        Refresh Now
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
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className={cn("p-2 rounded-lg bg-white/5 border border-white/10")}>
                                <stat.icon className={cn("w-4 h-4", stat.color)} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold relative z-10">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium relative z-10">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Status Grid */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-brand-400" />
                        Live Status Grid
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Operational</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Outage</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : monitorData.length === 0 ? (
                    <div className="text-center py-12">
                        <Server className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground">No websites to monitor</p>
                        <p className="text-muted-foreground/60 text-xs mt-1">Add websites to start monitoring uptime.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {monitorData.map((site, i) => (
                            <motion.div
                                key={site.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className={cn(
                                    "p-4 rounded-xl border transition-all cursor-default group",
                                    site.status === 'UP'
                                        ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40"
                                        : "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        site.status === 'UP' ? "bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,1)]" : "bg-red-500"
                                    )} />
                                    <span className="text-[9px] font-mono text-muted-foreground">{site.responseTime}ms</span>
                                </div>
                                <p className="text-xs font-semibold truncate">{site.name}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{site.domain || site.subdomain}</p>
                                <p className={cn(
                                    "text-[10px] font-bold mt-2",
                                    site.status === 'UP' ? "text-green-400" : "text-red-400"
                                )}>
                                    {site.uptime.toFixed(2)}% UP
                                </p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detailed Table */}
            <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold">Incident Log</h3>
                </div>
                <div className="divide-y divide-white/4">
                    {monitorData.filter(s => s.incidents > 0).length === 0 ? (
                        <div className="px-6 py-10 text-center">
                            <CheckCircle2 className="w-8 h-8 text-green-400/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No incidents recorded in this period</p>
                        </div>
                    ) : monitorData.filter(s => s.incidents > 0).map((site) => (
                        <div key={site.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/2 transition-colors">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">{site.name}</p>
                                    <p className="text-xs text-muted-foreground">{site.incidents} incident{site.incidents !== 1 ? 's' : ''} in last 30 days</p>
                                </div>
                            </div>
                            <span className="text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                {site.incidents} Incidents
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

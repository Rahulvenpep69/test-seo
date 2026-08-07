'use client';

import { useEffect, useState } from 'react';
import {
    LayoutDashboard, Users, Globe, Search, BarChart3,
    Megaphone, FileText, Settings, Key, Database,
    Mail, Bell, Newspaper, Lock, ScrollText,
    CreditCard, Activity, Bot, Shield, Save,
    RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavItems = [
    {
        group: 'Platform',
        items: [
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, hideToggle: true },
            { href: '/admin/users', label: 'User Management', icon: Users, hideToggle: true },
            { href: '/admin/websites', label: 'Website Management', icon: Globe },
        ],
    },
    {
        group: 'SEO & Data',
        items: [
            { href: '/admin/audits', label: 'SEO Audits', icon: Search },
            { href: '/admin/keywords', label: 'Keyword Database', icon: Database },
            { href: '/admin/competitors', label: 'Competitor Data', icon: BarChart3 },
            { href: '/admin/backlinks', label: 'Backlink Database', icon: Activity },
            { href: '/admin/reports', label: 'Reports', icon: FileText },
        ],
    },
    {
        group: 'System',
        items: [
            { href: '/admin/api', label: 'API Management', icon: Key },
            { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
            { href: '/admin/notifications', label: 'Notifications', icon: Bell },
            { href: '/admin/monitor', label: 'Uptime Monitor', icon: Activity },
            { href: '/admin/automation', label: 'Automation', icon: Bot },
            { href: '/admin/cms', label: 'Blog / CMS', icon: Newspaper },
        ],
    },
    {
        group: 'Configuration',
        items: [
            { href: '/admin/settings', label: 'System Settings', icon: Settings },
            { href: '/admin/features', label: 'Feature Management', icon: Shield }, // Changed icon to shield to match page imports/existing ones
            { href: '/admin/security', label: 'Security', icon: Shield },
            { href: '/admin/logs', label: 'System Logs', icon: ScrollText },
        ],
    },
];

export default function FeatureManagementPage() {
    const [featureStatus, setFeatureStatus] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchFeatures();
    }, []);

    const fetchFeatures = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/features');
            if (res.ok) {
                const data = await res.json();
                const statusMap: Record<string, boolean> = {};

                // Set defaults based on adminNavItems
                adminNavItems.forEach(group => {
                    group.items.forEach(item => {
                        statusMap[item.href] = true;
                    });
                });

                // Override with DB data
                data.forEach((flag: any) => {
                    statusMap[flag.name] = flag.enabled;
                });

                setFeatureStatus(statusMap);
            }
        } catch (error) {
            console.error('Failed to fetch features');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFeature = async (href: string) => {
        const newStatus = !featureStatus[href];
        setIsSaving(href);

        // Optimistic UI update
        setFeatureStatus(prev => ({
            ...prev,
            [href]: newStatus
        }));

        try {
            const res = await fetch('/api/admin/features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: href, enabled: newStatus })
            });

            if (!res.ok) {
                // Rollback if failed
                setFeatureStatus(prev => ({
                    ...prev,
                    [href]: !newStatus
                }));
                alert('Failed to save feature status');
            }
        } catch (error) {
            setFeatureStatus(prev => ({
                ...prev,
                [href]: !newStatus
            }));
            alert('Error updating feature status');
        } finally {
            setIsSaving(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold font-display">Feature Management</h1>
                <p className="text-muted-foreground mt-1">Enable or disable platform features globally. Changes affect both Admin and User dashboards.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminNavItems.map((group) => (
                    <div key={group.group} className="glass-card flex flex-col">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{group.group}</h2>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                                {group.items.filter(i => !i.hideToggle).length} Toggleable
                            </span>
                        </div>
                        <div className="divide-y divide-white/5 flex-1">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isEnabled = featureStatus[item.href];
                                const isBeingSaved = isSaving === item.href;

                                if (item.hideToggle) {
                                    return (
                                        <div key={item.href} className="p-4 flex items-center gap-3 opacity-50 bg-black/10">
                                            <Icon className="w-5 h-5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{item.label}</p>
                                                <p className="text-[10px] text-muted-foreground">Core System Feature (Always Enabled)</p>
                                            </div>
                                            <Shield className="w-4 h-4 text-brand-400" />
                                        </div>
                                    );
                                }

                                return (
                                    <div key={item.href} className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            isEnabled ? "bg-brand-500/10 text-brand-400" : "bg-white/5 text-muted-foreground"
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium">{item.label}</p>
                                                {isBeingSaved && <RefreshCw className="w-3 h-3 animate-spin text-brand-400" />}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{item.href}</p>
                                        </div>

                                        <button
                                            onClick={() => toggleFeature(item.href)}
                                            disabled={isBeingSaved}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                                                isEnabled ? 'bg-brand-500' : 'bg-white/10'
                                            )}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                                                )}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card p-4 border-l-4 border-brand-500 bg-brand-500/5">
                <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <div>
                        <h3 className="text-sm font-semibold">Live Updates Enabled</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Changes are saved instantly to the database. Users will see these changes the next time they navigate or refresh their dashboard.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

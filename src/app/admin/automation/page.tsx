'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Plus, Zap, Bell, Globe, Search, Mail,
    BarChart3, Clock, CheckCircle2,
    ChevronRight, Settings, X, Play, Pause, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AutomationRule = {
    id: string;
    name: string;
    trigger: string;
    action: string;
    frequency: string;
    enabled: boolean;
    lastRun: string | null;
    runs: number;
    icon: any;
    color: string;
    bg: string;
};

const defaultRules: AutomationRule[] = [
    {
        id: '1',
        name: 'Weekly SEO Health Report',
        trigger: 'Every Monday at 8:00 AM',
        action: 'Send email digest to all active users',
        frequency: 'Weekly',
        enabled: true,
        lastRun: '2026-03-31',
        runs: 24,
        icon: Mail,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
    },
    {
        id: '2',
        name: 'Auto-Audit on Site Add',
        trigger: 'When a new website is added',
        action: 'Trigger full SEO audit automatically',
        frequency: 'Per Event',
        enabled: true,
        lastRun: '2026-04-05',
        runs: 142,
        icon: Globe,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
    },
    {
        id: '3',
        name: 'Critical Score Alert',
        trigger: 'When SEO score drops below 40',
        action: 'Notify user and admin via email',
        frequency: 'Per Event',
        enabled: true,
        lastRun: '2026-04-02',
        runs: 9,
        icon: Bell,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
    },
    {
        id: '4',
        name: 'Monthly Platform Summary',
        trigger: '1st of every month',
        action: 'Generate and email admin usage report',
        frequency: 'Monthly',
        enabled: false,
        lastRun: '2026-04-01',
        runs: 3,
        icon: BarChart3,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
    },
    {
        id: '5',
        name: 'Keyword Position Watcher',
        trigger: 'Daily at Midnight',
        action: 'Check keyword positions and log changes',
        frequency: 'Daily',
        enabled: true,
        lastRun: '2026-04-05',
        runs: 180,
        icon: Search,
        color: 'text-brand-400',
        bg: 'bg-brand-500/10',
    },
];

export default function AutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRule, setNewRule] = useState({ name: '', trigger: '', action: '', frequency: 'Daily' });

    const toggleRule = (id: string) => {
        setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    };

    const deleteRule = (id: string) => {
        if (!confirm('Remove this automation rule?')) return;
        setRules(rules.filter(r => r.id !== id));
    };

    const addRule = () => {
        if (!newRule.name || !newRule.trigger || !newRule.action) {
            alert('Please fill in all fields.');
            return;
        }
        const rule: AutomationRule = {
            id: Date.now().toString(),
            name: newRule.name,
            trigger: newRule.trigger,
            action: newRule.action,
            frequency: newRule.frequency,
            enabled: true,
            lastRun: null,
            runs: 0,
            icon: Zap,
            color: 'text-brand-400',
            bg: 'bg-brand-500/10',
        };
        setRules([...rules, rule]);
        setNewRule({ name: '', trigger: '', action: '', frequency: 'Daily' });
        setShowAddModal(false);
    };

    const activeCount = rules.filter(r => r.enabled).length;
    const totalRuns = rules.reduce((acc, r) => acc + r.runs, 0);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Automation Rules
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Configure triggers and automated actions that run on your platform 24/7.</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary py-2 text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Rule
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                        <Bot className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{rules.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Rules</p>
                    </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                        <Play className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Rules</p>
                    </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Executions</p>
                    </div>
                </div>
            </div>

            {/* Rules List */}
            <div className="space-y-4">
                {rules.map((rule, i) => (
                    <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                            "glass-card p-5 flex items-start gap-5 transition-all group hover:border-white/20",
                            !rule.enabled && "opacity-60"
                        )}
                    >
                        <div className={cn("p-3 rounded-xl border flex-shrink-0 mt-0.5", rule.bg, "border-white/10")}>
                            <rule.icon className={cn("w-5 h-5", rule.color)} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm">{rule.name}</h3>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground uppercase tracking-widest font-bold">
                                    {rule.frequency}
                                </span>
                                {rule.enabled ? (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold uppercase">Active</span>
                                ) : (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground font-bold uppercase">Paused</span>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    Trigger: <span className="text-foreground/70">{rule.trigger}</span>
                                </span>
                                <span className="hidden sm:block text-white/10">•</span>
                                <span className="flex items-center gap-1.5">
                                    <ChevronRight className="w-3 h-3" />
                                    Action: <span className="text-foreground/70">{rule.action}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                                <span>{rule.runs} executions</span>
                                {rule.lastRun && <span>Last run: {new Date(rule.lastRun).toLocaleDateString()}</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                            {/* Toggle */}
                            <button
                                onClick={() => toggleRule(rule.id)}
                                className={cn(
                                    "relative inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                    rule.enabled ? 'bg-brand-500' : 'bg-white/20'
                                )}
                                title={rule.enabled ? 'Pause Rule' : 'Activate Rule'}
                            >
                                <span className={cn(
                                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out",
                                    rule.enabled ? 'translate-x-5' : 'translate-x-0'
                                )} />
                            </button>

                            <button
                                onClick={() => deleteRule(rule.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Add Rule Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="glass-card w-full max-w-lg p-6 relative z-10"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-brand-500/20">
                                        <Bot className="w-5 h-5 text-brand-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">New Automation Rule</h3>
                                        <p className="text-xs text-muted-foreground">Define a trigger and automated action</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Rule Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Weekly SEO Health Report"
                                        className="input-base w-full"
                                        value={newRule.name}
                                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Trigger</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Every Monday at 8:00 AM"
                                        className="input-base w-full"
                                        value={newRule.trigger}
                                        onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Action</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Email weekly digest to all users"
                                        className="input-base w-full"
                                        value={newRule.action}
                                        onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Frequency</label>
                                    <select
                                        className="input-base w-full"
                                        value={newRule.frequency}
                                        onChange={(e) => setNewRule({ ...newRule, frequency: e.target.value })}
                                    >
                                        <option>Per Event</option>
                                        <option>Hourly</option>
                                        <option>Daily</option>
                                        <option>Weekly</option>
                                        <option>Monthly</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary py-2">Cancel</button>
                                <button onClick={addRule} className="flex-1 btn-primary py-2 flex items-center justify-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Create Rule
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

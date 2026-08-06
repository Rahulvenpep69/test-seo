'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWebsite } from '@/context/website-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, PenTool, LayoutTemplate, BriefcaseBusiness, Store, Zap, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

const GOALS = [
    { id: 'BUSINESS', icon: BriefcaseBusiness, title: 'Business Site', desc: 'Attract clients and showcase your services' },
    { id: 'ECOMMERCE', icon: Store, title: 'Store', desc: 'Sell products and manage orders' },
    { id: 'PORTFOLIO', icon: LayoutTemplate, title: 'Portfolio', desc: 'Display your work and projects' },
    { id: 'BLOG', icon: PenTool, title: 'Blog', desc: 'Share your thoughts and grow an audience' },
];

const BUILDER_MODES = [
    {
        id: 'AI',
        icon: Sparkles,
        title: 'AI Auto-Generation',
        desc: 'Answer 3 questions and our AI builds the entire site in 60 seconds. Best for quick launches.',
        badge: 'Recommended'
    },
    {
        id: 'MANUAL',
        icon: LayoutTemplate,
        title: 'Start from Scratch',
        desc: 'Full control. Use our drag-and-drop builder with premium blocks to design exactly what you want.',
    },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { refreshWebsites } = useWebsite();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [goal, setGoal] = useState('');
    const [domain, setDomain] = useState('');
    const [builderMode, setBuilderMode] = useState('');

    const handleNext = () => setStep(s => Math.min(s + 1, 3));
    const handlePrev = () => setStep(s => Math.max(s - 1, 1));

    const handleComplete = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: domain || 'My Website', // Temporary name
                    subdomain: domain ? domain.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined,
                    goal,
                    builderMode
                })
            });

            if (res.ok) {
                // Refresh websites list
                await refreshWebsites();

                if (builderMode === 'AI') {
                    router.push('/builder/ai-wizard');
                } else {
                    const data = await res.json();
                    router.push(`/analyzing?url=https://${domain}.antigravity.run&id=${data.websiteId}`);
                }
            } else {
                console.error('Failed to save onboarding data');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error:', error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-border/50 flex items-center px-6 shrink-0 relative z-10 bg-background/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <img src="/seoptima-logo.png" alt="Seoptima" className="h-10 w-auto object-contain" />
                </div>
                <div className="ml-auto flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className={step >= 1 ? 'text-foreground' : ''}>Goal</span>
                    <span className="text-border/50">/</span>
                    <span className={step >= 2 ? 'text-foreground' : ''}>Domain</span>
                    <span className="text-border/50">/</span>
                    <span className={step >= 3 ? 'text-foreground' : ''}>Builder</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center relative overflow-hidden py-12 px-4">
                {/* Background effects */}
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-600/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="w-full max-w-2xl relative">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <h1 className="text-4xl font-display font-bold">What&apos;s your primary goal?</h1>
                                    <p className="text-muted-foreground text-lg">We&apos;ll tailor your experience and templates based on your choice.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {GOALS.map((g) => (
                                        <button
                                            key={g.id}
                                            onClick={() => {
                                                setGoal(g.id);
                                                handleNext();
                                            }}
                                            className={`p-6 rounded-2xl border text-left transition-all duration-200 group relative overflow-hidden ${goal === g.id
                                                ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500'
                                                : 'border-border/50 bg-card hover:border-brand-500/50 hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${goal === g.id ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground group-hover:text-foreground'
                                                }`}>
                                                <g.icon className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">{g.title}</h3>
                                            <p className="text-muted-foreground text-sm">{g.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8 max-w-xl mx-auto"
                            >
                                <div className="text-center space-y-2">
                                    <h1 className="text-4xl font-display font-bold">Choose a starting domain</h1>
                                    <p className="text-muted-foreground text-lg">You can claim a free subdomain now and add a custom domain later.</p>
                                </div>

                                <div className="glass-card p-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Free Seoptima Subdomain</label>
                                            <div className="flex bg-background border border-border/50 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all">
                                                <input
                                                    type="text"
                                                    value={domain}
                                                    onChange={(e) => setDomain(e.target.value)}
                                                    placeholder="my-awesome-site"
                                                    className="flex-1 bg-transparent px-4 py-3 outline-none min-w-0"
                                                />
                                                <div className="bg-muted px-4 flex items-center text-muted-foreground font-medium border-l border-border/50">
                                                    .antigravity.run
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Only letters, numbers, and hyphens allowed.</p>
                                        </div>

                                        <div className="relative py-4">
                                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50"></div></div>
                                            <div className="relative flex justify-center text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                                <span className="bg-card px-4">OR</span>
                                            </div>
                                        </div>

                                        <button className="w-full py-4 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground hover:text-foreground hover:border-brand-500/50 hover:bg-muted/30 transition-all flex items-center justify-center gap-2 font-medium">
                                            <Globe className="w-5 h-5" />
                                            I already own a custom domain
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <button onClick={handlePrev} className="btn-secondary gap-2 px-6">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={!domain}
                                        className="btn-primary gap-2 px-8"
                                    >
                                        Continue <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <h1 className="text-4xl font-display font-bold">How do you want to build?</h1>
                                    <p className="text-muted-foreground text-lg">Choose your preferred method for creating your new website.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {BUILDER_MODES.map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setBuilderMode(mode.id)}
                                            className={`p-8 rounded-3xl border text-left transition-all duration-300 group relative overflow-hidden flex flex-col h-full ${builderMode === mode.id
                                                ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500 scale-[1.02]'
                                                : 'border-border/50 bg-card hover:border-brand-500/30 hover:bg-muted/50'
                                                }`}
                                        >
                                            {mode.badge && (
                                                <div className="absolute top-4 right-4 bg-gradient-to-r from-brand-500 to-accent-500 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full">
                                                    {mode.badge}
                                                </div>
                                            )}
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${builderMode === mode.id || mode.id === 'AI' ? 'bg-gradient-to-br from-brand-500 to-accent-500 text-white' : 'bg-muted text-muted-foreground group-hover:text-foreground'
                                                }`}>
                                                <mode.icon className="w-7 h-7" />
                                            </div>
                                            <h3 className="text-2xl font-bold mb-3">{mode.title}</h3>
                                            <p className="text-muted-foreground leading-relaxed flex-1">{mode.desc}</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-8 border-t border-border/50">
                                    <button onClick={handlePrev} className="btn-secondary gap-2 px-6" disabled={isLoading}>
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button
                                        onClick={handleComplete}
                                        disabled={!builderMode || isLoading}
                                        className="btn-primary gap-2 px-8 py-3 text-lg h-auto"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Setting up...
                                            </span>
                                        ) : builderMode === 'AI' ? (
                                            <>Start AI Generation <Sparkles className="w-5 h-5" /></>
                                        ) : (
                                            <>Enter Builder <ArrowRight className="w-5 h-5" /></>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

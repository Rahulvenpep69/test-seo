import Link from 'next/link';
import { Zap, Search, Sparkles, Bot, BarChart3, ArrowRight, Check, Shield, Globe, TrendingUp } from 'lucide-react';

const features = [
    { icon: Search, title: 'SEO Health Dashboard', desc: 'Real-time SEO score (0–100) with technical, content, speed, schema & sitemap breakdowns.', color: 'from-brand-600 to-brand-500' },
    { icon: Sparkles, title: 'AI Content Engine', desc: 'Generate titles, meta descriptions, product copy & FAQs optimized for Google, AEO, and GEO.', color: 'from-accent-600 to-accent-500' },
    { icon: Bot, title: 'Automation Brain', desc: 'Self-healing SEO — triggers fire automatically when issues are detected. Fix errors on autopilot.', color: 'from-green-600 to-green-500' },
    { icon: Globe, title: 'Website Builder', desc: 'AI-generated or drag-and-drop builder. Full CMS, ecommerce, blog, and portfolio support.', color: 'from-orange-600 to-orange-500' },
    { icon: BarChart3, title: 'Ads Intelligence', desc: 'Google Ads + Meta Ads analytics in one dashboard. CTR, CPC, ROAS, and Ads Health Score.', color: 'from-red-600 to-red-500' },
    { icon: TrendingUp, title: 'Monthly Reports', desc: 'Auto-generated PDF reports with SEO improvements, issues fixed, and performance changes.', color: 'from-purple-600 to-purple-500' },
];

const stats = [
    { value: '10K+', label: 'Websites Optimized' },
    { value: '95%', label: 'Avg Score Improvement' },
    { value: '50M+', label: 'AI Tokens Generated' },
    { value: '4.9★', label: 'User Rating' },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/6 bg-background/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <img src="/seoptima-logo.png" alt="Seoptima" className="h-10 w-auto object-contain" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
                        <Link href="/signup" className="btn-primary text-sm">Get started free</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-36 pb-28 px-4 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.15] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-radial from-brand-600/30 via-accent-600/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

                <div className="relative max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10 cursor-pointer">
                        <Sparkles className="w-4 h-4 text-accent-400" />
                        <span className="text-sm text-foreground/90 font-medium">Powered by Advanced AI</span>
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-7xl font-extrabold font-display tracking-tight leading-[1.1]">
                        AI-Powered <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-accent-400 to-brand-400 animate-pulse-slow">Growth Platform</span>
                        <br />
                        for Modern Websites
                    </h1>

                    <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                        Analyze, optimize, and scale your website with intelligent automation.
                        Everything you need to improve performance, visibility, and conversions — in one place.
                    </p>

                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup" className="flex items-center justify-center px-8 py-4 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] w-full sm:w-auto text-base">
                            Start Free <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                        <Link href="/login" className="flex items-center justify-center px-8 py-4 text-foreground/80 hover:text-foreground bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all w-full sm:w-auto text-base">
                            View Demo
                        </Link>
                    </div>

                    <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground/80">
                        {['No credit card required', 'Free plan available', 'Instant insights & automation'].map((item) => (
                            <span key={item} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-400" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-12 px-4 border-y border-white/8">
                <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-3xl font-bold font-display gradient-text">{stat.value}</p>
                            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold font-display">
                            Everything you need to{' '}
                            <span className="gradient-text">dominate search</span>
                        </h2>
                        <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
                            23 modules working together as one intelligent platform. From website builder to AI SEO engine to ads intelligence.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={feature.title} className="glass-card-hover p-6">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold font-display mb-2">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-accent-500/10 pointer-events-none" />
                <div className="relative max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 mb-4 p-2 rounded-full bg-white/5 border border-white/10">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-muted-foreground">Enterprise-grade security & RBAC</span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-bold font-display">
                        Ready to grow on <span className="gradient-text">autopilot?</span>
                    </h2>
                    <p className="mt-4 text-muted-foreground text-lg">
                        Join thousands of websites that let AI handle their SEO while they focus on what matters.
                    </p>
                    <Link href="/signup" className="btn-primary inline-flex mt-8 text-base py-3 px-8 gap-2">
                        Launch your platform <Zap className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/8 py-8 px-4">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <img src="/seoptima-logo.png" alt="Seoptima" className="h-8 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
                        <span>© 2026</span>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                        <Link href="/terms" className="hover:text-foreground">Terms</Link>
                        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

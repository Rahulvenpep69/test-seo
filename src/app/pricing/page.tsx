'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check, Shield, Zap, Target, Star, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
    {
        id: 'GROWTH',
        name: 'Growth',
        price: '2,900',
        description: 'Perfect for growing businesses',
        features: ['10 Website Monitors', 'Basic SEO Audits', 'Daily Keyword Tracking', 'Standard Support'],
        icon: Zap,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10'
    },
    {
        id: 'PRO',
        name: 'Professional',
        price: '7,900',
        description: 'Best for agencies and power users',
        features: ['50 Website Monitors', 'Advanced SEO Insights', 'Hourly Keyword Updates', 'Priority Email Support', 'White-label Reports'],
        icon: Target,
        color: 'text-brand-400',
        bg: 'bg-brand-500/10',
        popular: true
    },
    {
        id: 'AGENCY',
        name: 'Agency',
        price: '19,900',
        description: 'Enterprise-grade monitoring solution',
        features: ['Unlimited Monitors', 'Full API Access', 'Custom SEO Strategy', '24/7 Dedicated Support', 'Custom Domain Status Pages'],
        icon: Star,
        color: 'text-accent-400',
        bg: 'bg-accent-500/10'
    }
];

export default function PricingPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    useEffect(() => {
        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handlePayment = async (planId: string) => {
        if (!session) {
            router.push('/login?callbackUrl=/pricing');
            return;
        }

        setLoading(planId);

        try {
            // 1. Create Order on Backend
            const res = await fetch('/api/razorpay/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            });

            const orderData = await res.json();

            if (!res.ok) throw new Error(orderData.error);

            // 2. Initialize Razorpay Checkout
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "SEOptima",
                description: `Subscription for ${planId} Plan`,
                order_id: orderData.id,
                handler: async function (response: any) {
                    try {
                        // 3. Verify Payment
                        const verifyRes = await fetch('/api/razorpay/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...response,
                                planId,
                                amount: orderData.amount
                            })
                        });

                        if (verifyRes.ok) {
                            router.push('/pricing/success');
                        } else {
                            router.push('/pricing/failure');
                        }
                    } catch (err) {
                        console.error('Verification failed', err);
                        router.push('/pricing/failure');
                    }
                },
                prefill: {
                    name: session.user.name || '',
                    email: session.user.email || '',
                },
                theme: {
                    color: "#6366f1"
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                console.error(response.error);
                router.push('/pricing/failure');
            });
            rzp.open();
        } catch (err: any) {
            alert(err.message || "Failed to initiate payment");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-surface pt-24 pb-20 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-400 mb-4">Pricing Plans</h2>
                    <h1 className="text-5xl font-bold font-display tracking-tight text-white mb-6">
                        Scale your SEO <br /><span className="text-brand-400">effortlessly</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Choose the perfect plan for your project. From simple blogs to enterprise-grade agencies.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={cn(
                                "glass-card p-8 flex flex-col relative overflow-hidden group transition-all duration-300",
                                plan.popular ? "border-brand-500/50 shadow-2xl shadow-brand-500/10 scale-105 z-10" : "hover:border-white/20"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 py-1.5 px-4 bg-brand-500 text-[10px] font-bold uppercase tracking-widest text-white rounded-bl-xl">
                                    Most Popular
                                </div>
                            )}

                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", plan.bg)}>
                                <plan.icon className={cn("w-6 h-6", plan.color)} />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                            <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold text-white">₹{plan.price}</span>
                                <span className="text-muted-foreground text-sm">/mo</span>
                            </div>

                            <div className="space-y-4 mb-10 flex-1">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                        </div>
                                        <span className="text-sm text-muted-foreground">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handlePayment(plan.id)}
                                disabled={loading !== null}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                                    plan.popular
                                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600"
                                        : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                                )}
                            >
                                {loading === plan.id ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Upgrade Now
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-20 glass-card p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center border border-brand-500/20">
                            <Shield className="w-8 h-8 text-brand-400" />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white">Secure Payments</h4>
                            <p className="text-muted-foreground text-sm mt-1">
                                Your payments are processed securely via Razorpay. <br />
                                We don&apos;t store your credit card information.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 grayscale opacity-40">
                        <img src="https://razorpay.com/assets/razorpay-logo-white.svg" alt="Razorpay" className="h-6" />
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, ArrowRight, Chrome } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email: email.trim().toLowerCase(),
                password: password.trim(),
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email or password');
            } else if (result?.ok) {
                router.push('/dashboard');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Login failed. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogle() {
        setIsLoading(true);
        await signIn('google', { callbackUrl: '/dashboard' });
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
            {/* Background glow orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-600/15 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md mx-4"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-6">
                        <img src="/seoptima-logo.png" alt="Seoptima" className="h-16 w-auto object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold font-display text-foreground">Welcome back</h1>
                    <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
                </div>

                {/* Card */}
                <div className="glass-card p-8 space-y-6">
                    {/* Google OAuth */}
                    <button
                        onClick={handleGoogle}
                        disabled={isLoading}
                        className="w-full btn-secondary justify-center gap-3 py-3"
                    >
                        <Chrome className="w-4 h-4" />
                        Continue with Google
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs text-muted-foreground">
                            <span className="bg-card px-3">or continue with email</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="input-base"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="input-base pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium">
                            Sign up free
                        </Link>
                    </p>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    By signing in, you agree to our{' '}
                    <Link href="/terms" className="underline hover:text-foreground">Terms</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
                </p>
            </motion.div>
        </div>
    );
}

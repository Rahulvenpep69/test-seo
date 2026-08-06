"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Globe,
    Search,
    Zap,
    Settings,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowRight,
    ShieldCheck,
    Copy,
    FileText,
    ArrowLeft,
} from "lucide-react";
import { suggestKeywords, suggestOptimizedContent } from "@/lib/integration/gemini";
import { getWPPosts, updateWPPost, WPConfig } from "@/lib/integration/wordpress";

type Step = "hero" | "config" | "analysis" | "keywords" | "review" | "optimizing" | "complete";

export default function WebsiteIntegrationPage() {
    const [step, setStep] = useState<Step>("hero");
    const [mode, setMode] = useState<"full" | "quick">("full");
    const [url, setUrl] = useState("");
    const [wpConfig, setWpConfig] = useState<WPConfig>({
        url: "",
        username: "",
        appPassword: "",
        cookie: "",
        connectionMethod: "rest",
        bridgeSecret:
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15),
    });
    const [showBridgeCode, setShowBridgeCode] = useState(false);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
    const [optimizations, setOptimizations] = useState<Record<number, any>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const handleGetStarted = (m: "full" | "quick") => {
        setMode(m);
        setStep(m === "full" ? "config" : "analysis");
    };

    const handleFetchKeywords = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setError(null);
        try {
            const targetUrl = mode === "quick" ? url : wpConfig.url;
            const suggested = await suggestKeywords(targetUrl);
            setKeywords(suggested);

            if (mode === "full") {
                const fetchedPosts = await getWPPosts(wpConfig);
                setPosts(fetchedPosts);
                setSelectedPostIds(fetchedPosts.map((p: any) => p.id));
            }

            setStep("keywords");
        } catch (err: any) {
            setError(err instanceof Error ? err.message : "Failed to fetch site data. Please check your credentials and URL.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReview = async () => {
        setIsProcessing(true);
        setStep("optimizing");
        setLogs(["Analyzing selected pages...", "Generating AI optimizations..."]);

        try {
            const selectedPosts = posts.filter((p) => selectedPostIds.includes(p.id));
            const newOptimizations: Record<number, any> = {};

            for (const post of selectedPosts) {
                setLogs((prev) => [...prev, `Analyzing: ${post.title.rendered}...`]);
                const opt = await suggestOptimizedContent(
                    post.title.rendered,
                    post.content.rendered,
                    keywords
                );
                newOptimizations[post.id] = opt;
            }

            setOptimizations(newOptimizations);
            setStep("review");
        } catch (err: any) {
            setError(err instanceof Error ? err.message : "Failed to generate optimizations.");
            setStep("keywords");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOptimize = async () => {
        setIsProcessing(true);
        setStep("optimizing");
        setLogs(["Applying approved changes to WordPress..."]);

        try {
            const selectedPosts = posts.filter((p) => selectedPostIds.includes(p.id));

            for (const post of selectedPosts) {
                const opt = optimizations[post.id];
                if (!opt) continue;

                setLogs((prev) => [...prev, `Updating: ${post.title.rendered}...`]);

                await updateWPPost(
                    wpConfig,
                    post.id,
                    {
                        title: opt.title,
                        excerpt: opt.description,
                        meta: {
                            _yoast_wpseo_title: opt.title,
                            _yoast_wpseo_metadesc: opt.description,
                            rank_math_title: opt.title,
                            rank_math_description: opt.description,
                        },
                        url: post.link, // For JS Snippet logic
                    },
                    post.type || "posts"
                );

                setLogs((prev) => [...prev, `✓ Success: ${opt.title}`]);
            }

            setStep("complete");
            setLogs((prev) => [
                ...prev,
                "",
                "🎉 All selected pages optimized!",
                "Note: Changes may take a few minutes to appear due to caching.",
            ]);
        } catch (err: any) {
            setError(err instanceof Error ? err.message : "Optimization failed.");
            setStep("review");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <AnimatePresence mode="wait">
                {step === "hero" && (
                    <motion.div
                        key="hero"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center space-y-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                            <Zap className="w-4 h-4" />
                            AI-Powered Website Integration
                        </div>
                        <h1 className="text-5xl font-bold tracking-tight leading-tight">
                            Optimize Your <span className="gradient-text">WordPress</span> Site in Seconds.
                        </h1>
                        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                            Connect your WordPress site, get AI-suggested keywords, and let our professional engine optimize your entire content library automatically.
                        </p>
                        <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => handleGetStarted("full")}
                                className="group relative px-8 py-4 bg-emerald-500 text-black rounded-full font-semibold text-lg hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            >
                                Full WP Optimization
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => handleGetStarted("quick")}
                                className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-full font-semibold text-lg hover:bg-zinc-800 transition-all flex items-center gap-2"
                            >
                                Quick Keyword Analysis
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === "analysis" && (
                    <motion.div
                        key="analysis"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                <Globe className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Keyword Researcher</h2>
                                <p className="text-zinc-400 text-sm">Enter any URL to find high-performing SEO keywords</p>
                            </div>
                        </div>

                        <form onSubmit={handleFetchKeywords} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Website URL</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        required
                                        type="url"
                                        placeholder="https://example.com"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            )}

                            <button
                                disabled={isProcessing}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>Analyze URL <ArrowRight className="w-5 h-5" /></>
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}

                {step === "config" && (
                    <motion.div
                        key="config"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                <Settings className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Website Connection</h2>
                                <p className="text-zinc-400 text-sm">Provide credentials to allow AI optimization</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setWpConfig({ ...wpConfig, connectionMethod: "rest" })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${wpConfig.connectionMethod === "rest"
                                        ? "bg-emerald-500 text-black"
                                        : "text-zinc-400 hover:text-white"
                                        }`}
                                >
                                    WordPress Connection
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWpConfig({ ...wpConfig, connectionMethod: "bridge" })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${wpConfig.connectionMethod === "bridge"
                                        ? "bg-emerald-500 text-black"
                                        : "text-zinc-400 hover:text-white"
                                        }`}
                                >
                                    PHP Connection
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWpConfig({ ...wpConfig, connectionMethod: "js" })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${wpConfig.connectionMethod === "js"
                                        ? "bg-emerald-500 text-black"
                                        : "text-zinc-400 hover:text-white"
                                        }`}
                                >
                                    Other Connection
                                </button>
                            </div>

                            {wpConfig.connectionMethod === "js" && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                                            <Zap className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-400">WordPress Auto-Injection Plugin</h4>
                                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                                For WordPress sites, the easiest way to connect is to download our Auto-Injection plugin. It securely injects the engine connections without you touching any code!
                                            </p>
                                        </div>
                                    </div>

                                    <a
                                        href={`/api/integration/wordpress/plugin?siteId=${wpConfig.bridgeSecret}`}
                                        className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-black text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                        download
                                    >
                                        <ArrowRight className="w-4 h-4" /> Download WordPress Plugin (.zip)
                                    </a>

                                    <div className="pt-4 mt-4 border-t border-blue-500/20">
                                        <p className="text-[10px] text-zinc-500 mb-2 font-medium uppercase tracking-wider">Alternative: Manual JS Snippet</p>
                                        <div className="relative group">
                                            <pre className="bg-black p-3 rounded-lg text-[10px] text-zinc-400 overflow-x-auto border border-zinc-800 max-h-40">
                                                {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/seo-client.js" data-site-id="${wpConfig.bridgeSecret}"></script>`}
                                            </pre>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    navigator.clipboard.writeText(
                                                        `<script src="${window.location.origin}/seo-client.js" data-site-id="${wpConfig.bridgeSecret}"></script>`
                                                    )
                                                }
                                                className="absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-blue-500 text-white hover:text-black rounded-md opacity-0 group-hover:opacity-100 transition-all font-sans"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {wpConfig.connectionMethod === "bridge" && (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                                            <Settings className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-400">Security Wall Bypass</h4>
                                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                                Use this method if you get &quot;Access Forbidden&quot; errors. It bypasses hosting security walls by using a custom bridge file.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowBridgeCode(!showBridgeCode)}
                                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-all"
                                    >
                                        {showBridgeCode ? "Hide Setup Instructions" : "Show Setup Instructions"}
                                    </button>

                                    {showBridgeCode && (
                                        <div className="space-y-3 pt-2">
                                            <div className="text-xs font-medium text-zinc-300">
                                                1. Create a file named <code className="text-emerald-400">seo-bridge.php</code> in your WordPress root folder.
                                            </div>
                                            <div className="text-xs font-medium text-zinc-300">2. Paste this code inside:</div>
                                            <div className="relative group">
                                                <pre className="bg-black p-3 rounded-lg text-[10px] text-zinc-400 overflow-x-auto border border-zinc-800 max-h-40">
                                                    {`<?php
define('BRIDGE_SECRET', '${wpConfig.bridgeSecret}');
if ($_GET['secret'] !== BRIDGE_SECRET) die('Unauthorized');
require_once('wp-load.php');
if ($_GET['action'] === 'posts') {
    $posts = get_posts(['numberposts' => 10, 'post_status' => 'publish', 'post_type' => ['post', 'page']]);
    $out = [];
    foreach($posts as $p) {
        $out[] = [
            'id' => $p->ID, 
            'title' => ['rendered' => $p->post_title], 
            'content' => ['rendered' => $p->post_content],
            'type' => $p->post_type,
            'link' => get_permalink($p->ID)
        ];
    }
    header('Content-Type: application/json');
    echo json_encode($out);
} else if ($_GET['action'] === 'update') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = wp_update_post(['ID' => $_GET['id'], 'post_title' => $data['title'], 'post_excerpt' => $data['excerpt']]);
    echo json_encode(['success' => $id > 0]);
}`}
                                                </pre>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigator.clipboard.writeText(
                                                            `<?php\ndefine('BRIDGE_SECRET', '${wpConfig.bridgeSecret}');\nif ($_GET['secret'] !== BRIDGE_SECRET) die('Unauthorized');\nrequire_once('wp-load.php');\nif ($_GET['action'] === 'posts') {\n    $posts = get_posts(['numberposts' => 10, 'post_status' => 'publish', 'post_type' => ['post', 'page']]);\n    $out = [];\n    foreach($posts as $p) {\n        $out[] = ['id' => $p->ID, 'title' => ['rendered' => $p->post_title], 'content' => ['rendered' => $p->post_content], 'type' => $p->post_type, 'link' => get_permalink($p->ID)];\n    }\n    header('Content-Type: application/json');\n    echo json_encode($out);\n} else if ($_GET['action'] === 'update') {\n    $data = json_decode(file_get_contents('php://input'), true);\n    $id = wp_update_post(['ID' => $_GET['id'], 'post_title' => $data['title'], 'post_excerpt' => $data['excerpt']]);\n    echo json_encode(['success' => $id > 0]);\n}`
                                                        )
                                                    }
                                                    className="absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-emerald-500 text-white hover:text-black rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <form onSubmit={handleFetchKeywords} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Site URL</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            required
                                            type="url"
                                            placeholder="https://your-wordpress-site.com"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-sans text-white"
                                            value={wpConfig.url}
                                            onChange={(e) => setWpConfig({ ...wpConfig, url: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {wpConfig.connectionMethod !== "js" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-400">Username</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="admin"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white"
                                                value={wpConfig.username}
                                                onChange={(e) => setWpConfig({ ...wpConfig, username: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-400">Application Password</label>
                                            <input
                                                required
                                                type="password"
                                                placeholder="xxxx xxxx xxxx xxxx"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white"
                                                value={wpConfig.appPassword}
                                                onChange={(e) => setWpConfig({ ...wpConfig, appPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3">
                                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        We use WordPress Application Passwords for secure REST API access. Your credentials are never stored and are only used for the current session.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                        <AlertCircle className="w-5 h-5" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>Analyze Site & Suggest Keywords <ArrowRight className="w-5 h-5" /></>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}

                {step === "keywords" && (
                    <motion.div key="keywords" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl font-bold">Suggested Keywords</h2>
                            <p className="text-zinc-400">AI has analyzed your site and found these high-potential keywords</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-3">
                            {keywords.map((kw, i) => (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={kw}
                                    className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-full text-emerald-400 font-medium hover:border-emerald-500/50 transition-all cursor-default"
                                >
                                    {kw}
                                </motion.span>
                            ))}
                        </div>

                        {mode === "full" && posts.length > 0 && (
                            <div className="space-y-6 pt-8 border-t border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <FileText className="w-5 h-5 text-emerald-400" />
                                        Select Pages to Optimize
                                    </h3>
                                    <span className="text-xs text-zinc-500">
                                        {selectedPostIds.length} of {posts.length} selected
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                                    {posts.map((post) => (
                                        <div
                                            key={post.id}
                                            onClick={() => {
                                                setSelectedPostIds((prev) =>
                                                    prev.includes(post.id)
                                                        ? prev.filter((id) => id !== post.id)
                                                        : [...prev, post.id]
                                                );
                                            }}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedPostIds.includes(post.id)
                                                ? "bg-emerald-500/10 border-emerald-500/50"
                                                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                                                }`}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-white">{post.title.rendered}</span>
                                                    <span
                                                        className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${post.type === "page"
                                                            ? "bg-blue-500/20 text-blue-400"
                                                            : "bg-emerald-500/20 text-emerald-400"
                                                            }`}
                                                    >
                                                        {post.type || "post"}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-zinc-500 truncate max-w-[300px]">
                                                    {post.link}
                                                </span>
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedPostIds.includes(post.id)
                                                    ? "bg-emerald-500 border-emerald-500"
                                                    : "border-zinc-700"
                                                    }`}
                                            >
                                                {selectedPostIds.includes(post.id) && <CheckCircle2 className="w-3 h-3 text-black" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={handleReview}
                                        disabled={selectedPostIds.length === 0}
                                        className="px-12 py-5 bg-white text-black rounded-full font-bold text-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center gap-3"
                                    >
                                        <Zap className="w-6 h-6 fill-black" />
                                        Review AI Optimizations
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === "review" && (
                    <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setStep("keywords")}
                                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Selection
                            </button>
                            <div className="text-right">
                                <h2 className="text-3xl font-bold">Review Changes</h2>
                                <p className="text-zinc-400 text-sm">Approve AI suggestions before they go live</p>
                            </div>
                        </div>

                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-zinc-800">
                            {posts
                                .filter((p) => selectedPostIds.includes(p.id))
                                .map((post) => {
                                    const opt = optimizations[post.id];
                                    if (!opt) return null;
                                    return (
                                        <div key={post.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                                            <div className="p-4 bg-zinc-800/50 border-b border-zinc-800 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-emerald-400 text-sm text-white">{post.title.rendered}</span>
                                                    <span
                                                        className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${post.type === "page"
                                                            ? "bg-blue-500/20 text-blue-400"
                                                            : "bg-emerald-500/20 text-emerald-400"
                                                            }`}
                                                    >
                                                        {post.type || "post"}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                                    Page ID: {post.id}
                                                </span>
                                            </div>
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                        Current Content
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-[10px] text-zinc-500 block mb-1">Title</label>
                                                            <div className="text-sm text-zinc-400 line-through">
                                                                {post.title.rendered}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-zinc-500 block mb-1">
                                                                Meta Description
                                                            </label>
                                                            <div className="text-xs text-zinc-500 italic">No description found</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4 font-sans">
                                                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                                        AI Optimized (Editable)
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-[10px] text-emerald-500/50 block mb-1">
                                                                New Title
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={opt.title}
                                                                onChange={(e) =>
                                                                    setOptimizations({
                                                                        ...optimizations,
                                                                        [post.id]: { ...opt, title: e.target.value },
                                                                    })
                                                                }
                                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-emerald-500/50 block mb-1">
                                                                New Meta Description
                                                            </label>
                                                            <textarea
                                                                value={opt.description}
                                                                onChange={(e) =>
                                                                    setOptimizations({
                                                                        ...optimizations,
                                                                        [post.id]: { ...opt, description: e.target.value },
                                                                    })
                                                                }
                                                                rows={3}
                                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <div className="flex justify-center pt-8 border-t border-zinc-800">
                            <button
                                onClick={handleOptimize}
                                className="px-12 py-5 bg-emerald-500 text-black rounded-full font-bold text-xl hover:scale-105 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] flex items-center gap-3"
                            >
                                <CheckCircle2 className="w-6 h-6" />
                                Apply All Approved Changes
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === "optimizing" && (
                    <motion.div key="optimizing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                        <div className="text-center space-y-6">
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                                <Loader2 className="w-24 h-24 text-emerald-500 animate-spin relative z-10" />
                            </div>
                            <h2 className="text-3xl font-bold">Optimization in Progress</h2>
                            <p className="text-zinc-400">
                                AI is rewriting titles and meta descriptions for maximum SEO impact...
                            </p>
                        </div>

                        <div className="bg-black border border-zinc-800 rounded-2xl p-6 font-mono text-sm h-64 overflow-y-auto space-y-2 scrollbar-none">
                            {logs.map((log, i) => (
                                <div key={i} className={log.startsWith("✓") ? "text-emerald-400" : "text-zinc-500"}>
                                    <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === "complete" && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-8"
                    >
                        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-5xl font-bold text-white">Optimization Complete!</h2>
                            <p className="text-xl text-zinc-400">Your WordPress site has been updated with AI-optimized content.</p>
                        </div>
                        <div className="flex justify-center gap-4 pt-8">
                            <button
                                onClick={() => setStep("hero")}
                                className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-full font-semibold hover:bg-zinc-800 transition-all font-sans"
                            >
                                Back to Home
                            </button>
                            <a
                                href={wpConfig.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-4 bg-white text-black rounded-full font-semibold hover:scale-105 transition-all flex items-center gap-2"
                            >
                                View Your Site <Globe className="w-5 h-5" />
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Sparkles, Copy, Download, Edit3, Check, Globe, RefreshCcw, AlignLeft, Type, Image as ImageIcon, Code, FileText, Map, Zap, Smartphone, Link as LinkIcon, Hash } from 'lucide-react';

const CATEGORIES = [
    { id: 'meta', label: 'Meta Tags', icon: AlignLeft },
    { id: 'headings', label: 'Headings', icon: Type },
    { id: 'images', label: 'Image ALTs', icon: ImageIcon },
    { id: 'schema', label: 'Schema', icon: Code },
    { id: 'robots', label: 'Robots.txt', icon: FileText },
    { id: 'sitemap', label: 'Sitemap', icon: Map },
    { id: 'speed', label: 'Speed', icon: Zap },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'links', label: 'Broken Links', icon: LinkIcon },
    { id: 'keywords', label: 'Keyword Density', icon: Hash },
];

export function ManualAnalysisEngine() {
    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('meta');
    const [copied, setCopied] = useState(false);

    // Editor State
    const [editMode, setEditMode] = useState<string | null>(null);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAnalyzing(true);
        // Simulate network fetch
        await new Promise(r => setTimeout(r, 2000));

        setData({
            meta: { title: "Welcome to Our Website", description: "This is our website. We do things.", keywords: "website, things" },
            headings: { h1: "Welcome!", h2: ["About Us", "Contact"] },
            images: { missingAlt: 12, total: 24, suggested: "Group of business professionals smiling" },
            schema: { exists: false, suggested: "{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"Organization\",\n  \"name\": \"Example Corp\"\n}" },
            robots: { exists: true, content: "User-agent: *\\nDisallow: /admin/" },
            sitemap: { exists: false, suggested: "https://example.com/sitemap.xml" },
            speed: { score: 45, LCP: "4.2s", CLS: "0.2" },
            mobile: { responsive: true, viewport: true, tapTargets: "Too small" },
            links: { broken: 4, internal: 42, external: 12 },
            keywords: { top: ["things (12%)", "website (8%)", "welcome (5%)"] }
        });

        setIsAnalyzing(false);
    };

    const handleOptimize = async (category: string) => {
        setIsOptimizing(category);
        await new Promise(r => setTimeout(r, 1500));

        const newData = { ...data };
        if (category === 'meta') {
            newData.meta.title = "Premier Business Solutions | Elevate Your Operations";
            newData.meta.description = "Discover our comprehensive suite of professional business solutions engineered to scale your operations and drive unprecedented growth.";
        } else if (category === 'headings') {
            newData.headings.h1 = "Transform Your Business with Elite Solutions";
        } else if (category === 'schema') {
            newData.schema.exists = true;
        } else if (category === 'images') {
            newData.images.suggested = "Modern office space with team collaborating on creative project";
        }

        setData(newData);
        setIsOptimizing(null);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = (category: string, content: any) => {
        const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seo-${category}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <form onSubmit={handleAnalyze} className="flex gap-2">
                <div className="relative flex-1">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500/50" />
                    <input
                        required
                        type="url"
                        placeholder="https://example.com"
                        className="w-full bg-zinc-950/50 border border-blue-500/20 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white font-sans text-sm"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>
                <button
                    disabled={isAnalyzing}
                    className="px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Analyze</>}
                </button>
            </form>

            <AnimatePresence mode="wait">
                {data ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col md:flex-row gap-4 h-[500px]"
                    >
                        {/* Tab Sidebar */}
                        <div className="w-full md:w-48 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto scrollbar-none pb-2 md:pb-0 shrink-0">
                            {CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                const isActive = activeTab === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveTab(cat.id)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'bg-blue-500 text-white shadow-lg' : 'bg-blue-500/5 text-zinc-400 hover:bg-blue-500/10 hover:text-white border border-transparent'}`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-black/40 border border-blue-500/20 rounded-xl p-5 flex flex-col min-w-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    {CATEGORIES.find(c => c.id === activeTab)?.icon({ className: "w-5 h-5 text-blue-400" })}
                                    {CATEGORIES.find(c => c.id === activeTab)?.label}
                                </h3>

                                <button
                                    onClick={() => handleOptimize(activeTab)}
                                    disabled={isOptimizing === activeTab}
                                    className="bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center gap-1.5"
                                >
                                    {isOptimizing === activeTab ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    AI Rewrite
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                {/* Rendering based on active tab */}
                                {activeTab === 'meta' && (
                                    <>
                                        <EditableField
                                            label="Meta Title"
                                            value={data.meta.title}
                                            onChange={(val: string) => setData({ ...data, meta: { ...data.meta, title: val } })}
                                            onCopy={() => handleCopy(data.meta.title)}
                                            onDownload={() => handleDownload('meta-title', data.meta.title)}
                                        />
                                        <EditableField
                                            label="Meta Description"
                                            value={data.meta.description}
                                            isTextArea
                                            onChange={(val: string) => setData({ ...data, meta: { ...data.meta, description: val } })}
                                            onCopy={() => handleCopy(data.meta.description)}
                                            onDownload={() => handleDownload('meta-desc', data.meta.description)}
                                        />
                                    </>
                                )}

                                {activeTab === 'headings' && (
                                    <>
                                        <EditableField
                                            label="H1 Tag"
                                            value={data.headings.h1}
                                            onChange={(val: string) => setData({ ...data, headings: { ...data.headings, h1: val } })}
                                            onCopy={() => handleCopy(data.headings.h1)}
                                            onDownload={() => handleDownload('h1', data.headings.h1)}
                                        />
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-blue-400/80">H2 Tags Detected</label>
                                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-2">
                                                {data.headings.h2.map((h2: string, i: number) => (
                                                    <div key={i} className="text-sm text-zinc-300">- {h2}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'schema' && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
                                            Status: {data.schema.exists ? <span className="text-emerald-400 font-bold">Detected</span> : <span className="text-red-400 font-bold">Missing</span>}
                                        </div>
                                        <EditableField
                                            label="Suggested JSON-LD Schema (Organization)"
                                            value={data.schema.suggested}
                                            isTextArea
                                            onChange={(val: string) => setData({ ...data, schema: { ...data.schema, suggested: val } })}
                                            onCopy={() => handleCopy(data.schema.suggested)}
                                            onDownload={() => handleDownload('schema', data.schema.suggested)}
                                        />
                                    </>
                                )}

                                {/* Fallback renderer for other tabs to show off the UI quickly */}
                                {['images', 'robots', 'sitemap', 'speed', 'mobile', 'links', 'keywords'].includes(activeTab) && (
                                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-blue-200">
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(data[activeTab], null, 2)}</pre>
                                        <div className="mt-4 flex gap-2">
                                            <button onClick={() => handleCopy(JSON.stringify(data[activeTab]))} className="text-zinc-400 hover:text-white flex items-center gap-1 bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"><Copy className="w-3.5 h-3.5" /> Copy JSON</button>
                                            <button onClick={() => handleDownload(activeTab, data[activeTab])} className="text-zinc-400 hover:text-white flex items-center gap-1 bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"><Download className="w-3.5 h-3.5" /> Download</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {copied && <div className="absolute bottom-4 right-4 bg-emerald-500 text-black px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg flex items-center gap-2"><Check className="w-4 h-4" /> Copied!</div>}
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex-1 border-2 border-dashed border-blue-500/20 rounded-xl flex items-center justify-center flex-col text-center p-8 bg-blue-500/5 h-[400px]">
                        <Search className="w-12 h-12 text-blue-500/40 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">No Data Yet</h3>
                        <p className="text-zinc-500 text-sm max-w-sm">Enter a URL analyzing above to pull all SEO data across 10 vital categories.</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function EditableField({ label, value, isTextArea = false, onChange, onCopy, onDownload }: any) {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-blue-400/80 uppercase tracking-wider">{label}</label>
                <div className="flex gap-1">
                    <button onClick={() => setIsEditing(!isEditing)} title="Edit" className="p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={onCopy} title="Copy" className="p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={onDownload} title="Download" className="p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            {isEditing ? (
                isTextArea ? (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-black border border-blue-500/50 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans min-h-[100px]"
                    />
                ) : (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-black border border-blue-500/50 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                )
            ) : (
                <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3 text-sm text-zinc-200 font-sans whitespace-pre-wrap break-words">
                    {value}
                </div>
            )}
        </div>
    );
}

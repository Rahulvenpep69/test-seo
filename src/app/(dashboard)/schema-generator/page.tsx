'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Globe,
    Zap,
    Search,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Code,
    Eye,
    Download,
    ExternalLink,
    RefreshCw,
    Edit3,
    Star,
    ShieldCheck,
    Trash2,
    Building2,
    FileText,
    HelpCircle,
    Briefcase,
    Package,
    ListTree,
    PenTool,
    MapPin,
    Image,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface OGData {
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogType: string;
    ogSiteName: string;
    ogUrl: string;
}

interface AISchema {
    id: string;
    url: string;
    pageType: string;
    schemaType: string;
    generatedSchema: any;
    status: string;
    updatedAt: string;
}

const SCHEMA_TYPE_OPTIONS = [
    { id: 'Organization', label: 'Organization', icon: Building2, description: 'Company/brand identity', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400' },
    { id: 'WebSite', label: 'WebSite', icon: Globe, description: 'Website search & identity', color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400' },
    { id: 'WebPage', label: 'WebPage', icon: FileText, description: 'Page metadata', color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400' },
    { id: 'FAQPage', label: 'FAQ Page', icon: HelpCircle, description: 'Q&A content', color: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400' },
    { id: 'Service', label: 'Service', icon: Briefcase, description: 'Professional services', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400' },
    { id: 'Product', label: 'Product', icon: Package, description: 'Product details', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400' },
    { id: 'BreadcrumbList', label: 'Breadcrumbs', icon: ListTree, description: 'Navigation path', color: 'from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400' },
    { id: 'BlogPosting', label: 'Blog Post', icon: PenTool, description: 'Article content', color: 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400' },
    { id: 'LocalBusiness', label: 'Local Business', icon: MapPin, description: 'Local business info', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400' },
    { id: 'Review', label: 'Reviews', icon: Star, description: 'Ratings & reviews', color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400' },
];

export default function SchemaGeneratorPage() {
    const [url, setUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [schemas, setSchemas] = useState<AISchema[]>([]);
    const [selectedSchema, setSelectedSchema] = useState<AISchema | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedCode, setEditedCode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [selectedSchemaTypes, setSelectedSchemaTypes] = useState<string[]>([
        'Organization', 'WebSite', 'WebPage', 'BreadcrumbList'
    ]);

    const toggleSchemaType = (typeId: string) => {
        setSelectedSchemaTypes(prev =>
            prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
        );
    };

    const selectAll = () => setSelectedSchemaTypes(SCHEMA_TYPE_OPTIONS.map(t => t.id));
    const deselectAll = () => setSelectedSchemaTypes([]);

    const getOGData = (schema: AISchema): OGData | null => {
        // New format: { schema: {...}, ogData: {...} }
        // Old format fallback: { @context:..., @graph:..., _ogData:... }
        if (schema.generatedSchema?.ogData) return schema.generatedSchema.ogData;
        if (schema.generatedSchema?._ogData) return schema.generatedSchema._ogData;
        return null;
    };

    const getCleanSchema = (schema: AISchema) => {
        if (!schema.generatedSchema) return {};
        // New format: extract the clean schema from the "schema" key
        if (schema.generatedSchema?.schema) return schema.generatedSchema.schema;
        // Old format fallback: strip _ogData
        const { _ogData, ogData, ...cleanSchema } = schema.generatedSchema;
        return cleanSchema;
    };

    const generateSchemas = async () => {
        if (!url || isGenerating) return;
        if (selectedSchemaTypes.length === 0) {
            setStatusMessage('Please select at least one schema type.');
            return;
        }
        setIsGenerating(true);
        setStatusMessage('Crawling website and analyzing content...');

        try {
            const response = await axios.post('/api/schema/generate', {
                url,
                selectedSchemaTypes
            });
            setSchemas(response.data.schemas);
            setStatusMessage(`Successfully generated ${response.data.count} schemas.`);
        } catch (error: any) {
            console.error('Generation failed', error);
            setStatusMessage('Failed to generate schemas. Please check the URL and try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEdit = (schema: AISchema) => {
        setSelectedSchema(schema);
        setEditedCode(JSON.stringify(getCleanSchema(schema), null, 2));
        setIsEditing(true);
    };

    const saveChanges = async () => {
        if (!selectedSchema) return;
        try {
            const parsed = JSON.parse(editedCode);
            const response = await axios.patch(`/api/schema/${selectedSchema.id}`, {
                generatedSchema: parsed,
                status: 'EDITED'
            });

            setSchemas(schemas.map(s => s.id === selectedSchema.id ? response.data : s));
            setIsEditing(false);
            setSelectedSchema(response.data);
        } catch (e) {
            alert('Invalid JSON format');
        }
    };

    const deleteSchema = async (id: string) => {
        if (!confirm('Are you sure you want to delete this schema?')) return;
        try {
            await axios.delete(`/api/schema/${id}`);
            setSchemas(schemas.filter(s => s.id !== id));
            if (selectedSchema?.id === id) setSelectedSchema(null);
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const applySchema = async () => {
        if (!selectedSchema) return;
        try {
            const response = await axios.patch(`/api/schema/${selectedSchema.id}`, {
                status: 'APPLIED'
            });
            setSchemas(schemas.map(s => s.id === selectedSchema.id ? response.data : s));
            setSelectedSchema(response.data);
            alert('Schema applied successfully!');
        } catch (error) {
            console.error('Apply failed', error);
            alert('Failed to apply schema.');
        }
    };

    const copyToClipboard = (schema: AISchema) => {
        const cleanSchema = getCleanSchema(schema);
        const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(cleanSchema, null, 2)}\n</script>`;
        navigator.clipboard.writeText(scriptTag);
        setStatusMessage('Schema copied to clipboard!');
        setTimeout(() => setStatusMessage(''), 3000);
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold font-display flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        AI Schema Generator
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Automated SEO, AEO, GEO, and SXO optimized schema markup for your entire website.
                    </p>
                </div>
                <div className="glass-card px-4 py-2.5 flex items-center gap-2 self-start md:self-auto">
                    <Zap className="w-4 h-4 text-accent-400" />
                    <span className="text-sm font-semibold text-accent-400">50</span>
                    <span className="text-xs text-muted-foreground">AI credits available</span>
                </div>
            </div>

            {/* Input Bar */}
            <div className="glass-card p-6 border-brand-500/20 bg-brand-500/5">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="https://yourwebsite.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="input-base pl-12 h-14 text-lg bg-background/50"
                        />
                    </div>
                    <button
                        onClick={generateSchemas}
                        disabled={isGenerating || !url || selectedSchemaTypes.length === 0}
                        className="btn-primary px-8 h-14 text-lg font-semibold shadow-xl shadow-brand-500/30 whitespace-nowrap"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5 mr-2" />
                                Generate Schema
                            </>
                        )}
                    </button>
                </div>

                {/* Schema Type Checkboxes */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-brand-400" />
                            Select Schema Types
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={selectAll}
                                className="text-[10px] font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300 transition-colors px-2 py-1 rounded-md hover:bg-brand-500/10"
                            >
                                Select All
                            </button>
                            <span className="text-white/10">|</span>
                            <button
                                onClick={deselectAll}
                                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {SCHEMA_TYPE_OPTIONS.map((type) => {
                            const Icon = type.icon;
                            const isSelected = selectedSchemaTypes.includes(type.id);
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => toggleSchemaType(type.id)}
                                    className={cn(
                                        "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-center group cursor-pointer",
                                        isSelected
                                            ? `bg-gradient-to-b ${type.color} shadow-lg`
                                            : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/5 text-muted-foreground"
                                    )}
                                >
                                    {isSelected && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                    <Icon className={cn(
                                        "w-5 h-5 transition-colors",
                                        isSelected ? "" : "opacity-50 group-hover:opacity-75"
                                    )} />
                                    <span className="text-[11px] font-semibold leading-tight">{type.label}</span>
                                    <span className={cn(
                                        "text-[9px] leading-tight",
                                        isSelected ? "opacity-70" : "opacity-40"
                                    )}>{type.description}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground/60 italic">
                        {selectedSchemaTypes.length} of {SCHEMA_TYPE_OPTIONS.length} types selected — only selected types will be generated
                    </p>
                </div>

                {statusMessage && (
                    <p className={cn(
                        "mt-4 text-sm font-medium flex items-center gap-2",
                        statusMessage.includes('Failed') || statusMessage.includes('Please select') ? "text-red-400" : "text-brand-400"
                    )}>
                        {statusMessage.includes('Failed') || statusMessage.includes('Please select') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        {statusMessage}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Schema List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Pages Found</h2>
                        <span className="text-xs bg-white/5 px-2 py-1 rounded-full text-muted-foreground">
                            {schemas.length} Total
                        </span>
                    </div>

                    <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                        {schemas.length === 0 && !isGenerating && (
                            <div className="glass-card p-8 text-center space-y-3">
                                <Search className="w-10 h-10 text-muted-foreground mx-auto opacity-20" />
                                <p className="text-sm text-muted-foreground italic">No schemas generated yet. Enter a URL above to begin.</p>
                            </div>
                        )}

                        {isGenerating && schemas.length === 0 && (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="glass-card p-4 animate-pulse h-20 bg-white/5 border-transparent" />
                            ))
                        )}

                        {schemas.map((schema) => (
                            <motion.button
                                key={schema.id}
                                layoutId={schema.id}
                                onClick={() => setSelectedSchema(schema)}
                                className={cn(
                                    "w-full glass-card p-4 text-left transition-all group relative border",
                                    selectedSchema?.id === schema.id
                                        ? "border-brand-500/50 bg-brand-500/10 shadow-lg shadow-brand-500/5"
                                        : "hover:border-white/20 hover:bg-white/5"
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-brand-400 uppercase">{schema.pageType}</p>
                                        <p className="text-sm font-medium truncate max-w-[200px]">{schema.url.replace(/^https?:\/\//, '')}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground border border-white/10 italic">
                                                {schema.schemaType}
                                            </span>
                                            {schema.status === 'EDITED' && (
                                                <span className="text-[10px] text-accent-400 flex items-center gap-0.5 font-bold uppercase tracking-tighter">
                                                    Modified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className={cn(
                                        "w-4 h-4 transition-transform",
                                        selectedSchema?.id === schema.id ? "translate-x-1 text-brand-400" : "text-muted-foreground group-hover:translate-x-1"
                                    )} />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Details / Editor */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {selectedSchema ? (
                            <motion.div
                                key={selectedSchema.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="glass-card h-full min-h-[600px] flex flex-col"
                            >
                                {/* Schema Header */}
                                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold">{selectedSchema.schemaType} Schema</h3>
                                            <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] border border-brand-500/30 uppercase tracking-widest font-black">
                                                SEO + AEO + GEO Optimized
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5" />
                                            {selectedSchema.url}
                                            <ExternalLink className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => deleteSchema(selectedSchema.id)}
                                            className="p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
                                            title="Delete Schema"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(selectedSchema)}
                                            className="btn-ghost px-4 py-2.5 text-sm gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Copy
                                        </button>
                                        <button
                                            className="btn-primary px-5 py-2.5 text-sm gap-2"
                                            onClick={applySchema}
                                        >
                                            <Zap className="w-4 h-4" />
                                            Apply Schema
                                        </button>
                                    </div>
                                </div>

                                {/* OG Content Preview */}
                                {getOGData(selectedSchema) && (
                                    <div className="border-b border-white/10 px-6 py-4">
                                        <h4 className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                            <Image className="w-3.5 h-3.5" />
                                            Open Graph Content (from website)
                                        </h4>
                                        <div className="flex gap-4">
                                            {getOGData(selectedSchema)?.ogImage && (
                                                <div className="w-28 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/20">
                                                    <img
                                                        src={getOGData(selectedSchema)!.ogImage}
                                                        alt="OG Preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <p className="text-sm font-semibold text-white/90 truncate">
                                                    {getOGData(selectedSchema)?.ogTitle || 'No OG Title'}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {getOGData(selectedSchema)?.ogDescription || 'No OG Description'}
                                                </p>
                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                                                    {getOGData(selectedSchema)?.ogType && (
                                                        <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">
                                                            type: {getOGData(selectedSchema)!.ogType}
                                                        </span>
                                                    )}
                                                    {getOGData(selectedSchema)?.ogSiteName && (
                                                        <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">
                                                            site: {getOGData(selectedSchema)!.ogSiteName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Auto-Inject Banner */}
                                <div className="bg-brand-500/10 border-b border-brand-500/20 px-6 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-5 h-5 text-brand-400" />
                                        <p className="text-sm text-brand-100/80">
                                            Make schemas go live instantly without editing code.
                                        </p>
                                    </div>
                                    <a
                                        href="/website-integration"
                                        className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors uppercase tracking-wider relative group flex items-center gap-1"
                                    >
                                        Get WP Auto-Injector
                                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                    </a>
                                </div>

                                {/* Editor / Preview Toggle */}
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="bg-black/20 p-2 flex items-center justify-between border-b border-white/5">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
                                                    !isEditing ? "bg-white/10 text-white shadow-inner" : "text-muted-foreground hover:text-white"
                                                )}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Live Preview
                                            </button>
                                            <button
                                                onClick={() => handleEdit(selectedSchema)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
                                                    isEditing ? "bg-white/10 text-white shadow-inner" : "text-muted-foreground hover:text-white"
                                                )}
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                JSON-LD Editor
                                            </button>
                                        </div>
                                        {isEditing && (
                                            <button
                                                onClick={saveChanges}
                                                className="text-[10px] font-black uppercase text-brand-400 hover:text-brand-300 px-3 py-1 flex items-center gap-1"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Save Pattern
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-auto bg-black/40 relative group">
                                        {isEditing ? (
                                            <textarea
                                                value={editedCode}
                                                onChange={(e) => setEditedCode(e.target.value)}
                                                className="w-full h-full bg-transparent p-6 font-mono text-sm resize-none focus:outline-none text-brand-100 selection:bg-brand-500/30"
                                                spellCheck={false}
                                            />
                                        ) : (
                                            <div className="p-8 space-y-8">
                                                {/* Schema Types in Graph */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                                                        Generated Schema Types
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(getCleanSchema(selectedSchema)?.['@graph'] || []).map((item: any, i: number) => (
                                                            <span key={i} className="px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-[11px] font-semibold text-brand-400">
                                                                {item['@type']}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Dynamic preview of optimized features from @graph */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* FAQs Preview */}
                                                    {getCleanSchema(selectedSchema)?.['@graph']?.find((e: any) => e['@type'] === 'FAQPage') && (
                                                        <div className="glass-card p-5 border-brand-500/20 bg-brand-500/5">
                                                            <h4 className="text-xs font-bold text-brand-400 uppercase mb-3 flex items-center gap-2">
                                                                <Zap className="w-3.5 h-3.5" />
                                                                AEO Strategy (FAQs)
                                                            </h4>
                                                            <div className="space-y-4">
                                                                {getCleanSchema(selectedSchema)?.['@graph']?.find((e: any) => e['@type'] === 'FAQPage')?.mainEntity?.slice(0, 5).map((faq: any, i: number) => (
                                                                    <div key={i} className="space-y-1">
                                                                        <p className="text-sm font-semibold text-white/90">Q: {faq.name}</p>
                                                                        <p className="text-xs text-muted-foreground">A: {faq.acceptedAnswer?.text}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Ratings Preview — only show if real data */}
                                                    {(() => {
                                                        const graph = getCleanSchema(selectedSchema)?.['@graph'] || [];
                                                        const rating = graph.find((e: any) => e.aggregateRating)?.aggregateRating ||
                                                            graph.find((e: any) => e['@type'] === 'LocalBusiness')?.aggregateRating;
                                                        const reviews = graph.filter((e: any) => e['@type'] === 'Review');

                                                        if (!rating && reviews.length === 0) return null;

                                                        return (
                                                            <div className="glass-card p-5 border-yellow-500/20 bg-yellow-500/5">
                                                                <h4 className="text-xs font-bold text-yellow-500 uppercase mb-3 flex items-center gap-2">
                                                                    <Sparkles className="w-3.5 h-3.5" />
                                                                    Trust & Social (Rich Results)
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {rating && (
                                                                        <>
                                                                            <div className="flex items-center gap-1 text-yellow-400">
                                                                                {Array(5).fill(0).map((_, i) => (
                                                                                    <Star key={i} className={cn(
                                                                                        "w-3 h-3",
                                                                                        i < Math.round(parseFloat(rating.ratingValue || '0')) ? "fill-current" : "opacity-30"
                                                                                    )} />
                                                                                ))}
                                                                                <span className="text-xs font-bold ml-1">{rating.ratingValue}/5</span>
                                                                            </div>
                                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                                                Based on {rating.reviewCount || reviews.length} verified reviews
                                                                            </p>
                                                                        </>
                                                                    )}
                                                                    <div className="pt-1 border-t border-white/5">
                                                                        <p className="text-[10px] text-brand-400 font-bold uppercase tracking-tighter">
                                                                            ✓ Optimized for Google Rich Snippets
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Organization & Local Details */}
                                                    {(() => {
                                                        const graph = getCleanSchema(selectedSchema)?.['@graph'] || [];
                                                        const org = graph.find((e: any) => e['@type'] === 'Organization');
                                                        const local = graph.find((e: any) => e['@type'] === 'LocalBusiness');
                                                        const breadcrumbs = graph.find((e: any) => e['@type'] === 'BreadcrumbList')?.itemListElement || [];

                                                        if (!org && !local && breadcrumbs.length === 0) return null;

                                                        return (
                                                            <div className="glass-card p-5 border-blue-500/20 bg-blue-500/5 md:col-span-2">
                                                                <h4 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                    Organization & Local Details
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {(org || local) && (
                                                                        <div className="space-y-2">
                                                                            <p className="text-xs text-white/80 font-medium">Business Identity</p>
                                                                            <p className="text-[10px] text-muted-foreground">Name: {org?.name || local?.name}</p>
                                                                            {local?.address?.streetAddress && (
                                                                                <p className="text-[10px] text-muted-foreground">Address: {local.address.streetAddress}</p>
                                                                            )}
                                                                            {(local?.address?.addressLocality || org?.areaServed?.name) && (
                                                                                <p className="text-[10px] text-muted-foreground">City: {local?.address?.addressLocality || org?.areaServed?.name}</p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {breadcrumbs.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            <p className="text-xs text-white/80 font-medium">Site structure</p>
                                                                            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                                                                                {breadcrumbs.map((b: any, i: number) => (
                                                                                    <div key={i} className="flex items-center gap-1 shrink-0">
                                                                                        {i > 0 && <span className="text-white/20">/</span>}
                                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{b.name}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <p className="text-[9px] text-accent-400 font-bold uppercase tracking-widest mt-1">✓ BreadcrumbList Schema Active</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="space-y-4">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                                        <Code className="w-3.5 h-3.5" />
                                                        JSON-LD Structure
                                                    </h4>
                                                    <pre className="p-6 bg-black/60 rounded-2xl border border-white/5 text-xs text-muted-foreground overflow-x-auto">
                                                        {JSON.stringify(getCleanSchema(selectedSchema), null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[600px] glass-card flex flex-col items-center justify-center p-12 text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
                                    <Eye className="w-10 h-10 text-muted-foreground opacity-30" />
                                </div>
                                <div className="max-w-md space-y-2">
                                    <h3 className="text-xl font-bold">Select a page to view schema</h3>
                                    <p className="text-muted-foreground text-sm">
                                        Choose one of the analyzed pages from the left panel to inspect, edit, or apply its AI-generated schema markup.
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

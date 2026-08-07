'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Website {
    id: string;
    name: string;
    subdomain: string;
    domain?: string;
    sitemapXml?: string | null;
    sitemapLastGenerated?: string | Date | null;
    sitemapLastSubmitted?: string | Date | null;
    sitemapUrlCount?: number | null;
    sitemapStatus?: string | null;
    sitemapAutoUpdate?: boolean | null;
}

interface WebsiteContextType {
    websites: Website[];
    activeWebsite: Website | null;
    setActiveWebsiteId: (id: string) => void;
    isLoading: boolean;
    refreshWebsites: () => Promise<void>;
    analysisResult: any;
    isAnalyzing: boolean;
    runAnalysis: (targetUrl?: string) => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export function WebsiteProvider({ children }: { children: React.ReactNode }) {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [activeWebsiteId, setActiveWebsiteId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWebsites = async () => {
        try {
            const res = await fetch('/api/websites');
            if (res.ok) {
                const data = await res.json();
                setWebsites(data);

                // Set default website if none selected
                if (data.length > 0 && !activeWebsiteId) {
                    const savedId = localStorage.getItem('activeWebsiteId');
                    if (savedId && data.some((w: Website) => w.id === savedId)) {
                        setActiveWebsiteId(savedId);
                    } else {
                        setActiveWebsiteId(data[0].id);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch websites:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWebsites();
    }, []);

    useEffect(() => {
        if (activeWebsiteId) {
            localStorage.setItem('activeWebsiteId', activeWebsiteId);
        }
    }, [activeWebsiteId]);

    const activeWebsite = websites.find(w => w.id === activeWebsiteId) || null;

    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const runAnalysis = async (targetUrl?: string) => {
        if (!activeWebsite) return;
        const urlToAnalyze = targetUrl || activeWebsite.domain || `https://${activeWebsite.subdomain}.antigravity.run`;

        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: urlToAnalyze,
                    websiteId: activeWebsite.id
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setAnalysisResult(data);
            }
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        if (activeWebsite) {
            setAnalysisResult(null); // Clear old results
            // Extract the first report if available in full website data
            // (This is a simplified assumption, maybe fetch latest report from DB if needed)
        }
    }, [activeWebsite?.id]);

    return (
        <WebsiteContext.Provider value={{
            websites,
            activeWebsite,
            setActiveWebsiteId,
            isLoading,
            refreshWebsites: fetchWebsites,
            analysisResult,
            isAnalyzing,
            runAnalysis
        }}>
            {children}
        </WebsiteContext.Provider>
    );
}

export function useWebsite() {
    const context = useContext(WebsiteContext);
    if (context === undefined) {
        throw new Error('useWebsite must be used within a WebsiteProvider');
    }
    return context;
}

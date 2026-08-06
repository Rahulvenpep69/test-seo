'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell, Search, Plus, X, Globe, Type } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { WebsiteSwitcher } from './WebsiteSwitcher';
import { useWebsite } from '@/context/website-context';
import { NotificationsDropdown } from './NotificationsDropdown';

export function DashboardHeader() {
    const { data: session } = useSession();
    const { refreshWebsites } = useWebsite();
    const router = useRouter();
    const [greeting, setGreeting] = useState('Hello');

    useEffect(() => {
        const hour = new Date().getHours();
        setGreeting(
            hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
        );
    }, []);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newSiteUrl, setNewSiteUrl] = useState('');
    const [newSiteName, setNewSiteName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddSite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSiteUrl || !newSiteName) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newSiteName,
                    subdomain: newSiteName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
                    url: newSiteUrl,
                    goal: 'BUSINESS'
                })
            });
            const data = await res.json();
            if (res.ok && data.websiteId) {
                // Refresh websites list in context
                await refreshWebsites();

                router.push(`/analyzing?url=${encodeURIComponent(newSiteUrl)}&id=${data.websiteId}`);
                setIsAddOpen(false);
            } else {
                throw new Error(data.error || data.details || 'Failed to create site');
            }
        } catch (error: any) {
            console.error('Failed to create site:', error);
            alert(error.message || 'Failed to add website. Please try again.');
        } finally {
            setIsLoading(false);
            setNewSiteUrl('');
            setNewSiteName('');
        }
    };

    return (
        <header className="sticky top-0 z-30 h-16 border-b border-white/8 bg-background/80 backdrop-blur-xl flex items-center px-6 gap-4">
            {/* Greeting */}
            <div className="flex-1 flex items-center gap-4">
                <p className="text-sm text-muted-foreground hidden lg:block">
                    {greeting}, <span className="text-foreground font-medium">{session?.user?.name?.split(' ')[0] || 'there'}</span> 👋
                </p>

                <div className="h-4 w-px bg-white/10 hidden lg:block" />

                <WebsiteSwitcher />
            </div>

            {/* Search */}
            <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search..."
                    className="input-base pl-9 w-64 h-9 text-sm"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <Dialog.Trigger asChild>
                        <button className="btn-primary py-1.5 text-xs hidden sm:flex">
                            <Plus className="w-3.5 h-3.5" />
                            New Site
                        </button>
                    </Dialog.Trigger>

                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-white/10 bg-surface/95 backdrop-blur-xl p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
                            <div className="flex items-center justify-between mb-5">
                                <Dialog.Title className="text-xl font-bold font-display">Add New Site</Dialog.Title>
                                <Dialog.Close asChild>
                                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
                                        <X className="w-4 h-4" />
                                    </button>
                                </Dialog.Close>
                            </div>

                            <Dialog.Description className="text-sm text-muted-foreground mb-5">
                                Enter your website details below to add it to your project and start deep crawl analysis.
                            </Dialog.Description>

                            <form onSubmit={handleAddSite} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Website Name</label>
                                    <div className="relative">
                                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            required
                                            value={newSiteName}
                                            onChange={e => setNewSiteName(e.target.value)}
                                            placeholder="e.g. My Awesome Startup"
                                            className="input-base pl-9 w-full"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Website URL</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="url"
                                            required
                                            value={newSiteUrl}
                                            onChange={e => setNewSiteUrl(e.target.value)}
                                            placeholder="https://example.com"
                                            className="input-base pl-9 w-full"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-3">
                                    <Dialog.Close asChild>
                                        <button type="button" className="btn-ghost">Cancel</button>
                                    </Dialog.Close>
                                    <button type="submit" disabled={!newSiteUrl || !newSiteName} className="btn-primary">
                                        Add & Scan Site
                                    </button>
                                </div>
                            </form>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>

                <NotificationsDropdown />
            </div>
        </header>
    );
}

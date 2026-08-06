import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export const metadata: Metadata = {
    title: 'Dashboard',
};

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                <DashboardHeader />
                <main className="flex-1 p-6 xl:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

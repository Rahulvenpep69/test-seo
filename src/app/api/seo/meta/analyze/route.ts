import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MetaAnalyzer } from '@/lib/seo/meta-analyzer';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const websiteId = searchParams.get('websiteId');
        if (!websiteId) {
            return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
        }

        const website = await prisma.website.findUnique({
            where: { id: websiteId }
        });

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        const domain = website.domain || `https://${website.subdomain}.antigravity.run`;
        const cleanDomain = domain.replace(/\/+$/, '');

        // Fetch pages from database
        const pages = await prisma.page.findMany({
            where: { websiteId },
            orderBy: { isHomePage: 'desc' }
        });

        const results = pages.map(page => {
            const cleanSlug = page.slug.replace(/^\/+/, '');
            const absoluteUrl = cleanSlug ? `${cleanDomain}/${cleanSlug}` : cleanDomain;

            return {
                url: absoluteUrl,
                title: page.metaTitle || page.title || '',
                description: page.metaDesc || '',
                h1: page.title || '',
                h2: '',
                content: '',
                status: 200
            };
        });

        return NextResponse.json({ results });
    } catch (error) {
        console.error('[META GET PAGES ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const analyzer = new MetaAnalyzer(50); // Limit to 50 pages for now
        const results = await analyzer.analyze(url);

        return NextResponse.json({ results });
    } catch (error) {
        console.error('[META ANALYZE ERROR]', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}

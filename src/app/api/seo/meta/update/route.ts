import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url, metaTitle, metaDesc, websiteId } = await req.json();
        if (!url || !websiteId) {
            return NextResponse.json({ error: 'URL and Website ID are required' }, { status: 400 });
        }

        const website = await prisma.website.findUnique({
            where: { id: websiteId }
        });

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        const domain = website.domain || `https://${website.subdomain}.antigravity.run`;
        const baseDir = new URL(domain).pathname.replace(/\/+$/, '');
        let pagePath = new URL(url, domain).pathname;

        if (baseDir && pagePath.startsWith(baseDir)) {
            pagePath = pagePath.substring(baseDir.length);
        }

        const slug = pagePath.replace(/^\/+/, '').replace(/\/+$/, '');

        const page = await prisma.page.upsert({
            where: {
                websiteId_slug: {
                    websiteId,
                    slug
                }
            },
            update: {
                metaTitle,
                metaDesc
            },
            create: {
                websiteId,
                slug,
                title: metaTitle || 'Untitled Page',
                metaTitle,
                metaDesc,
                content: '[]',
                published: true
            }
        });

        return NextResponse.json({ success: true, page });
    } catch (error) {
        console.error('[META UPDATE ERROR]', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

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

        const { goal, subdomain, builderMode, name, url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
        }

        // Handle subdomain collision
        let finalSubdomain = subdomain || `${(name || 'site').toLowerCase().replace(/\s+/g, '-')}`;

        const existingSubdomain = await prisma.website.findUnique({
            where: { subdomain: finalSubdomain }
        });

        if (existingSubdomain) {
            finalSubdomain = `${finalSubdomain}-${Math.random().toString(36).substring(2, 7)}`;
        }

        // 1. Create the website
        const website = await prisma.website.create({
            data: {
                userId: session.user.id,
                name: name || 'My New Site',
                domain: url, // Save URL to domain field
                goal: goal || 'BLOG',
                builderMode: builderMode || 'MANUAL',
                subdomain: finalSubdomain,
                pages: {
                    create: [
                        {
                            title: 'Home',
                            slug: '',
                            content: '[]',
                            pageType: 'HOME',
                            isHomePage: true,
                            published: true,
                        },
                        {
                            title: 'About',
                            slug: 'about',
                            content: '[]',
                            pageType: 'ABOUT',
                            published: true,
                        },
                    ],
                },
            },
            include: {
                pages: true,
            },
        });

        // 2. Trigger Automatic Sitemap Generation (Asynchronously)
        if (url) {
            import('@/lib/seo/sitemap-job').then(({ SitemapJob }) => {
                const job = new SitemapJob();
                job.runForWebsite(website.id).catch(e => console.error('[WEBSITE CREATE SITEMAP ERROR]', e));
            });
        }

        return NextResponse.json({
            message: 'Website created successfully',
            websiteId: website.id,
        }, { status: 201 });
    } catch (error: any) {
        console.error('[WEBSITE CREATE ERROR]', error);
        return NextResponse.json({
            error: 'Failed to create website',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const websites = await prisma.website.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                userId: true,
                name: true,
                domain: true,
                subdomain: true,
                favicon: true,
                logo: true,
                goal: true,
                builderMode: true,
                published: true,
                createdAt: true,
                updatedAt: true,
                agencyId: true,
                status: true,
                _count: {
                    select: { pages: true },
                },
                seoReports: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        overallScore: true,
                        technicalScore: true,
                        contentScore: true,
                        speedScore: true,
                        issuesFound: true,
                        crawledPages: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(websites);
    } catch (error) {
        console.error('[WEBSITES GET ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }
}

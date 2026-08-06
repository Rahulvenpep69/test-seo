import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GscService } from '@/lib/gsc/service';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { websiteId, propertyUrl } = await req.json();

    if (!websiteId) {
        return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    try {
        const website = await prisma.website.findUnique({
            where: { id: websiteId, userId: session.user.id }
        });

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        // Use provided propertyUrl or try to find one automatically
        let finalPropertyUrl = propertyUrl;
        if (!finalPropertyUrl) {
            const existingProperty = await prisma.gscProperty.findUnique({
                where: { websiteId }
            });
            if (existingProperty) {
                finalPropertyUrl = existingProperty.propertyUrl;
            } else {
                // Try to match domain
                const properties = await GscService.listProperties(session.user.id);
                const match = properties.find(p => p.siteUrl === website.domain || p.siteUrl === `sc-domain:${website.domain}`);
                if (match) {
                    finalPropertyUrl = match.siteUrl;
                }
            }
        }

        if (!finalPropertyUrl) {
            return NextResponse.json({
                error: 'Property not linked',
                needsMapping: true
            }, { status: 400 });
        }

        await GscService.syncWebsiteData(session.user.id, websiteId, finalPropertyUrl);

        return NextResponse.json({ success: true, message: 'Sync completed' });
    } catch (error: any) {
        console.error('GSC Sync API Error:', error);
        return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
    }
}

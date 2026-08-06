import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GscService } from '@/lib/gsc/service';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');

    if (!websiteId) {
        return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    try {
        const stats = await GscService.getWebsitePerformance(websiteId);

        if (!stats) {
            // Check if connected but not synced
            const property = await prisma.gscProperty.findUnique({ where: { websiteId } });
            return NextResponse.json({
                isConnected: !!property,
                data: null,
                message: property ? 'No data synced yet' : 'GSC property not linked'
            });
        }

        return NextResponse.json({
            isConnected: true,
            ...stats
        });
    } catch (error: any) {
        console.error('GSC Performance API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
    }
}

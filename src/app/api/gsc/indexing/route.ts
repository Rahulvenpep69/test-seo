import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GscService } from '@/lib/gsc/service';

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
        const summary = await GscService.getIndexingSummary(session.user.id, websiteId);

        return NextResponse.json(summary);
    } catch (error: any) {
        if (error.message === 'Property not linked' || error.message?.includes('not linked') || error.message?.includes('token not found')) {
            return NextResponse.json({
                isLinked: false,
                property: null,
                sitemaps: [],
                indexingSummary: { totalSubmitted: 0, totalIndexed: 0, status: 'Not Linked' },
                performanceSummary: { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0 }
            });
        }
        console.error('GSC Indexing API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch indexing summary' }, { status: 500 });
    }
}

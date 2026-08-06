import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GscService } from '@/lib/gsc/service';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { websiteId, url } = await req.json();

        if (!websiteId || !url) {
            return NextResponse.json({ error: 'Website ID and URL are required' }, { status: 400 });
        }

        const result = await GscService.inspectUrl(session.user.id, websiteId, url);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('GSC Inspect API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to inspect URL' }, { status: 500 });
    }
}

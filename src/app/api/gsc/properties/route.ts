import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GscService } from '@/lib/gsc/service';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const properties = await GscService.listProperties(session.user.id);
        return NextResponse.json(properties);
    } catch (error: any) {
        console.error('GSC Properties API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch GSC properties' }, { status: 500 });
    }
}

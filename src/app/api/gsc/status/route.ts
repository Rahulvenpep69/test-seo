import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const gscToken = await prisma.gscToken.findUnique({
        where: { userId: session.user.id },
    });

    return NextResponse.json({
        isConnected: !!gscToken,
        expiryDate: gscToken ? Number(gscToken.expiryDate) : null
    });
}

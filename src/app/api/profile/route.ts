import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                createdAt: true,
                subscription: {
                    select: { plan: true, status: true, currentPeriodEnd: true },
                },
                aiCredits: {
                    select: { total: true, used: true },
                },
                _count: {
                    select: { websites: true, notifications: true },
                },
            },
        });

        if (!user && session.user.email) {
            user = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    createdAt: true,
                    subscription: {
                        select: { plan: true, status: true, currentPeriodEnd: true },
                    },
                    aiCredits: {
                        select: { total: true, used: true },
                    },
                    _count: {
                        select: { websites: true, notifications: true },
                    },
                },
            });
        }

        if (!user) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('[PROFILE ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

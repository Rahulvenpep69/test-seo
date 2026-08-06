import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from '@/lib/gsc/client';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/search-console?error=no_code`);
    }

    try {
        const tokens = await getTokens(code);

        // Save or update GSC token for the user
        await prisma.gscToken.upsert({
            where: { userId: session.user.id },
            update: {
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token!,
                expiryDate: BigInt(tokens.expiry_date!),
            },
            create: {
                userId: session.user.id,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token!,
                expiryDate: BigInt(tokens.expiry_date!),
            },
        });

        // Redirect back to search console
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/search-console?success=connected`);
    } catch (error) {
        console.error('GSC Callback Error:', error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/search-console?error=sync_failed`);
    }
}

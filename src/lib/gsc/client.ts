import { google } from 'googleapis';
import { prisma } from '../prisma';

export function createOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://test-seo-production.up.railway.app';
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/gsc/callback`;

    if (!clientId) {
        console.error('[GSC_OAUTH] GOOGLE_CLIENT_ID is missing in environment variables');
    }

    return new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );
}

export function getAuthUrl() {
    const client = createOAuth2Client();
    const scopes = [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/webmasters',
        'https://www.googleapis.com/auth/analytics.readonly',
    ];

    return client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
    });
}

export async function getTokens(code: string) {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    return tokens;
}

export async function getAuthorizedClient(userId: string) {
    const gscToken = await prisma.gscToken.findUnique({
        where: { userId },
    });

    if (!gscToken) {
        throw new Error('GSC not connected');
    }

    const expiryVal = Number(gscToken.expiryDate);
    const expiryDateMs = expiryVal > 0 && expiryVal < 10000000000 ? expiryVal * 1000 : expiryVal;

    const client = createOAuth2Client();
    client.setCredentials({
        access_token: gscToken.accessToken,
        ...(gscToken.refreshToken && { refresh_token: gscToken.refreshToken }),
        ...(expiryDateMs > 0 && { expiry_date: expiryDateMs }),
    });

    // Handle automatic refresh
    client.on('tokens', async (tokens: any) => {
        if (tokens.access_token) {
            const data: any = {
                accessToken: tokens.access_token,
            };
            if (tokens.expiry_date) {
                data.expiryDate = BigInt(tokens.expiry_date);
            }
            if (tokens.refresh_token) {
                data.refreshToken = tokens.refresh_token;
            }

            await prisma.gscToken.update({
                where: { userId },
                data
            });
        }
    });

    return google.searchconsole({ version: 'v1', auth: client });
}

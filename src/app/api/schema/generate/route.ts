import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AISchemaService } from '@/lib/seo/ai-schema';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url, websiteId, businessInfo, selectedSchemaTypes } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const service = new AISchemaService(12); // Limit to top 12 pages for performance
        const result = await service.generateSchemasForUrl(url, session.user.id, websiteId, businessInfo, selectedSchemaTypes);

        return NextResponse.json({
            success: true,
            count: result.length,
            schemas: result
        });
    } catch (error: any) {
        console.error('[API SCHEMA GENERATE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

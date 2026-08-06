import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuditEngine, AuditInput } from '@/lib/seo/audit-engine';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { url, pagespeed_data, lighthouse_data, html_data, http_data } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const auditInput: AuditInput = {
            url,
            pagespeed_data,
            lighthouse_data,
            html_data,
            http_data
        };

        const engine = new AuditEngine(auditInput);
        const results = await engine.run();

        return NextResponse.json(results);
    } catch (error: any) {
        console.error('[Audit API] Error:', error);
        return NextResponse.json({
            error: 'Failed to perform audit',
            details: error.message
        }, { status: 500 });
    }
}

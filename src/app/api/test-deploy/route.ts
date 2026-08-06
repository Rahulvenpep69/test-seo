import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ version: 4, timestamp: Date.now() });
}

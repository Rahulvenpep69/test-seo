import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ version: 3, timestamp: Date.now() });
}

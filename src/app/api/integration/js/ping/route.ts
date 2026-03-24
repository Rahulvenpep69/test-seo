import { NextRequest, NextResponse } from "next/server";

// In-memory store (simulation for demo, in production use Redis or Database)
const activeJsSites: Record<string, any> = (global as any).activeJsSites || {};
(global as any).activeJsSites = activeJsSites;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    try {
        const { siteId, url, title, description } = await req.json();
        activeJsSites[siteId] = { url, title, description, lastSeen: Date.now() };
        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
    }
}

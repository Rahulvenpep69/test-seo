import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// In-memory store (simulation for demo, in production use Redis or Database)
const jsOptimizations: Record<string, Record<string, any>> = (global as any).jsOptimizations || {};
(global as any).jsOptimizations = jsOptimizations;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const url = searchParams.get("url");

    if (!siteId || !url) {
        return NextResponse.json({ message: "Missing siteId or url" }, { status: 400, headers: corsHeaders });
    }

    try {
        // Fetch any applied AI schemas for the given URL
        const schemas = await prisma.aiSchema.findMany({
            where: {
                url: url,
                status: 'APPLIED'
            }
        });

        // Current mocked optimizations
        const siteOpts = jsOptimizations[siteId] || {};
        const pageOpts = siteOpts[url] ? { ...siteOpts[url] } : {};

        // Inject schemas into the payload if they exist
        if (schemas.length > 0) {
            pageOpts.schemas = schemas.map(s => s.generatedSchema);
        }

        if (Object.keys(pageOpts).length > 0) {
            return NextResponse.json(pageOpts, { headers: corsHeaders });
        } else {
            return NextResponse.json({ message: "No optimizations found" }, { status: 404, headers: corsHeaders });
        }
    } catch (error) {
        console.error('[INTEGRATION GET ERROR]', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { siteId, url, data } = await req.json();
        if (!jsOptimizations[siteId]) jsOptimizations[siteId] = {};
        jsOptimizations[siteId][url] = data;
        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
    }
}

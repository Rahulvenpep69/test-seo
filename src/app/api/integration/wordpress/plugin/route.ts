import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get("siteId");

        if (!siteId) {
            return new NextResponse("Missing siteId parameter", { status: 400 });
        }

        // Resolve the application's actual public URL origin
        let originUrl = req.nextUrl.origin;
        const forwardedHost = req.headers.get("x-forwarded-host");
        const forwardedProto = req.headers.get("x-forwarded-proto");

        if (forwardedHost && forwardedProto) {
            originUrl = `${forwardedProto}://${forwardedHost}`;
        } else if (req.headers.get("host")) {
            // Fallback for some hosting configurations
            const proto = req.headers.get("x-forwarded-proto") || (originUrl.startsWith("https") ? "https" : "http");
            originUrl = `${proto}://${req.headers.get("host")}`;
        }

        const phpContent = `<?php
/**
 * Plugin Name: SEO Platform Integration
 * Description: Automatically connects your WordPress site to the AI SEO Engine and injects real-time AI schemas.
 * Version: 1.0.0
 * Author: Anti-Gravity SEO
 */
if (!defined('ABSPATH')) exit;

add_action('wp_head', function() {
    echo '<script src="${originUrl}/seo-client.js" data-site-id="${siteId}"></script>';
});
`;

        const zip = new AdmZip();
        zip.addFile("seoptima-integration/seo-platform-integration.php", Buffer.from(phpContent, "utf8"));
        const buffer = zip.toBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": "attachment; filename=seoptima-integration.zip",
                "Content-Length": buffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("[PLUGIN GENERATION ERROR]", error);
        return new NextResponse("Internal Server Error generating plugin zip", { status: 500 });
    }
}

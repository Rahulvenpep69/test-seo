import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const secret = searchParams.get("secret");

    // Simulate PHP Bridge
    if (secret) {
        if (action === "posts") {
            return NextResponse.json(mockPosts);
        }
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Simulate REST API (Pages/Posts)
    const pathname = new URL(req.url).pathname;
    if (pathname.includes("/posts") || pathname.includes("/wp-json/wp/v2/posts")) {
        return NextResponse.json(mockPosts.filter(p => p.type === "post"));
    }
    if (pathname.includes("/pages") || pathname.includes("/wp-json/wp/v2/pages")) {
        return NextResponse.json(mockPosts.filter(p => p.type === "page"));
    }

    return NextResponse.json({ message: "Mock API Ready" });
}

export async function POST(req: NextRequest) {
    const { action } = await req.json().catch(() => ({}));

    // Handle the internal API redirect/call
    if (action === "posts") {
        return NextResponse.json(mockPosts);
    }

    if (action === "update") {
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Mock API POST Ready" });
}

const mockPosts = [
    {
        id: 1,
        title: { rendered: "How to Boost Your SEO in 2024" },
        content: { rendered: "SEO is changing rapidly with AI. You need to focus on content quality and technical health." },
        type: "post",
        link: "https://example.com/seo-2024"
    },
    {
        id: 2,
        title: { rendered: "The Ultimate Guide to Backlinks" },
        content: { rendered: "Backlinks are still a major ranking factor for Google and other search engines." },
        type: "post",
        link: "https://example.com/backlinks-guide"
    },
    {
        id: 3,
        title: { rendered: "About Our SEO Agency" },
        content: { rendered: "We provide professional SEO services to help businesses grow their online presence." },
        type: "page",
        link: "https://example.com/about"
    }
];

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";

// Helper to solve ByetHost/InfinityFree security wall
const solveSecurityWall = (html: string): string | null => {
    try {
        const matches = html.match(/toNumbers\s*\(\s*"([a-f0-9]+)"\s*\)/g);
        if (!matches || matches.length < 3) return null;

        const hexValues = matches.map((m) => m.match(/"([a-f0-9]+)"/)?.[1] || "");
        const ct = Buffer.from(hexValues[0], "hex");
        const key = Buffer.from(hexValues[1], "hex");
        const iv = Buffer.from(hexValues[2], "hex");

        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
        decipher.setAutoPadding(false);
        let decrypted = decipher.update(ct);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString("hex");
    } catch (e) {
        console.error("Failed to solve security wall", e);
        return null;
    }
};

export async function POST(req: NextRequest) {
    try {
        const { url, username, appPassword, cookie } = await req.json();
        const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");
        const baseUrl = url.replace(/\/$/, "");

        const getHeaders = (cookieValue?: string) => {
            const headers: any = {
                Authorization: `Basic ${auth}`,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                Referer: baseUrl + "/",
            };

            let cookieStr = "TestCookie=1";
            if (cookieValue) {
                const val = cookieValue.includes("=") ? cookieValue : `__test=${cookieValue}`;
                cookieStr = `${val}; TestCookie=1`;
            }
            headers["Cookie"] = cookieStr;

            return headers;
        };

        let currentCookie = cookie;

        const fetchPosts = async (type: string) => {
            let res = await axios.get(`${baseUrl}/wp-json/wp/v2/${type}`, {
                headers: getHeaders(currentCookie),
                timeout: 15000,
                validateStatus: () => true,
            });

            // If 403, it might be the security wall
            if ((res.status === 403 || res.status === 503) && typeof res.data === "string" && res.data.includes("aes.js")) {
                const solvedCookie = solveSecurityWall(res.data);
                if (solvedCookie) {
                    currentCookie = solvedCookie;
                    res = await axios.get(`${baseUrl}/wp-json/wp/v2/${type}`, {
                        headers: getHeaders(currentCookie),
                        timeout: 15000,
                        validateStatus: () => true,
                    });
                }
            }

            if (!Array.isArray(res.data)) {
                let fallback = await axios.get(
                    `${baseUrl}/index.php?rest_route=/wp/v2/${type}`,
                    {
                        headers: getHeaders(currentCookie),
                        timeout: 15000,
                        validateStatus: () => true,
                    }
                );
                if (Array.isArray(fallback.data))
                    return fallback.data.map((p: any) => ({
                        ...p,
                        type: type === "posts" ? "post" : "page",
                    }));

                // If we still don't have an array, check if it's a 403 error message
                if (res.status === 403) {
                    throw new Error("Access Forbidden by hosting provider. Please use the 'PHP Connection (Bridge)' method instead.");
                }

                return [];
            }

            return res.data.map((p: any) => ({
                ...p,
                type: type === "posts" ? "post" : "page",
            }));
        };

        const [posts, pages] = await Promise.all([
            fetchPosts("posts"),
            fetchPosts("pages"),
        ]);

        const combined = [...posts, ...pages];

        if (combined.length === 0) {
            return NextResponse.json(
                {
                    message:
                        "No posts or pages found. If your site is on ByetHost/InfinityFree, please use the 'PHP Connection' method.",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(combined);
    } catch (error: any) {
        return NextResponse.json(
            {
                message: error.message || "Failed to connect to WordPress site.",
                data: error.response?.data,
            },
            { status: error.response?.status || 500 }
        );
    }
}

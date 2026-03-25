import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
    try {
        const { url, username, appPassword, postId, postType, imageSrc, newAlt, cookie } = await req.json();

        if (!postId || !imageSrc || !newAlt) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
        const baseUrl = url.replace(/\/$/, '');
        const endpoint = postType === 'page' ? 'pages' : 'posts';

        const getHeaders = (cookieValue?: string) => {
            const headers: any = {
                'Authorization': `Basic ${auth}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': baseUrl + '/',
            };
            if (cookieValue) {
                headers['Cookie'] = cookieValue.includes('=') ? cookieValue : `__test=${cookieValue}`;
            }
            return headers;
        };

        // 1. Fetch current post content
        let response = await axios.get(`${baseUrl}/wp-json/wp/v2/${endpoint}/${postId}`, {
            headers: getHeaders(cookie),
            timeout: 15000,
            validateStatus: () => true
        });

        if (response.status !== 200) {
            return NextResponse.json({ message: `Failed to fetch post: ${response.status}`, data: response.data }, { status: response.status });
        }

        const post = response.data;
        const currentContent = post.content.rendered;

        // 2. Update alt tag using cheerio
        const $ = cheerio.load(currentContent, null, false); // null, false to avoid adding html/body tags
        let found = false;

        $('img').each((_, el) => {
            const src = $(el).attr('src');
            if (src === imageSrc || (src && imageSrc.endsWith(src)) || (src && src.endsWith(imageSrc))) {
                $(el).attr('alt', newAlt);
                found = true;
            }
        });

        if (!found) {
            return NextResponse.json({ message: 'Image not found in post content' }, { status: 404 });
        }

        const updatedContent = $.html();

        // 3. Update post content
        const updateResponse = await axios.post(`${baseUrl}/wp-json/wp/v2/${endpoint}/${postId}`, {
            content: updatedContent
        }, {
            headers: getHeaders(cookie),
            timeout: 15000,
            validateStatus: () => true
        });

        if (updateResponse.status >= 200 && updateResponse.status < 300) {
            return NextResponse.json({ success: true, data: updateResponse.data });
        }

        return NextResponse.json({ message: `Update failed: ${updateResponse.status}`, data: updateResponse.data }, { status: updateResponse.status });

    } catch (error: any) {
        console.error('Apply alt tag error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

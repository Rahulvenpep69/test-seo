import axios from 'axios';
import { robustFetch } from './fetch';
import * as htmlparser2 from 'htmlparser2';
import * as domutils from 'domutils';

export async function checkBrokenLinks(url: string, html?: string) {
    try {
        let content = html;
        if (!content) {
            const { html: fetchedHtml, status } = await robustFetch(url);
            if (status !== 200 || !fetchedHtml) throw new Error(`Failed to fetch ${url} (Status ${status})`);
            content = fetchedHtml;
        }

        const dom = htmlparser2.parseDocument(content!);
        const aNodes = domutils.findAll((ele) => ele.name === 'a', dom.children);
        const links: string[] = [];

        aNodes.forEach((node) => {
            const href = node.attribs.href;
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                try {
                    const absoluteUrl = new URL(href, url).href;
                    if (absoluteUrl.startsWith('http')) {
                        links.push(absoluteUrl);
                    }
                } catch (e) { }
            }
        });

        const uniqueLinks = Array.from(new Set(links)).slice(0, 50); // Scan up to 50 links
        const results = await Promise.all(
            uniqueLinks.map(async (link) => {
                try {
                    const res = await axios.head(link, { timeout: 5000 }).catch(() => axios.get(link, { timeout: 5000 }));
                    return { url: link, ok: true, status: res.status };
                } catch (error: any) {
                    return { url: link, ok: false, status: error.response?.status || 0, reason: error.message };
                }
            })
        );

        const brokenLinks = results.filter(r => !r.ok);
        const allLinks = results.map(r => {
            const isInternal = r.url.startsWith(url) || r.url.startsWith(new URL(url).origin);
            return {
                ...r,
                isInternal,
                type: isInternal ? 'Internal' : 'External'
            };
        });

        return {
            totalLinks: links.length,
            scannedLinks: uniqueLinks.length,
            brokenLinks: brokenLinks.length,
            brokenDetails: brokenLinks.map(link => ({
                url: link.url,
                status: link.status,
                reason: (link as any).reason || 'Status Code ' + link.status
            })),
            allLinks
        };
    } catch (error) {
        return { totalLinks: 0, scannedLinks: 0, brokenLinks: 0, brokenDetails: [], allLinks: [] };
    }
}

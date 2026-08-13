import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

async function browserFetch(url: string, ua: string): Promise<{ html: string; status: number; url: string; error?: string }> {
    console.log(`[browserFetch] Using stealth browser for ${url}`);
    let browser;
    try {
        const { chromium } = eval('require')('playwright-extra');
        const stealth = eval('require')('puppeteer-extra-plugin-stealth')();
        chromium.use(stealth);

        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        const context = await browser.newContext({ userAgent: ua });
        const page = await context.newPage();

        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        if (!response) throw new Error('No response from browser');

        const html = await page.content();
        const status = response.status();

        await browser.close();
        return { html, status, url };
    } catch (e: any) {
        if (browser) {
            try { await browser.close(); } catch {}
        }
        console.error(`[browserFetch] Browser error for ${url}:`, e?.message || e);
        return { html: '', status: 0, url, error: e?.message || 'Browser crash' };
    }
}

export async function robustFetch(url: string, useBrowser: boolean = false): Promise<{ html: string; status: number; url: string; error?: string }> {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    if (useBrowser) {
        try {
            const res = await browserFetch(targetUrl, ua);
            if (res.html && res.status > 0) {
                return res;
            }
        } catch (e) {
            console.warn(`[robustFetch] Browser fetch exception for ${targetUrl}. Falling back to axios.`);
        }
    }

    try {
        console.log(`[robustFetch] Attempting axios for ${targetUrl}`);
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,static/view;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
            timeout: 10000,
            validateStatus: () => true, // Accept all status codes
            maxRedirects: 5,
            httpsAgent
        });

        const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        // Only detect actual Cloudflare challenge pages, NOT sites that merely use Cloudflare CDN.
        // Real challenge pages are small (< 50KB) and contain specific challenge markers.
        const challengeMarkers = [
            'cf-browser-verification',
            'cf_chl_opt',
            'cf-challenge-running',
            'Checking your browser',
            'Just a moment',
        ];
        const hasChallengeMarker = challengeMarkers.some(marker => html.includes(marker));
        const hasCaptcha = html.includes('captcha') && html.length < 50000;
        const hasDbError = html.includes('Error establishing a database connection') || html.includes('Database Error');
        const isSmallPage = html.length < 50000;
        const isChallenge = (hasChallengeMarker && isSmallPage) || hasCaptcha || hasDbError || (response.status === 403 && isSmallPage && hasChallengeMarker);

        if (!isChallenge && html.length > 500) {
            return { html, status: response.status, url: response.config.url || targetUrl };
        }

        if (isChallenge) {
            if (process.env.VERCEL) {
                console.log(`[robustFetch] Vercel environment detected. Skipping Playwright fallback for ${targetUrl}`);
                return {
                    html,
                    status: response.status,
                    url: response.config.url || targetUrl,
                    error: 'Analysis blocked by Cloudflare security. This feature requires running the app locally or on a VPS.'
                };
            }
            console.log(`[robustFetch] Detected challenge/block for ${targetUrl}. Falling back to browserFetch.`);
            return browserFetch(targetUrl, ua);
        }

        return {
            html,
            status: response.status,
            url: response.config.url || targetUrl,
            error: 'Empty or short response'
        };

    } catch (error: any) {
        console.log(`[robustFetch] Axios error: ${error.message} for ${targetUrl}`);

        // Fallback to basic fetch if axios fails completely
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(targetUrl, {
                headers: { 'User-Agent': ua },
                redirect: 'follow',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const html = await res.text();
            return { html, status: res.status, url: res.url };
        } catch (fetchError: any) {
            let friendlyError = error?.message || 'Failed to reach website';
            if (friendlyError.includes('ENOTFOUND')) {
                friendlyError = 'Domain not found or DNS resolution failed. Please check the website URL.';
            } else if (friendlyError.includes('ETIMEDOUT') || friendlyError.includes('timeout')) {
                friendlyError = 'Connection timed out while attempting to reach the website.';
            } else if (friendlyError.includes('ECONNREFUSED')) {
                friendlyError = 'Connection refused by destination web server.';
            } else if (friendlyError.includes('certificate')) {
                friendlyError = 'SSL certificate error on destination web server.';
            }
            return { html: '', status: 0, url: targetUrl, error: friendlyError };
        }
    }
}

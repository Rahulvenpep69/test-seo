import axios from 'axios';

// --- In-memory cache ---
interface CacheEntry {
    data: any;
    expiresAt: number;
}

const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes per URL result

// Quota backoff: if we get a 429, don't retry the API for QUOTA_BACKOFF_MS
let quotaExceededUntil: number = 0;
const QUOTA_BACKOFF_MS = 60 * 60 * 1000; // 1 hour

// Using PageSpeed Insights API for real-time performance data
// This avoids running Lighthouse locally which is resource intensive
export async function getPerformanceMetrics(url: string) {
    const PAGESPEED_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const now = Date.now();

    // Return cached result if still valid
    const cached = resultCache.get(url);
    if (cached && now < cached.expiresAt) {
        return cached.data;
    }

    // Skip API call if quota is exhausted
    if (now < quotaExceededUntil) {
        return {
            error: 'Quota Exceeded',
            isSimulated: true,
            performanceScore: 0,
            firstContentfulPaint: 'Estimated',
            largestContentfulPaint: 'Estimated',
            cumulativeLayoutShift: 'Estimated',
            totalBlockingTime: 'Estimated',
            speedIndex: 'Estimated'
        };
    }

    try {
        const response = await axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed`, {
            params: {
                url: url,
                key: PAGESPEED_API_KEY,
                strategy: 'mobile'
            },
            timeout: 15000 // 15s timeout
        });

        const data = response.data.lighthouseResult;

        const result = {
            performanceScore: Math.round((data?.categories?.performance?.score || 0) * 100),
            firstContentfulPaint: data?.audits?.['first-contentful-paint']?.displayValue || 'N/A',
            largestContentfulPaint: data?.audits?.['largest-contentful-paint']?.displayValue || 'N/A',
            cumulativeLayoutShift: data?.audits?.['cumulative-layout-shift']?.displayValue || 'N/A',
            totalBlockingTime: data?.audits?.['total-blocking-time']?.displayValue || 'N/A',
            speedIndex: data?.audits?.['speed-index']?.displayValue || 'N/A',
            isSimulated: false
        };

        // Cache the successful result
        resultCache.set(url, { data: result, expiresAt: now + CACHE_TTL_MS });

        return result;
    } catch (error: any) {
        const status = error.response?.status;
        const isQuotaError = status === 429;
        const isAuthError = status === 403 || status === 401;

        if (isQuotaError) {
            // Set the quota backoff so we skip the API for the next hour
            quotaExceededUntil = now + QUOTA_BACKOFF_MS;
            console.warn('[PageSpeed] Daily quota exceeded. Switching to heuristic fallback for 1 hour.');
        } else if (isAuthError) {
            console.error('[PageSpeed] API key is invalid or unauthorized.');
        } else {
            console.warn('[PageSpeed] API call failed (status:', status, '). Using heuristic fallback.');
        }

        return {
            error: isAuthError ? 'API Key Invalid' : (isQuotaError ? 'Quota Exceeded' : 'API Timeout'),
            isSimulated: true,
            performanceScore: 0,
            firstContentfulPaint: 'Estimated',
            largestContentfulPaint: 'Estimated',
            cumulativeLayoutShift: 'Estimated',
            totalBlockingTime: 'Estimated',
            speedIndex: 'Estimated'
        };
    }
}

export function calculateHeuristicPerformance(html: string, technical: any) {
    let score = 100;

    // Deduct for large HTML size
    if (technical.htmlSize > 500000) score -= 20;
    else if (technical.htmlSize > 200000) score -= 10;

    // Deduct for many inline styles
    if (technical.inlineCssCount > 50) score -= 15;
    else if (technical.inlineCssCount > 10) score -= 5;

    // Deduct for missing responsive images
    if (technical.totalImages > 0 && technical.responsiveImages / technical.totalImages < 0.5) score -= 15;

    // Deduct for missing modern formats
    if (technical.totalImages > 0 && technical.modernFormatImages / technical.totalImages < 0.5) score -= 10;

    // Deduct for many images
    if (technical.totalImages > 50) score -= 10;

    score = Math.max(10, score);

    // Estimate individual metrics based on score for better UX when API is missing
    // These are simplified linear approximations
    const fcp = ((100 - score) * 0.04 + 0.8).toFixed(1);
    const lcp = ((100 - score) * 0.06 + 1.2).toFixed(1);
    const tbt = Math.max(0, (100 - score) * 5);
    const cls = ((100 - score) * 0.002).toFixed(3);

    return {
        score,
        fcp: `${fcp}s`,
        lcp: `${lcp}s`,
        tbt: `${tbt}ms`,
        cls: cls,
        speedIndex: `${lcp}s`
    };
}

export async function getChromeUXReport(url: string) {
    const PAGESPEED_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    try {
        const response = await axios.post(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${PAGESPEED_API_KEY}`, {
            url: url
        });
        return response.data;
    } catch (error) {
        console.warn('[CrUX] Failed to fetch CrUX data, ignoring.');
        return { error: 'Failed to fetch CrUX data' };
    }
}

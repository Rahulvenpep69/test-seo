import axios from 'axios';

export async function getSearchConsoleData(url: string) {
    const SEARCH_CONSOLE_API_KEY = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
    const CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const CUSTOM_SEARCH_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;

    if (!SEARCH_CONSOLE_API_KEY) return null;

    try {
        // Custom Search can be used to check indexing status if CX is available
        if (!CUSTOM_SEARCH_CX) {
            console.warn('Google Custom Search Engine ID (GOOGLE_CUSTOM_SEARCH_CX) is not configured.');
            return null;
        }

        const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
            params: {
                key: CUSTOM_SEARCH_API_KEY,
                cx: CUSTOM_SEARCH_CX,
                q: `site:${url}`
            }
        });

        return response.data;
    } catch (error: any) {
        console.error('GSC Data Error:', error.response?.data || error.message);
        return null;
    }
}

export async function checkIndexStatus(url: string) {
    const CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const CUSTOM_SEARCH_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;
    
    if (!CUSTOM_SEARCH_API_KEY || !CUSTOM_SEARCH_CX) {
        return { indexed: false, error: 'Google Custom Search API Key or CX not configured' };
    }

    try {
        const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
            params: {
                key: CUSTOM_SEARCH_API_KEY,
                cx: CUSTOM_SEARCH_CX,
                q: `info:${url}`
            }
        });

        const isIndexed = response.data.items && response.data.items.length > 0;
        return { indexed: isIndexed, raw: response.data };
    } catch (error: any) {
        console.error('Index Check Error:', error.response?.data || error.message);
        return { indexed: false, error: 'Could not verify indexing' };
    }
}

export async function calculateAuthorityScoring(url: string, indexStatus: any) {
    let domainAuthority = 15;
    let spamScore = 5;

    if (indexStatus.indexed) {
        domainAuthority += 25;
        if (indexStatus.raw?.searchInformation?.totalResults > 1000) {
            domainAuthority += 30;
        } else if (indexStatus.raw?.searchInformation?.totalResults > 100) {
            domainAuthority += 15;
        }
    } else {
        spamScore += 20;
    }

    const hostname = new URL(url).hostname;
    if (hostname.length < 15) domainAuthority += 10;

    if (hostname.endsWith('.com') || hostname.endsWith('.org') || hostname.endsWith('.edu')) {
        domainAuthority += 10;
    } else if (hostname.endsWith('.xyz') || hostname.endsWith('.top') || hostname.endsWith('.work')) {
        spamScore += 15;
    }

    const spamKeywords = ['cheap', 'free', 'buy', 'pill', 'casino', 'money'];
    if (spamKeywords.some(word => hostname.toLowerCase().includes(word))) {
        spamScore += 30;
    }

    return {
        domainAuthority: Math.min(domainAuthority, 100),
        spamScore: Math.min(spamScore, 100)
    };
}

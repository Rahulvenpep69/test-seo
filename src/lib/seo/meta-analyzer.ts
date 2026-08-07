import * as cheerio from 'cheerio';
import { Crawler } from './crawler';

export interface MetaData {
    url: string;
    title: string;
    description: string;
    h1: string;
    h2: string;
    content: string;
    status: number;
}

export class MetaAnalyzer {
    private crawler: Crawler;

    constructor(maxPages: number = 50) {
        this.crawler = new Crawler(maxPages);
    }

    private cleanText(text: string): string {
        if (!text) return '';
        // Remove common SVG/code junk identified by user
        const junkWords = [/svg/gi, /icon/gi, /file/gi, /image/gi, /path/gi, /cls/gi, /div/gi, /span/gi, /script/gi, /style/gi, /service-svg/gi, /save-svg/gi, /speak-svg/gi, /sizzle-svg/gi, /sell-svg/gi, /marketingsell/gi];
        let cleaned = text;
        junkWords.forEach(regex => {
            cleaned = cleaned.replace(regex, '');
        });
        // Remove extra spaces and hyphens at the end
        return cleaned.replace(/\s+/g, ' ').replace(/[-\s]+$/, '').trim();
    }

    async analyze(url: string): Promise<MetaData[]> {
        const crawlResults = await this.crawler.crawl(url);
        const analyzedData: MetaData[] = [];

        for (const [pageUrl, result] of Object.entries(crawlResults)) {
            if (result.status === 200 && result.html) {
                const $ = cheerio.load(result.html);

                // Remove SVG elements before extracting text to prevent junk
                $('svg, script, style, noscript, nav, footer').remove();

                const title = this.cleanText($('title').first().text() || $('meta[property="og:title"]').first().attr('content') || '');
                
                let rawDescription = '';
                $('meta').each((_, el) => {
                    const name = $(el).attr('name');
                    const property = $(el).attr('property');
                    if (name && name.toLowerCase() === 'description' && !rawDescription) {
                        rawDescription = $(el).attr('content') || '';
                    } else if (property && property.toLowerCase() === 'og:description' && !rawDescription) {
                        rawDescription = $(el).attr('content') || '';
                    }
                });
                const description = this.cleanText(rawDescription);
                
                const h1 = this.cleanText($('h1').first().text());
                const h2 = $('h2').slice(0, 3).map((_, el) => $(el).text()).get().join(', ');
                const content = this.cleanText($('body').text().substring(0, 1000));

                analyzedData.push({
                    url: pageUrl,
                    title,
                    description,
                    h1,
                    h2: this.cleanText(h2),
                    content,
                    status: result.status
                });
            } else {
                analyzedData.push({
                    url: pageUrl,
                    title: '',
                    description: '',
                    h1: '',
                    h2: '',
                    content: '',
                    status: result.status
                });
            }
        }

        return analyzedData;
    }
}

import * as htmlparser2 from 'htmlparser2';
import * as domutils from 'domutils';
import { AIAuditService } from './ai-audit';

export interface AuditInput {
    url: string;
    pagespeed_data?: any;
    lighthouse_data?: any;
    html_data?: string;
    http_data?: {
        status: number;
        headers?: Record<string, string>;
        links?: Array<{ url: string; status: number }>;
    };
}

export interface AuditResult {
    performance: any;
    technicalSeo: any;
    onPageSeo: any;
    imagesAndMedia: any;
    structureAndLinks: any;
    scoreBreakdown: any;
    priorityFixes: any[];
    finalVerdict: any;
    confidence: number;
}

export class AuditEngine {
    private input: AuditInput;
    private dom: any;

    constructor(input: AuditInput) {
        this.input = input;
        if (input.html_data) {
            this.dom = htmlparser2.parseDocument(input.html_data);
        }
    }

    public async run(): Promise<AuditResult> {
        const perf = this.analyzePerformance();
        const tech = this.analyzeTechnical();
        const onPage = this.analyzeOnPage();
        const media = this.analyzeMedia();
        const structureAndLinks = this.analyzeStructureAndLinks();

        const score = this.calculateScores(perf, tech, onPage, media, structureAndLinks);

        // Use AI Audit Service for PROOF-BASED issue cards
        let fixes: any[] = [];
        try {
            const aiService = new AIAuditService();
            fixes = await aiService.generateIssues(this.input);
        } catch (e) {
            console.error("AI Service failed to generate issues", e);
            // Fallback to heuristic
            fixes = this.generatePriorityFixes(perf, tech, onPage, media, structureAndLinks);
        }

        const verdict = this.generateFinalVerdict(score, fixes);

        return {
            performance: perf,
            technicalSeo: tech,
            onPageSeo: onPage,
            imagesAndMedia: media,
            structureAndLinks: structureAndLinks,
            scoreBreakdown: score,
            priorityFixes: fixes,
            finalVerdict: verdict,
            confidence: this.calculateConfidence()
        };
    }

    private analyzePerformance() {
        const ps = this.input.pagespeed_data;
        const lh = this.input.lighthouse_data;

        if (!ps && !lh) return { status: 'Data not available' };

        const lcp = ps?.loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile
            || lh?.audits?.['largest-contentful-paint']?.numericValue;
        const cls = ps?.loadingExperience?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
            || lh?.audits?.['cumulative-layout-shift']?.numericValue;
        const tbt = lh?.audits?.['total-blocking-time']?.numericValue;

        const classify = (val: number, good: number, poor: number, isCls = false) => {
            const actualVal = isCls ? val : val / 1000; // MS to Seconds
            if (actualVal <= good) return 'GOOD';
            if (actualVal <= poor) return 'NEEDS IMPROVEMENT';
            return 'POOR';
        };

        return {
            lcp: lcp ? { value: lcp, status: classify(lcp, 2.5, 4.0) } : 'Data not available',
            cls: cls !== undefined ? { value: cls, status: classify(cls, 0.1, 0.25, true) } : 'Data not available',
            tbt: tbt ? { value: tbt, status: classify(tbt, 200, 600) } : 'Data not available'
        };
    }

    private analyzeTechnical() {
        if (!this.dom && !this.input.http_data) return { status: 'Data not available' };

        const title = domutils.findOne(e => e.name === 'title', this.dom.children);
        const metaDesc = domutils.findOne(e => e.name === 'meta' && e.attribs.name === 'description', this.dom.children);
        const canonical = domutils.findOne(e => e.name === 'link' && e.attribs.rel === 'canonical', this.dom.children);
        const robotsMeta = domutils.findOne(e => e.name === 'meta' && e.attribs.name === 'robots', this.dom.children);

        return {
            titleTag: title ? 'Exists' : 'Missing',
            metaDescription: metaDesc ? 'Exists' : 'Missing',
            canonicalTag: canonical ? 'Exists' : 'Missing',
            robotsMeta: robotsMeta ? { content: robotsMeta.attribs.content } : 'Missing',
            httpStatus: this.input.http_data?.status || 'Data not available'
            // robots.txt and sitemap would need separate fetch or data
        };
    }

    private analyzeOnPage() {
        if (!this.dom) return { status: 'Data not available' };

        const titleText = domutils.textContent(domutils.findOne(e => e.name === 'title', this.dom.children) || { children: [] } as any).trim();
        const metaDesc = domutils.findOne(e => e.name === 'meta' && e.attribs.name === 'description', this.dom.children)?.attribs.content || '';
        const h1s = domutils.findAll(e => e.name === 'h1', this.dom.children);
        const h2s = domutils.findAll(e => e.name === 'h2', this.dom.children);

        return {
            titleLength: { length: titleText.length, status: titleText.length >= 50 && titleText.length <= 60 ? 'IDEAL' : 'NON-IDEAL' },
            metaLength: { length: metaDesc.length, status: metaDesc.length >= 120 && metaDesc.length <= 160 ? 'IDEAL' : 'NON-IDEAL' },
            h1Count: h1s.length,
            h2Structure: h2s.map(h => domutils.textContent(h).trim()).slice(0, 5)
        };
    }

    private analyzeMedia() {
        if (!this.dom) return { status: 'Data not available' };

        const imgs = domutils.findAll(e => e.name === 'img', this.dom.children);
        const missingAlt = imgs.filter(img => !img.attribs.alt);

        return {
            totalImages: imgs.length,
            missingAlt: missingAlt.length,
            formats: Array.from(new Set(imgs.map(img => img.attribs.src?.split('.').pop()).filter(Boolean)))
        };
    }

    private analyzeStructureAndLinks() {
        if (!this.dom) return { status: 'Data not available' };

        const links = domutils.findAll(e => e.name === 'a', this.dom.children);
        const internal = links.filter(l => l.attribs.href?.startsWith('/') || l.attribs.href?.includes(this.input.url));

        const brokenLinks = this.input.http_data?.links?.filter(l => l.status >= 400) || [];

        return {
            internalLinksCount: internal.length,
            anchorQualities: internal.map(l => domutils.textContent(l).trim()).filter(t => t.length > 0).slice(0, 10),
            brokenLinks: brokenLinks.length > 0 ? brokenLinks : 'None detected'
        };
    }

    private calculateScores(perf: any, tech: any, onPage: any, media: any, structure: any) {
        let scores = {
            performance: 100,
            technical: 100,
            onPage: 100,
            content: 100,
            structure: 100
        };

        // Simplified logic for weights
        if (perf.lcp?.status === 'POOR') scores.performance -= 40;
        if (perf.cls?.status === 'POOR') scores.performance -= 40;

        if (tech.titleTag === 'Missing') scores.technical -= 30;
        if (tech.metaDescription === 'Missing') scores.technical -= 30;

        if (onPage.h1Count !== 1) scores.onPage -= 50;
        if (onPage.titleLength?.status === 'NON-IDEAL') scores.onPage -= 20;

        // Weights: Perf 30%, Tech 25%, On-page 25%, Content 10%, Structure 10%
        const overall = (scores.performance * 0.3) + (scores.technical * 0.25) + (scores.onPage * 0.25) + (scores.content * 0.1) + (scores.structure * 0.1);

        return {
            ...scores,
            overall: Math.round(overall)
        };
    }

    private generatePriorityFixes(perf: any, tech: any, onPage: any, media: any, structure: any) {
        const fixes = [];

        if (perf.lcp?.status === 'POOR') {
            fixes.push({
                issue: 'High Largest Contentful Paint (LCP)',
                why: 'Google considers LCP > 4s as poor UX, impacting rankings.',
                fix: 'Optimize hero images and reduce server response time.'
            });
        }

        if (tech.titleTag === 'Missing') {
            fixes.push({
                issue: 'Missing Title Tag',
                why: 'The title tag is the most important on-page SEO element.',
                fix: 'Add a unique, descriptive <title> tag between 50-60 characters.'
            });
        }

        if (onPage.h1Count > 1) {
            fixes.push({
                issue: 'Multiple H1 Tags',
                why: 'Multiple H1s dilute keyword focus and confuse crawlers.',
                fix: 'Ensure only one H1 tag exists per page.'
            });
        }

        return fixes;
    }

    private generateFinalVerdict(score: any, fixes: any[]) {
        let health = 'POOR';
        if (score.overall > 80) health = 'GOOD';
        else if (score.overall > 50) health = 'NEEDS IMPROVEMENT';

        return {
            health,
            growthPotential: score.overall < 50 ? 'HIGH' : (score.overall < 80 ? 'MEDIUM' : 'LOW'),
            summary: `This website has a score of ${score.overall}/100. ${fixes.length} critical issues are holding back rankings.`
        };
    }

    private calculateConfidence() {
        let dataPoints = 0;
        if (this.input.pagespeed_data) dataPoints++;
        if (this.input.lighthouse_data) dataPoints++;
        if (this.input.html_data) dataPoints++;
        if (this.input.http_data) dataPoints++;

        return (dataPoints / 4) * 100;
    }
}

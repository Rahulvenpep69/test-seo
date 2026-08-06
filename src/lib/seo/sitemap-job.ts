import { prisma } from '@/lib/prisma';
import { SitemapGenerator } from './sitemap-generator';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export class SitemapJob {
    async runForWebsite(websiteId: string) {
        console.log(`[SitemapJob] Starting for website: ${websiteId}`);

        const website = await prisma.website.findUnique({
            where: { id: websiteId },
            include: { user: { include: { gscToken: true } } }
        });

        if (!website || (!website.domain && !website.subdomain)) {
            console.error(`[SitemapJob] Website not found or missing domain: ${websiteId}`);
            return;
        }

        const targetUrl = website.domain || `https://${website.subdomain}.antigravity.run`;
        const baseUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

        try {
            // 1. Generate Sitemap
            const generator = new SitemapGenerator(1000, 3);
            const { entries, excluded } = await generator.generate(baseUrl);
            const xml = SitemapGenerator.toXml(entries);

            // 2. Save Sitemap
            // In a production Next.js app on Vercel, we can't write to /public.
            // We'll save it to the DB and also try to write to public for local environments.
            // await prisma.website.update(...) removed
            console.log(`[SitemapJob] Generated XML with ${entries.length} entries`);

            // Local filesystem write (if possible)
            try {
                const publicDir = path.join(process.cwd(), 'public');
                // For multi-tenant, we might need sitemaps/[domain]/sitemap.xml
                // But for now, following literal request.
                if (fs.existsSync(publicDir)) {
                    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
                    console.log(`[SitemapJob] Saved sitemap.xml to /public`);
                }
            } catch (e) {
                console.warn(`[SitemapJob] Could not write to /public filesystem:`, e);
            }

            // 3. Update Robots.txt
            await this.updateRobotsTxt(baseUrl);

            // 4. Submit to Google Search Console
            if (website.user.gscToken) {
                await this.submitToGoogle(website.user.id, baseUrl);
                console.log(`[SitemapJob] Submitted to GSC`);
            }

            console.log(`[SitemapJob] Successfully completed for ${websiteId}`);
            return { entries, excluded, xml };
        } catch (error) {
            console.error(`[SitemapJob] Error for ${websiteId}:`, error);
            // Removed update.
            throw error;
        }
    }

    private async updateRobotsTxt(baseUrl: string) {
        try {
            const publicDir = path.join(process.cwd(), 'public');
            const robotsPath = path.join(publicDir, 'robots.txt');
            const sitemapLine = `Sitemap: ${baseUrl.replace(/\/+$/, '')}/sitemap.xml`;

            let content = '';
            if (fs.existsSync(robotsPath)) {
                content = fs.readFileSync(robotsPath, 'utf8');
                if (!content.includes('Sitemap:')) {
                    content += `\n\n${sitemapLine}`;
                } else {
                    // Replace existing sitemap line or add if different
                    content = content.replace(/Sitemap: .*/g, sitemapLine);
                }
            } else {
                content = `User-agent: *\nAllow: /\n\n${sitemapLine}`;
            }

            if (fs.existsSync(publicDir)) {
                fs.writeFileSync(robotsPath, content);
                console.log(`[SitemapJob] Updated robots.txt with sitemap link`);
            }
        } catch (e) {
            console.error(`[SitemapJob] Failed to update robots.txt:`, e);
        }
    }

    private async submitToGoogle(userId: string, siteUrl: string) {
        try {
            const gscToken = await prisma.gscToken.findUnique({
                where: { userId }
            });

            if (!gscToken) return;

            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({
                access_token: gscToken.accessToken,
                refresh_token: gscToken.refreshToken,
                expiry_date: Number(gscToken.expiryDate)
            });

            const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });

            // Normalize siteUrl for GSC (must end with / if it's a domain property)
            const normalizedSiteUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
            const sitemapUrl = `${siteUrl.replace(/\/+$/, '')}/sitemap.xml`;

            await webmasters.sitemaps.submit({
                siteUrl: normalizedSiteUrl,
                feedpath: sitemapUrl
            });

            console.log(`[SitemapJob] Submitted sitemap to Google Search Console: ${sitemapUrl}`);
        } catch (e) {
            console.error(`[SitemapJob] Google Submission Failed:`, e);
        }
    }
}

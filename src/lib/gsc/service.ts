import { getAuthorizedClient } from './client';
import { prisma } from '../prisma';
import { subDays, format } from 'date-fns';

export class GscService {
    static async listProperties(userId: string) {
        const client = await getAuthorizedClient(userId);
        const res = await client.sites.list();
        return res.data.siteEntry || [];
    }

    static async syncWebsiteData(userId: string, websiteId: string, propertyUrl: string) {
        const client = await getAuthorizedClient(userId);

        // 1. Ensure GscProperty exists
        const property = await prisma.gscProperty.upsert({
            where: { websiteId },
            update: { propertyUrl, verified: true },
            create: { websiteId, propertyUrl, verified: true },
        });

        // 2. Fetch Performance Data (Last 60 days to allow for comparisons)
        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 60), 'yyyy-MM-dd');

        // Fetch overall stats by date
        const datePerformance = await client.searchanalytics.query({
            siteUrl: propertyUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['date'],
            }
        });

        // Fetch top queries
        const queryPerformance = await client.searchanalytics.query({
            siteUrl: propertyUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['query'],
                rowLimit: 50,
            }
        });

        // Fetch top pages
        const pagePerformance = await client.searchanalytics.query({
            siteUrl: propertyUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['page'],
                rowLimit: 50,
            }
        });

        // Fetch top countries
        const countryPerformance = await client.searchanalytics.query({
            siteUrl: propertyUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['country'],
                rowLimit: 50,
            }
        });

        // Fetch top devices
        const devicePerformance = await client.searchanalytics.query({
            siteUrl: propertyUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['device'],
                rowLimit: 10,
            }
        });

        // 3. Save to Database
        // For performance, we'll clear and refill for the specific property
        // (In a production app, we'd use a more sophisticated merging strategy)
        await prisma.gscPerformance.deleteMany({
            where: { propertyId: property.id }
        });

        // Save aggregates by date
        if (datePerformance.data.rows) {
            await prisma.gscPerformance.createMany({
                data: datePerformance.data.rows.map(row => ({
                    propertyId: property.id,
                    date: new Date(row.keys![0]),
                    clicks: row.clicks || 0,
                    impressions: row.impressions || 0,
                    ctr: row.ctr || 0,
                    position: row.position || 0,
                }))
            });
        }

        // Save top queries
        if (queryPerformance.data.rows) {
            await prisma.gscPerformance.createMany({
                data: queryPerformance.data.rows.map(row => ({
                    propertyId: property.id,
                    date: new Date(), // Using current date for breakdown snapshots
                    query: row.keys![0],
                    clicks: row.clicks || 0,
                    impressions: row.impressions || 0,
                    ctr: row.ctr || 0,
                    position: row.position || 0,
                    type: 'QUERY_BREAKDOWN'
                }))
            });
        }

        // Save top pages
        if (pagePerformance.data.rows) {
            await prisma.gscPerformance.createMany({
                data: pagePerformance.data.rows.map(row => ({
                    propertyId: property.id,
                    date: new Date(),
                    page: row.keys![0],
                    clicks: row.clicks || 0,
                    impressions: row.impressions || 0,
                    ctr: row.ctr || 0,
                    position: row.position || 0,
                    type: 'PAGE_BREAKDOWN'
                }))
            });
        }

        // Save top countries
        if (countryPerformance.data.rows) {
            await prisma.gscPerformance.createMany({
                data: countryPerformance.data.rows.map(row => ({
                    propertyId: property.id,
                    date: new Date(),
                    country: row.keys![0],
                    clicks: row.clicks || 0,
                    impressions: row.impressions || 0,
                    ctr: row.ctr || 0,
                    position: row.position || 0,
                    type: 'COUNTRY_BREAKDOWN'
                }))
            });
        }

        // Save top devices
        if (devicePerformance.data.rows) {
            await prisma.gscPerformance.createMany({
                data: devicePerformance.data.rows.map(row => ({
                    propertyId: property.id,
                    date: new Date(),
                    device: row.keys![0],
                    clicks: row.clicks || 0,
                    impressions: row.impressions || 0,
                    ctr: row.ctr || 0,
                    position: row.position || 0,
                    type: 'DEVICE_BREAKDOWN'
                }))
            });
        }

        await prisma.gscProperty.update({
            where: { id: property.id },
            data: { lastSyncedAt: new Date() }
        });

        return { success: true };
    }

    static async getWebsitePerformance(websiteId: string) {
        const property = await prisma.gscProperty.findUnique({
            where: { websiteId },
            include: { performance: true }
        });

        if (!property) return null;

        // Filter by type
        // Filter by type
        const allDateSeries = property.performance.filter(p => !p.type || p.type === 'WEB').sort((a, b) => a.date.getTime() - b.date.getTime());

        // Split into current and previous period (assume 30 days vs 30 days)
        const midPoint = subDays(new Date(), 30);
        const currentPeriod = allDateSeries.filter(p => p.date >= midPoint);
        const previousPeriod = allDateSeries.filter(p => p.date < midPoint);

        const queries = property.performance.filter(p => p.type === 'QUERY_BREAKDOWN').sort((a, b) => b.clicks - a.clicks);
        const pages = property.performance.filter(p => p.type === 'PAGE_BREAKDOWN').sort((a, b) => b.clicks - a.clicks);
        const countries = property.performance.filter(p => p.type === 'COUNTRY_BREAKDOWN').sort((a, b) => b.clicks - a.clicks);
        const devices = property.performance.filter(p => p.type === 'DEVICE_BREAKDOWN').sort((a, b) => b.clicks - a.clicks);

        // Aggregate stats for current period
        const totalClicks = currentPeriod.reduce((acc, curr) => acc + curr.clicks, 0);
        const totalImpressions = currentPeriod.reduce((acc, curr) => acc + curr.impressions, 0);
        const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const averagePosition = currentPeriod.length > 0
            ? currentPeriod.reduce((acc, curr) => acc + curr.position, 0) / currentPeriod.length
            : 0;

        // Aggregate stats for previous period
        const prevClicks = previousPeriod.reduce((acc, curr) => acc + curr.clicks, 0);
        const prevImpressions = previousPeriod.reduce((acc, curr) => acc + curr.impressions, 0);
        const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
        const prevPosition = previousPeriod.length > 0
            ? previousPeriod.reduce((acc, curr) => acc + curr.position, 0) / previousPeriod.length
            : 0;

        // Calculate trends
        const calculateTrend = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? '+100%' : '0%';
            const change = ((curr - prev) / prev) * 100;
            return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
        };

        const calculatePosTrend = (curr: number, prev: number) => {
            if (prev === 0) return '0.0';
            const change = prev - curr; // Lower position is better
            return `${change >= 0 ? '+' : ''}${change.toFixed(1)}`;
        };

        return {
            totalClicks,
            totalImpressions,
            averageCtr,
            averagePosition,
            trends: {
                clicks: calculateTrend(totalClicks, prevClicks),
                impressions: calculateTrend(totalImpressions, prevImpressions),
                ctr: calculateTrend(averageCtr, prevCtr),
                position: calculatePosTrend(averagePosition, prevPosition)
            },
            dateSeries: currentPeriod.map(p => ({
                date: format(p.date, 'MMM dd'),
                clicks: p.clicks,
                impressions: p.impressions
            })),
            queries: queries.map(q => ({
                query: q.query,
                clicks: q.clicks,
                impressions: q.impressions,
                ctr: (q.ctr * 100).toFixed(1),
                position: q.position.toFixed(1)
            })),
            pages: pages.map(p => ({
                page: p.page,
                clicks: p.clicks,
                impressions: p.impressions,
                ctr: (p.ctr * 100).toFixed(1),
                position: p.position.toFixed(1)
            })),
            countries: countries.map(c => ({
                country: c.country,
                clicks: c.clicks,
                impressions: c.impressions,
                ctr: (c.ctr * 100).toFixed(1),
                position: c.position.toFixed(1)
            })),
            devices: devices.map(d => ({
                device: d.device,
                clicks: d.clicks,
                impressions: d.impressions,
                ctr: (d.ctr * 100).toFixed(1),
                position: d.position.toFixed(1)
            }))
        };
    }

    static async inspectUrl(userId: string, websiteId: string, url: string) {
        const client = await getAuthorizedClient(userId);
        const property = await prisma.gscProperty.findUnique({
            where: { websiteId }
        });

        if (!property) throw new Error('Property not linked');

        const res = await client.urlInspection.index.inspect({
            requestBody: {
                inspectionUrl: url,
                siteUrl: property.propertyUrl,
                languageCode: 'en-US'
            }
        });

        return res.data.inspectionResult;
    }

    static async getSitemaps(userId: string, websiteId: string) {
        const client = await getAuthorizedClient(userId);
        const property = await prisma.gscProperty.findUnique({
            where: { websiteId }
        });

        if (!property) return [];

        const res = await client.sitemaps.list({
            siteUrl: property.propertyUrl
        });

        return res.data.sitemap || [];
    }

    static async getIndexingSummary(userId: string, websiteId: string) {
        const property = await prisma.gscProperty.findUnique({
            where: { websiteId }
        });

        if (!property) {
            return {
                isLinked: false,
                property: null,
                sitemaps: [],
                indexingSummary: {
                    totalSubmitted: 0,
                    totalIndexed: 0,
                    status: 'Not Linked',
                },
                performanceSummary: {
                    totalClicks: 0,
                    totalImpressions: 0,
                    avgCtr: 0,
                    avgPosition: 0,
                },
            };
        }

        const sitemaps = await this.getSitemaps(userId, websiteId);
        const performance = await this.getWebsitePerformance(websiteId);

        // Calculate totals from sitemaps
        let totalSubmitted = 0;
        let totalIndexed = 0;

        sitemaps.forEach((sitemap: any) => {
            if (sitemap.contents) {
                sitemap.contents.forEach((content: any) => {
                    totalSubmitted += parseInt(content.submitted || '0');
                    totalIndexed += parseInt(content.indexed || '0');
                });
            }
        });

        return {
            property: {
                url: property.propertyUrl,
                lastSyncedAt: property.lastSyncedAt,
                verified: property.verified,
            },
            sitemaps,
            indexingSummary: {
                totalSubmitted,
                totalIndexed,
                totalNotIndexed: Math.max(0, totalSubmitted - totalIndexed),
                status: sitemaps.some((s: any) => (s as any).errors > 0) ? 'ERR' : 'OK'
            },
            performanceSummary: {
                totalClicks: performance?.totalClicks || 0,
                totalImpressions: performance?.totalImpressions || 0,
                trends: performance?.trends
            }
        };
    }
}

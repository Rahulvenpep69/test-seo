import { prisma } from '../prisma';
import { getAuthorizedClient } from '../gsc/client';
import { checkRankChanges } from '../notifications/rank-alerts';

export async function updateKeywordRankings(websiteId: string) {
    const website = await prisma.website.findUnique({
        where: { id: websiteId },
        include: {
            keywords: true,
            user: {
                include: { gscToken: true }
            }
        }
    });

    if (!website || !website.domain) return;

    // Attempt to get data from GSC if available
    if (website.user.gscToken) {
        try {
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            const startDate = thirtyDaysAgo.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];

            const client = await getAuthorizedClient(website.userId);
            const response = await client.searchanalytics.query({
                siteUrl: website.domain,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: ['query', 'page'],
                    rowLimit: 1000,
                },
            });

            const gscData = response.data.rows || [];

            // Update each tracked keyword with its position from GSC
            for (const keyword of website.keywords) {
                const matchingRow = gscData.find((row: any) =>
                    row.keys && row.keys[0].toLowerCase() === keyword.term.toLowerCase()
                );

                if (matchingRow) {
                    const currentPosition = Math.round(matchingRow.position || 0);

                    // Get the last recorded position for comparison
                    const lastRanking = await prisma.keywordRanking.findFirst({
                        where: { keywordId: keyword.id },
                        orderBy: { recordedAt: 'desc' }
                    });

                    const change = lastRanking ? lastRanking.position - currentPosition : 0;
                    const bestPosition = lastRanking
                        ? Math.min(lastRanking.bestPosition || 100, currentPosition)
                        : currentPosition;

                    await prisma.keywordRanking.create({
                        data: {
                            keywordId: keyword.id,
                            position: currentPosition,
                            bestPosition,
                            change,
                            source: 'GSC'
                        }
                    });

                    if (lastRanking) {
                        await checkRankChanges(keyword.id, websiteId, lastRanking.position, currentPosition);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to sync with GSC:', error);
        }
    }

    // Fallback or complementary: Use a mock rank tracker if no GSC data is found 
    // or if we want to simulate real-time tracking.
    // In a real app, this would call a SERP API like SerpApi, BrightLocal, etc.
    for (const keyword of website.keywords) {
        const existingRankings = await prisma.keywordRanking.findMany({
            where: { keywordId: keyword.id },
            orderBy: { recordedAt: 'desc' },
            take: 1
        });

        if (existingRankings.length === 0 ||
            new Date().getTime() - new Date(existingRankings[0].recordedAt).getTime() > 24 * 60 * 60 * 1000) {

            // Generate a realistic mock position
            const lastPos = existingRankings[0]?.position || 50;
            const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2
            const newPos = Math.max(1, Math.min(100, lastPos + variation));

            const change = lastPos - newPos;
            const bestPos = existingRankings[0]
                ? Math.min(existingRankings[0].bestPosition || 100, newPos)
                : newPos;

            await prisma.keywordRanking.create({
                data: {
                    keywordId: keyword.id,
                    position: newPos,
                    bestPosition: bestPos,
                    change,
                    source: 'SERP_MOCK'
                }
            });

            if (existingRankings[0]) {
                await checkRankChanges(keyword.id, websiteId, existingRankings[0].position, newPos);
            }
        }
    }
}

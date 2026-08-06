import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const websiteId = 'cmn2pp50l0085rxge5zngx70z'; // From logs
    console.log(`Checking data for websiteId: ${websiteId}`);

    const property = await prisma.gscProperty.findUnique({
        where: { websiteId },
        include: {
            performance: {
                take: 5
            }
        }
    });

    if (!property) {
        console.log('No property found for this websiteId.');
        const allProperties = await prisma.gscProperty.findMany();
        console.log('All properties in DB:', allProperties.map(p => ({ id: p.id, websiteId: p.websiteId, url: p.propertyUrl })));
        return;
    }

    console.log('Property found:', {
        id: property.id,
        url: property.propertyUrl,
        lastSyncedAt: property.lastSyncedAt
    });

    const performanceCount = await prisma.gscPerformance.count({
        where: { propertyId: property.id }
    });

    console.log(`Total performance records: ${performanceCount}`);

    const samplePerformance = await prisma.gscPerformance.findMany({
        where: { propertyId: property.id },
        take: 5
    });

    console.log('Sample performance data:', JSON.stringify(samplePerformance, null, 2));

    const types = await prisma.gscPerformance.groupBy({
        by: ['type'],
        where: { propertyId: property.id },
        _count: true
    });
    console.log('Performance records by type:', types);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

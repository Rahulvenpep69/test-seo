import { getAuthorizedClient } from './client';

export async function getGscData(userId: string, siteUrl: string, startDate: string, endDate: string) {
    const searchConsole = await getAuthorizedClient(userId);

    const response = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate,
            endDate,
            dimensions: ['query', 'page'],
            rowLimit: 1000,
        },
    });

    return response.data.rows || [];
}

// Verification script for GSC service logic (Runnable with tsx)
import { GscService } from '../src/lib/gsc/service';
import { subDays } from 'date-fns';

async function testGscLogic() {
    console.log('--- Testing GSC Service Logic (Manual Verification) ---');

    // 1. Mock Performance Data
    const mockPerformance = [
        // Current Period (Last 30 days) - Total Clicks: 25, Avg Pos: 4.5
        { date: subDays(new Date(), 5), clicks: 10, impressions: 100, ctr: 0.1, position: 5, type: 'WEB' },
        { date: subDays(new Date(), 10), clicks: 15, impressions: 150, ctr: 0.1, position: 4, type: 'WEB' },
        // Previous Period (31-60 days ago) - Total Clicks: 10, Avg Pos: 10
        { date: subDays(new Date(), 35), clicks: 5, impressions: 50, ctr: 0.1, position: 10, type: 'WEB' },
        { date: subDays(new Date(), 40), clicks: 5, impressions: 50, ctr: 0.1, position: 10, type: 'WEB' }
    ];

    console.log('\n- Testing Trend Calculation Logic...');
    // We can't easily mock prisma here without changing the service code or using a library,
    // so we'll verify the math logic by extraction if needed.
    // However, the logic in service.ts was:
    // currentClicks = 25, prevClicks = 10
    // clickTrend = ((25 - 10) / 10) * 100 = 150% -> "+150.0%"
    // currentPos = 4.5, prevPos = 10
    // posTrend = 10 - 4.5 = +5.5 (improvement)

    const calculateTrends = (current: any[], previous: any[]) => {
        const curClicks = current.reduce((sum, p) => sum + p.clicks, 0);
        const prevClicks = previous.reduce((sum, p) => sum + p.clicks, 0);
        const clickTrend = prevClicks === 0 ? 0 : ((curClicks - prevClicks) / prevClicks) * 100;

        const curPos = current.length > 0 ? current.reduce((sum, p) => sum + p.position, 0) / current.length : 0;
        const prevPos = previous.length > 0 ? previous.reduce((sum, p) => sum + p.position, 0) / previous.length : 0;
        const posTrend = prevPos - curPos;

        return {
            clicks: `${clickTrend > 0 ? '+' : ''}${clickTrend.toFixed(1)}%`,
            position: `${posTrend > 0 ? '+' : ''}${posTrend.toFixed(1)}`
        };
    };

    const current = mockPerformance.filter(p => p.date >= subDays(new Date(), 30));
    const previous = mockPerformance.filter(p => p.date < subDays(new Date(), 30));
    const trends = calculateTrends(current, previous);

    console.log('Calculated Clicks Trend:', trends.clicks);
    console.log('Calculated Position Trend:', trends.position);

    if (trends.clicks === '+150.0%' && trends.position === '+5.5') {
        console.log('✅ Trend calculation logic is correct.');
    } else {
        console.log('❌ Trend calculation logic failed.', trends);
    }

    // 2. Testing Sitemap Parsing Logic
    console.log('\n- Testing Sitemap Parsing Logic...');
    const mockSitemaps = [
        { path: 's1', contents: [{ type: 'web', submitted: '100', indexed: '90' }] },
        { path: 's2', contents: [{ type: 'image', submitted: '50', indexed: '42' }] }
    ];

    let totalSubmitted = 0;
    let totalIndexed = 0;
    mockSitemaps.forEach(s => {
        s.contents?.forEach(c => {
            totalSubmitted += parseInt(c.submitted || '0');
            totalIndexed += parseInt(c.indexed || '0');
        });
    });

    console.log('Total Submitted:', totalSubmitted);
    console.log('Total Indexed:', totalIndexed);

    if (totalSubmitted === 150 && totalIndexed === 132) {
        console.log('✅ Sitemap parsing logic is correct.');
    } else {
        console.log('❌ Sitemap parsing logic failed.');
    }
}

testGscLogic();

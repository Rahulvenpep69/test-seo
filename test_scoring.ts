import { calculateOverallScore } from './src/lib/seo/scoring';
import { EXHAUSTIVE_CHECKS } from './src/lib/seo/checks';

const mockResults: Record<string, string> = {};

// Fill all with 'pass'
EXHAUSTIVE_CHECKS.forEach(c => {
    mockResults[c.id] = 'pass';
});

// Set 3 to non-pass
mockResults['google_index'] = 'warning';
mockResults['broken_links'] = 'critical';
mockResults['error_404'] = 'warning';

const { score, passCount, totalChecks } = calculateOverallScore(mockResults);
console.log(`Score: ${score}, Pass Count: ${passCount}, Total Checks: ${totalChecks}`);

const expectedPassCount = totalChecks - 3;
const expectedScore = Math.round((expectedPassCount / totalChecks) * 100);

if (score === expectedScore) {
    console.log(`Test Passed: Scoring logic is consistent. Expected ${expectedScore}, got ${score}`);
} else {
    console.log(`Test Failed: Expected ${expectedScore}, got ${score}`);
    process.exit(1);
}

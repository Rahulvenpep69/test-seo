import { getAuthUrl } from './src/lib/gsc/client';
console.log('Testing getAuthUrl logic:');
try {
    const url = getAuthUrl();
    console.log('SUCCESS! URL:', url);
} catch (e) {
    console.error('ERROR in getAuthUrl:', e);
}

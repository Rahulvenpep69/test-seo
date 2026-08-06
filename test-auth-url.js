const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/callback`;

console.log('ID:', GOOGLE_CLIENT_ID);
console.log('SECRET:', GOOGLE_CLIENT_SECRET ? '*SET*' : 'NOT SET');
console.log('URI:', REDIRECT_URI);

const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/webmasters'],
});
console.log('URL:', url);

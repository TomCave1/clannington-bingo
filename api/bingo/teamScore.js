import { google } from 'googleapis';

// Google Sheets API setup
let auth;

try {
    // Check if we have individual service account environment variables
    if (process.env.GOOGLE_SERVICE_ACCOUNT_TYPE && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
        const credentials = {
            type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
            project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
            private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
            auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
            token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
            universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || 'googleapis.com'
        };
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    } else {
        const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
        auth = new google.auth.GoogleAuth({
            keyFile,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    }
} catch (error) {
    console.error('Error setting up Google Auth:', error);
    throw error;
}

const sheets = google.sheets({ version: 'v4', auth });

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Add cache-busting headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const sheetId = process.env.GOOGLE_SHEET_ID_TEAM_SCORE || process.env.GOOGLE_SHEET_ID_PAGE1 || process.env.GOOGLE_SHEET_ID;
        const range = process.env.TEAM_SCORE_RANGE || 'Home!K7:L12';

        console.log('=== TEAM SCORE API DEBUG ===');
        console.log('Sheet ID:', sheetId);
        console.log('Range:', range);
        console.log('TEAM_SCORE_RANGE env var:', process.env.TEAM_SCORE_RANGE);
        console.log('GOOGLE_SHEET_ID_TEAM_SCORE:', process.env.GOOGLE_SHEET_ID_TEAM_SCORE);
        console.log('GOOGLE_SHEET_ID_PAGE1:', process.env.GOOGLE_SHEET_ID_PAGE1);
        console.log('GOOGLE_SHEET_ID:', process.env.GOOGLE_SHEET_ID);
        console.log('============================');

        if (!sheetId) {
            res.status(500).json({ error: 'Google Sheet ID not configured' });
            return;
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            res.json({ error: 'No data found in the specified range' });
            return;
        }

        console.log('Team Score API - Raw data from Google Sheets:');
        console.log('Total rows received:', rows.length);
        console.log('Headers (row 0):', rows[0]);
        console.log('Data rows (1 onwards):', rows.slice(1, 4));
        console.log('Number of data rows (after slice):', rows.slice(1).length);

        const headers = rows[0];

        // Check if we have the right number of columns for team scores
        console.log('Expected columns for team scores: 2');
        console.log('Actual columns received:', headers.length);
        console.log('Column headers:', headers);

        // Always convert to team score format - just take first two columns
        const data = rows.slice(1).map(row => {
            const teamName = row[0] || '';
            const teamScore = row[1] || '0';
            return {
                team: teamName,
                score: teamScore
            };
        });

        console.log('Processed team score data:', data);

        res.json({
            data,
            headers,
            title: 'Team Score',
            pageId: 'teamScore'
        });
    } catch (error) {
        console.error('Error in /api/bingo/teamScore:', error);
        res.status(500).json({
            error: 'Failed to fetch team score data',
            details: error.message
        });
    }
} 
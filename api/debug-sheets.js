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

    try {
        const sheetId = process.env.GOOGLE_SHEET_ID;
        const teamName = process.env.BONESSA_TEAM;
        const tilesRange = process.env.TILES;

        if (!sheetId) {
            res.status(500).json({ error: 'Google Sheet ID not configured' });
            return;
        }

        if (!teamName || !tilesRange) {
            res.status(500).json({ error: 'Team name or tiles range not configured' });
            return;
        }

        const range = `'${teamName}'!${tilesRange}`;

        // First, let's get the sheet metadata to see what sheets exist
        const metadataResponse = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });

        // Then try to get the actual data
        const dataResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        });

        res.json({
            message: 'Google Sheets Debug Info',
            timestamp: new Date().toISOString(),
            sheetId: sheetId,
            teamName: teamName,
            tilesRange: tilesRange,
            fullRange: range,
            sheetMetadata: {
                title: metadataResponse.data.properties?.title,
                sheets: metadataResponse.data.sheets?.map(sheet => ({
                    title: sheet.properties?.title,
                    sheetId: sheet.properties?.sheetId
                }))
            },
            dataResponse: {
                range: dataResponse.data.range,
                majorDimension: dataResponse.data.majorDimension,
                values: dataResponse.data.values,
                valueCount: dataResponse.data.values?.length || 0
            }
        });
    } catch (error) {
        console.error('Error in debug-sheets:', error);
        res.status(500).json({
            error: 'Failed to fetch sheet data',
            details: error.message,
            code: error.code,
            stack: error.stack
        });
    }
} 
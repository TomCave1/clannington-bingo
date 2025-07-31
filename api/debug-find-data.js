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

        if (!teamName) {
            res.status(500).json({ error: 'Team name not configured' });
            return;
        }

        if (!tilesRange) {
            res.status(500).json({ error: 'TILES range not configured' });
            return;
        }

        // Test variations of the TILES range to find bingo data
        const testRanges = [
            `'${teamName}'!${tilesRange}`, // Original range E35:G64
            `'${teamName}'!E1:G100`, // Same columns, starting from row 1
            `'${teamName}'!E1:G200`, // Same columns, more rows
            `'${teamName}'!E30:G70`, // Similar range, slightly different rows
            `'${teamName}'!E25:G75`, // Similar range, different rows
            `'${teamName}'!E40:G80`, // Similar range, different rows
            `'${teamName}'!D35:F64`, // Adjacent columns
            `'${teamName}'!F35:H64`  // Adjacent columns
        ];

        const results = {};

        for (const range of testRanges) {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: range,
                });

                const rows = response.data.values;
                if (rows && rows.length > 0) {
                    // Look for rows that might contain bingo data
                    const bingoRows = rows.filter((row, index) => {
                        if (index === 0) return false; // Skip header row
                        return row && row.length >= 3 &&
                            row[0] && row[0].toString().trim() !== '' &&
                            !isNaN(row[2]); // Third column should be a number
                    });

                    results[range] = {
                        totalRows: rows.length,
                        bingoRowsFound: bingoRows.length,
                        sampleBingoData: bingoRows.slice(0, 5),
                        hasBingoData: bingoRows.length > 0,
                        firstFewRows: rows.slice(0, 3) // Show first few rows for context
                    };
                } else {
                    results[range] = { totalRows: 0, bingoRowsFound: 0, hasBingoData: false };
                }
            } catch (error) {
                results[range] = { error: error.message };
            }
        }

        res.json({
            message: 'Bingo Data Search Results',
            timestamp: new Date().toISOString(),
            sheetId: sheetId,
            teamName: teamName,
            tilesRange: tilesRange,
            results: results
        });
    } catch (error) {
        console.error('Error in debug-find-data:', error);
        res.status(500).json({
            error: 'Failed to search for bingo data',
            details: error.message
        });
    }
} 
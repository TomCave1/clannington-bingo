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
        const pageId = 'page6';
        const sheetId = process.env.GOOGLE_SHEET_ID;
        const teamName = process.env.KRIS_TEAM;
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

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            res.json({ error: 'No data found in the specified range' });
            return;
        }

        // Process the data similar to the backend server
        let rawData = rows.slice(1).map(row => ({
            id: row[0] || '',
            value: Number(row[2]) || 0
        }));

        // Define merge groups
        const mergeGroups = [
            { ids: ['Barrows', 'Moons'], newId: 'Barrows + Moons' },
            { ids: ['Mix Up Head', 'Mix Up Body', 'Mix Up Bottom'], newId: 'Mix Up' },
            { ids: ['Jar', 'Pet'], newId: '2 Pets 1 Jar' }
        ];

        const limits = {
            'Titans': 2,
            'Barrows + Moons': 8,
            'Huey': 2,
            'SRA': 4,
            'Horn': 1,
            'Muspah': 5,
            'Nightmare': 1,
            'Visage': 1,
            '2 Pets 1 Jar': 3,
            'Nox Hally': 3,
            'Godsword': 4,
            'LotR': 4,
            'Mega Rare': 1,
            'Revs': 3,
            'F2P': 2,
            'Voidwaker': 3,
            'TD\'s': 2,
            'Parsec': 2,
            'Zulrah': 4,
            'Nex': 1,
            'Mix Up': 3,
            'Enrage': 1,
            'Dust': 1,
            'Boppers': 5,
            'CG': 7,
        };

        const points = {
            'Titans': 3,
            'Barrows + Moons': 4,
            'Huey': 3,
            'SRA': 6,
            'Horn': 5,
            'Muspah': 4,
            'Nightmare': 5,
            'Visage': 4,
            '2 Pets 1 Jar': 5,
            'Nox Hally': 3,
            'Godsword': 4,
            'LotR': 4,
            'Mega Rare': 6,
            'Revs': 4,
            'F2P': 3,
            'Voidwaker': 5,
            'TD\'s': 3,
            'Parsec': 4,
            'Zulrah': 4,
            'Nex': 5,
            'Mix Up': 5,
            'Enrage': 5,
            'Dust': 4,
            'Boppers': 2,
            'CG': 5,
        };

        let mergedData = [];
        let skipIds = new Set();

        for (let i = 0; i < rawData.length; i++) {
            const item = rawData[i];
            if (skipIds.has(item.id)) continue;

            // Check if this item should be merged
            const mergeGroup = mergeGroups.find(group => group.ids.includes(item.id));
            if (mergeGroup) {
                // Find all items in this merge group
                const groupItems = rawData.filter(d => mergeGroup.ids.includes(d.id));
                const totalValue = groupItems.reduce((sum, d) => sum + d.value, 0);

                mergedData.push({
                    id: mergeGroup.newId,
                    value: totalValue,
                    limit: limits[mergeGroup.newId] || 1,
                    points: points[mergeGroup.newId] || null
                });

                // Mark all items in this group as processed
                groupItems.forEach(d => skipIds.add(d.id));
            } else {
                // Regular item
                mergedData.push({
                    id: item.id,
                    value: item.value,
                    limit: limits[item.id] || 1,
                    points: points[item.id] || null
                });
            }
        }

        res.json({
            data: mergedData,
            title: `Kris' Kanker Kunts`,
            pageId
        });
    } catch (error) {
        console.error('Error in /api/bingo/page6:', error);
        res.status(500).json({
            error: 'Failed to fetch bingo data',
            details: error.message,
            code: error.code
        });
    }
} 
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

// Google Sheets API setup
let auth: any;

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

// Configuration for multiple bingo sheets
const BINGO_SHEETS = {
    'page1': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: process.env.SHEET_RANGE_PAGE1 || 'Sheet1!A1:Z100',
        title: 'Current Standings'
    },
    'page2': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.BONESSA_TEAM?.replace(/' /g, "''")}'!${process.env.TILES}`,
        title: `Bonessa's Billionaire Club`
    },
    'page3': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.SUBO_TEAM?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `Subo's Spaffers`
    },
    'page4': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.GREENBOOTS_TEAM?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `Greenboots Goon Squad`
    },
    'page5': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.JACK_TEAM?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `The eJackulators`
    },
    'page6': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.KRIS_TEAM?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `Kris' Kanker Kunts`
    },
    'teamScore': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: process.env.TEAM_SCORE_RANGE || 'Sheet1!A1:Z100',
        title: 'Team Score'
    }
};

// Function to fetch bingo data from a specific Google Sheet
async function fetchBingoData(pageId: string) {
    try {
        const config = BINGO_SHEETS[pageId as keyof typeof BINGO_SHEETS];
        if (!config || !config.sheetId) {
            return { error: `No configuration found for page: ${pageId}` };
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.sheetId,
            range: config.range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return { error: 'No data found in the spreadsheet' };
        }

        // Assuming first row contains headers
        let headers = rows[0];
        let data;

        if (pageId !== 'page1') {
            let rawData = rows.slice(1).map(row => ({
                id: row[0] || '',
                value: Number(row[2]) || 0
            }));

            // Define merge groups
            const mergeGroups = [
                { ids: ['Barrows', 'Moons'], newId: 'Barrows and Moon' },
                { ids: ['Mix Up Head', 'Mix Up Body', 'Mix Up Bottom'], newId: 'Mix Up' },
                { ids: ['Jar', 'Pet'], newId: '2 Pets 1 Jar' }
            ];

            const limits: { [id: string]: number } = {
                'Titans': 2,
                'Barrows and Moon': 8,
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

            const points: { [id: string]: number } = {
                'Titans': 3,
                'Barrows and Moon': 4,
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
            }

            let mergedData: { id: string; value: string; limit: number; points: number | null }[] = [];
            let skipIds = new Set();

            for (let i = 0; i < rawData.length; i++) {
                const item = rawData[i];
                if (skipIds.has(item.id)) continue;

                // Check if this item starts a merge group
                const group = mergeGroups.find(g => g.ids.includes(item.id) && g.ids.every(id => rawData.some(r => r.id === id)));
                if (group && group.ids[0] === item.id) {
                    // Merge values
                    const sum = group.ids.reduce((acc, id) => {
                        skipIds.add(id);
                        const found = rawData.find(r => r.id === id);
                        return acc + (found ? found.value : 0);
                    }, 0);
                    mergedData.push({
                        id: group.newId,
                        value: sum.toString(),
                        limit: limits[group.newId] ?? null,
                        points: points[group.newId] ?? 0
                    });
                } else if (!skipIds.has(item.id)) {
                    const outputId = item.id === 'Twinflame Staff' ? 'Titans' : item.id;
                    mergedData.push({
                        id: outputId,
                        value: item.value.toString(),
                        limit: limits[outputId] ?? null,
                        points: points[outputId] ?? 0
                    });
                }
            }

            data = mergedData;
            headers = ['id', 'value'];
        } else {
            data = rows.slice(1).map(row => {
                const item: any = {};
                headers.forEach((header: string, index: number) => {
                    item[header] = row[index] || '';
                });
                return item;
            });
        }

        return {
            data,
            headers,
            title: config.title,
            pageId
        };
    } catch (error) {
        console.error(`Error fetching bingo data for ${pageId}:`, error);
        return {
            error: 'Failed to fetch bingo data',
            details: (error as any).message,
            code: (error as any).code
        };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const { pageId } = req.query;
        if (!pageId || typeof pageId !== 'string') {
            res.status(400).json({ error: 'Page ID is required' });
            return;
        }

        const bingoData = await fetchBingoData(pageId);
        res.json(bingoData);
    } catch (error) {
        console.error(`Error in /api/bingo/${req.query.pageId} endpoint:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
} 
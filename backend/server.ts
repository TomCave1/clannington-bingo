import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// 1. Middleware first
app.use(cors());
app.use(express.json());

//2. API routes
app.get('/api/pages', (req, res) => {
    const pages = Object.keys(BINGO_SHEETS).map(pageId => ({
        id: pageId,
        title: BINGO_SHEETS[pageId].title,
        hasConfig: !!BINGO_SHEETS[pageId].sheetId
    }));
    res.json({ pages });
});

app.get('/api/bingo/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;
        const bingoData = await fetchBingoData(pageId);
        res.json(bingoData);
    } catch (error) {
        console.error(`Error in /api/bingo/${req.params.pageId} endpoint:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Legacy endpoint for backward compatibility
app.get('/api/bingo', async (req, res) => {
    try {
        const individualScoreData = await fetchBingoData('page1');
        res.json(individualScoreData);
    } catch (error) {
        console.error('Error in /api/bingo endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug endpoint to list all sheets in the document
app.get('/api/debug/sheets', async (req, res) => {
    try {
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        if (!spreadsheetId) {
            res.status(400).json({ error: 'GOOGLE_SHEET_ID not configured' });
            return;
        }

        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        const sheetsList = response.data.sheets?.map(sheet => ({
            sheetId: sheet.properties?.sheetId,
            title: sheet.properties?.title,
            index: sheet.properties?.index
        })) || [];

        res.json({
            spreadsheetId,
            spreadsheetTitle: response.data.properties?.title,
            sheets: sheetsList
        });
    } catch (error) {
        console.error('Error fetching sheets info:', error);
        res.status(500).json({ error: 'Failed to fetch sheets info' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

//Image endpoint to serve images by ID
app.get('/api/image/:id', (req, res) => {
    const { id } = req.params;
    const imagePath = path.resolve(__dirname, 'assets', `${id}.png`); // Use path.resolve for absolute path

    res.sendFile(imagePath, (err) => {
        if (err) {
            console.error(`Image not found for ID: ${id}`);
            res.status(404).json({ error: 'Image not found' });
        }
    });
});

//3. Static files
app.use(express.static(path.join(__dirname, '../dist')));

// Replace with specific routes for your SPA:
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.get('/page1', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.get('/page2', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.get('/page3', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Add a 404 handler for unmatched routes
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.status(404).sendFile(path.join(__dirname, '../dist/index.html'));
    }
});

// 5. Server listen
app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
    console.log('Available pages:', Object.keys(BINGO_SHEETS).join(', '));
    console.log('Make sure to set up your Google Sheets credentials and environment variables:');
    console.log('- GOOGLE_APPLICATION_CREDENTIALS: Path to your service account key file');
});

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
        const config = BINGO_SHEETS[pageId];
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

            const image: { [id: string]: number } = {
                'Titans': 3,
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
        return { error: 'Failed to fetch bingo data' };
    }
} 
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
let auth: any;

try {
    // Check if we have individual service account environment variables
    if (process.env.GOOGLE_SERVICE_ACCOUNT_TYPE && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
        // Use individual environment variables for credentials (cleaner approach)
        console.log('Using individual Google service account environment variables');
        console.log('Private key length:', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.length);
        console.log('Private key starts with:', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.substring(0, 50));
        console.log('Private key ends with:', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.substring(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length - 50));

        // Test the credentials object
        const testCredentials = {
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

        console.log('Test credentials object:', {
            type: testCredentials.type,
            project_id: testCredentials.project_id,
            private_key_id: testCredentials.private_key_id,
            private_key_length: testCredentials.private_key?.length,
            client_email: testCredentials.client_email,
            client_id: testCredentials.client_id
        });

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
        // Fallback to single environment variable (legacy approach)
        console.log('Using GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    } else {
        // Fallback to keyFile (for local development)
        const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
        console.log(`Using keyFile: ${keyFile}`);
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

// Debug endpoint to check authentication setup
app.get('/api/debug/auth', (req, res) => {
    try {
        const authInfo = {
            // Individual service account variables
            hasServiceAccountType: !!process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
            hasServiceAccountPrivateKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
            hasServiceAccountProjectId: !!process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
            hasServiceAccountClientEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,

            // Legacy single variable
            hasServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,

            // File-based credentials
            hasApplicationCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',

            // Sheet configuration
            hasGoogleSheetId: !!process.env.GOOGLE_SHEET_ID,
            googleSheetId: process.env.GOOGLE_SHEET_ID,
            hasPage1SheetId: !!process.env.GOOGLE_SHEET_ID_PAGE1,
            hasPage2SheetId: !!process.env.GOOGLE_SHEET_ID_PAGE2,
            hasPage3SheetId: !!process.env.GOOGLE_SHEET_ID_PAGE3,
        };
        res.json(authInfo);
    } catch (error) {
        console.error('Error in auth debug endpoint:', error);
        res.status(500).json({ error: 'Failed to get auth info' });
    }
});

// Test endpoint to verify authentication only
app.get('/api/debug/test-auth', async (req, res) => {
    try {
        console.log('Testing authentication only...');

        // Just try to get an access token
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        res.json({
            success: true,
            hasAccessToken: !!accessToken.token,
            tokenType: accessToken.token ? 'Bearer' : null
        });
    } catch (error) {
        console.error('Error testing authentication:', error);
        res.status(500).json({
            error: 'Failed to authenticate',
            details: error.message,
            code: error.code
        });
    }
});

// Test endpoint to verify Google Sheets access
app.get('/api/debug/test-sheets', async (req, res) => {
    try {
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        if (!spreadsheetId) {
            res.status(400).json({ error: 'GOOGLE_SHEET_ID not configured' });
            return;
        }

        console.log('Testing access to spreadsheet:', spreadsheetId);

        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        res.json({
            success: true,
            spreadsheetId,
            title: response.data.properties?.title,
            sheets: response.data.sheets?.map(sheet => ({
                title: sheet.properties?.title,
                sheetId: sheet.properties?.sheetId
            }))
        });
    } catch (error) {
        console.error('Error testing sheets access:', error);
        res.status(500).json({
            error: 'Failed to access Google Sheets',
            details: error.message,
            code: error.code
        });
    }
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
        title: 'Dashboard'
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
        console.log(`Fetching data for ${pageId}:`, { sheetId: config?.sheetId, range: config?.range });

        if (!config || !config.sheetId) {
            console.error(`No configuration found for page: ${pageId}`);
            return { error: `No configuration found for page: ${pageId}` };
        }

        console.log(`Making API call to Google Sheets: ${config.sheetId}, range: ${config.range}`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.sheetId,
            range: config.range,
        });

        console.log(`Received response for ${pageId}:`, { rowCount: response.data.values?.length || 0 });
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.error(`No data found in spreadsheet for ${pageId}`);
            return { error: 'No data found in the spreadsheet' };
        }

        // Assuming first row contains headers
        let headers = rows[0];
        let data;

        // Special handling for teamScore
        if (pageId === 'teamScore') {
            console.log('Processing teamScore data with special logic');

            // Define team mappings
            const teamMappings = [
                { name: "Bonessa's Billionaire Club", sheet: "BBC", cell: "AH2" },
                { name: "Kris' Kanker Kunts", sheet: "Kris' KK", cell: "AH2" },
                { name: "Subo's Spaffers", sheet: "SS", cell: "AH2" },
                { name: "Greenboots Goon Squad", sheet: "GGS", cell: "AH2" },
                { name: "The eJackulators", sheet: "EJs", cell: "AH2" }
            ];

            // Fetch scores from each team's sheet
            const teamScores: { team: string; score: string }[] = [];

            for (const team of teamMappings) {
                try {
                    console.log(`Fetching score for ${team.name} from ${team.sheet}!${team.cell}`);
                    const teamResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: config.sheetId,
                        range: `${team.sheet}!${team.cell}`,
                    });

                    const score = teamResponse.data.values?.[0]?.[0] || '0';
                    console.log(`Score for ${team.name}: ${score}`);

                    teamScores.push({
                        team: team.name,
                        score: score
                    });
                } catch (error) {
                    console.error(`Error fetching score for ${team.name}:`, error);
                    teamScores.push({
                        team: team.name,
                        score: '0'
                    });
                }
            }

            return {
                data: teamScores,
                headers: ['team', 'score'],
                title: 'Team Score',
                pageId: 'teamScore'
            };
        }

        if (pageId !== 'page1') {
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

            const limits: { [id: string]: number } = {
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
                'Any Godsword': 4,
                'LotR': 4,
                'Mega Rare': 1,
                'Revs': 3,
                'F2P': 2,
                'Voidwaker': 3,
                "TDs": 2,
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
                'Barrows + Moons': 4,
                'Huey': 3,
                'SRA': 6,
                'Horn': 5,
                'Muspah': 4,
                'Nightmare': 5,
                'Visage': 4,
                '2 Pets 1 Jar': 5,
                'Nox Hally': 3,
                'Any Godsword': 4,
                'LotR': 4,
                'Mega Rare': 6,
                'Revs': 4,
                'F2P': 3,
                'Voidwaker': 5,
                "TDs": 3,
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
        console.error(`Error details:`, {
            message: error.message,
            code: error.code,
            status: error.status,
            config: error.config
        });
        return {
            error: 'Failed to fetch bingo data',
            details: error.message,
            code: error.code
        };
    }
} 
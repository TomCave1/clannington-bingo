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
    // Prefer GOOGLE_SERVICE_ACCOUNT_KEY (single JSON env var) as it's more reliable
    // This avoids encoding issues with individual environment variables
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        console.log('Using GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        // Ensure private key has proper newlines
        if (credentials.private_key && typeof credentials.private_key === 'string') {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_TYPE && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
        // Use individual environment variables for credentials
        console.log('Using individual Google service account environment variables');

        // Process private key: handle various formats and encoding issues
        let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

        // Remove surrounding quotes if present
        privateKey = privateKey?.replace(/^["']|["']$/g, '');

        // Replace escaped newlines with actual newlines
        privateKey = privateKey?.replace(/\\n/g, '\n');

        // Ensure the key has proper BEGIN/END markers if missing
        if (privateKey && !privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN RSA PRIVATE KEY')) {
            console.warn('Private key may be missing BEGIN/END markers');
        }

        const credentials = {
            type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
            project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
            private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
            private_key: privateKey,
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
            auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
            token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
            universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || 'googleapis.com'
        };

        try {
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
        } catch (keyError: any) {
            if (keyError.code === 'ERR_OSSL_UNSUPPORTED' || keyError.message?.includes('DECODER')) {
                console.error('Private key format error. Try using GOOGLE_SERVICE_ACCOUNT_KEY (JSON format) instead of individual env vars.');
                throw new Error('Private key format not supported. Please use GOOGLE_SERVICE_ACCOUNT_KEY with the full JSON credentials, or use GOOGLE_APPLICATION_CREDENTIALS with a credentials file.');
            }
            throw keyError;
        }
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
        navLabel: BINGO_SHEETS[pageId].navLabel || BINGO_SHEETS[pageId].title,
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
        title: 'Dashboard',
        navLabel: 'Dashboard'
    },
    'page2': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.TEAM1?.replace(/' /g, "''")}'!${process.env.TILES}`,
        title: `Imagine Bronze Dragons`,
        navLabel: 'IBD'
    },
    'page3': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.TEAM2?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `Syndrome of a Down`,
        navLabel: 'SoaD'
    },
    'page4': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.TEAM3?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `My Inappropriate Romance`,
        navLabel: 'MIR'
    },
    'page5': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.TEAM4?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `Urethra Franklin`,
        navLabel: 'UF'
    },
    'page6': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.TEAM5?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `McFlySIS`,
        navLabel: 'McFS'
    },
    'page7': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.TEAM6?.replace(/'/g, "''")}'!${process.env.TILES}`,
        title: `Nine Inch Noncers`,
        navLabel: 'NIN'
    },
    'teamScore': {
        sheetId: process.env.GOOGLE_SHEET_ID,
        range: process.env.TEAM_SCORE_RANGE || 'Sheet1!A1:Z100',
        title: 'Team Score',
        navLabel: 'Team Score'
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
            console.log('=== TEAM SCORE DEBUG ===');
            console.log('Environment:', process.env.NODE_ENV);
            console.log('Sheet ID:', config.sheetId);
            console.log('Range:', config.range);
            console.log('Processing teamScore data with special logic');

            // Define team mappings
            const teamMappings = [
                { name: "Imagine Bronze Dragons", sheet: "IBD", scoreCell: "AH2", tilesCell: "AH1" },
                { name: "Syndrome of a Down", sheet: "SoaD", scoreCell: "AH2", tilesCell: "AH1" },
                { name: "My Inappropriate Romance", sheet: "MIR", scoreCell: "AH2", tilesCell: "AH1" },
                { name: "Urethra Franklin", sheet: "UF", scoreCell: "AH2", tilesCell: "AH1" },
                { name: "McFlySIS", sheet: "McFS", scoreCell: "AH2", tilesCell: "AH1" },
                { name: "Nine Inch Noncers", sheet: "NIN", scoreCell: "AH2", tilesCell: "AH1" }
            ];

            // Fetch scores and completed tiles from each team's sheet
            const teamScores: { team: string; score: string; tilesCompleted: string }[] = [];

            for (const team of teamMappings) {
                try {
                    console.log(`Fetching data for ${team.name} from ${team.sheet}`);
                    console.log(`Using sheet ID: ${config.sheetId}`);

                    // Fetch score from AH2
                    const scoreResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: config.sheetId,
                        range: `${team.sheet}!${team.scoreCell}`,
                    });

                    // Fetch completed tiles from AH1
                    const tilesResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: config.sheetId,
                        range: `${team.sheet}!${team.tilesCell}`,
                    });

                    const score = scoreResponse.data.values?.[0]?.[0] || '0';
                    const tiles = tilesResponse.data.values?.[0]?.[0] || '0';

                    console.log(`Raw score response for ${team.name}:`, scoreResponse.data.values);
                    console.log(`Raw tiles response for ${team.name}:`, tilesResponse.data.values);
                    console.log(`Score for ${team.name}: ${score}, Tiles: ${tiles}`);

                    teamScores.push({
                        team: team.name,
                        score: score,
                        tilesCompleted: tiles
                    });
                } catch (error) {
                    console.error(`Error fetching data for ${team.name}:`, error);
                    teamScores.push({
                        team: team.name,
                        score: '0',
                        tilesCompleted: '0'
                    });
                }
            }

            return {
                data: teamScores,
                headers: ['team', 'score', 'tilesCompleted'],
                title: 'Team Score',
                pageId: 'teamScore'
            };
        }

        if (pageId !== 'page1') {
            // Helper function to parse numeric value from formula results or text
            const parseValue = (cellValue: any): number => {
                if (cellValue === null || cellValue === undefined || cellValue === '') {
                    return 0;
                }
                // Convert to string, trim whitespace, and parse
                const strValue = String(cellValue).trim();
                if (strValue === '' || strValue === '-') {
                    return 0;
                }
                // Try to parse as number (handles formulas that return numbers as strings)
                const numValue = Number(strValue);
                // Return 0 if NaN (not a valid number), otherwise return the parsed number
                return isNaN(numValue) ? 0 : numValue;
            };

            let rawData = rows.slice(1).map(row => ({
                id: (row[0] || '').toString().trim(),
                value: parseValue(row[1])
            }));

            // Cap Barrows and Moons values to 4 before merging
            rawData = rawData.map(item => {
                if (item.id.includes('Barrows') || item.id.includes('Moons')) {
                    return {
                        ...item,
                        value: Math.min(item.value, 4)
                    };
                }
                return item;
            });

            // Define merge groups
            const mergeGroups = [
                {
                    ids: ['Barrows Chest', 'Barrows Helm', 'Barrows Legs', 'Barrows Weapon',
                        'Moons Chest', 'Moons Helm', 'Moons Legs', 'Moons Weapon'],
                    newId: 'Barrows and Moons'
                },
                { ids: ['Gigachad Boots', 'Gigachad Chest', 'Gigachad Helm', 'Gigachad Legs'], newId: 'Gigachad' },
                { ids: ['Mix Up Head', 'Mix Up Legs', 'Mix Up Top'], newId: 'Mix Up' },
                { ids: ['Jar', 'Pet'], newId: '2 Pets 1 Jar' }
            ];

            const limits: { [id: string]: number } = {
                'Nightmare': 1,
                'Barrows and Moons': 8,
                'Gigachad': 4,
                'LotR': 4,
                'Doom': 1,
                'Zulrah': 3,
                'Mix Up': 3,
                'Huey': 2,
                'SRA': 4,
                'Parsec': 2,
                'Godsword': 4,
                'CG': 7,
                'Mega Rare': 1,
                'Visage': 1,
                'TDs': 3,
                'F2P': 2,
                'Revs': 3,
                'Muspah': 5,
                'Nex': 1,
                'Dust': 1,
                'Yama': 1,
                'Titans': 2,
                'Nox Hally': 3,
                '2 Pets 1 Jar': 3,
                'Voidwaker': 3,
            };

            const points: { [id: string]: number } = {
                'Nightmare': 5,
                'Barrows and Moons': 3,
                'Gigachad': 3,
                'LotR': 3,
                'Doom': 5,
                'Zulrah': 3,
                'Mix Up': 5,
                'Huey': 3,
                'SRA': 6,
                'Parsec': 3,
                'Godsword': 4,
                'CG': 4,
                'Mega Rare': 6,
                'Visage': 3,
                'TDs': 3,
                'F2P': 2,
                'Revs': 6,
                'Muspah': 4,
                'Nex': 5,
                'Dust': 3,
                'Yama': 5,
                'Titans': 3,
                'Nox Hally': 3,
                '2 Pets 1 Jar': 3,
                'Voidwaker': 5,
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

            // Define custom sort order (items not in this list will appear at the end)
            const sortOrder = [
                'Nightmare',
                'Barrows and Moons',
                'Gigachad',
                'LotR',
                'Doom',
                'Zulrah',
                'Mix Up',
                'Huey',
                'SRA',
                'Parsec',
                'Godsword',
                'CG',
                'Mega Rare',
                'Visage',
                'TDs',
                'F2P',
                'Revs',
                'Muspah',
                'Nex',
                'Dust',
                'Yama',
                'Titans',
                'Nox Hally',
                '2 Pets 1 Jar',
                'Voidwaker',
                // Add any other items here in the order you want them to appear
            ];

            // Sort merged data according to custom order
            mergedData.sort((a, b) => {
                const indexA = sortOrder.indexOf(a.id);
                const indexB = sortOrder.indexOf(b.id);

                // If both items are in the sort order, sort by their position
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                // If only A is in the sort order, A comes first
                if (indexA !== -1) return -1;
                // If only B is in the sort order, B comes first
                if (indexB !== -1) return 1;
                // If neither is in the sort order, maintain original order (or sort alphabetically)
                return a.id.localeCompare(b.id);
            });

            data = mergedData;
            headers = ['id', 'value'];
        } else {
            // Helper function to parse numeric value from formula results or text
            const parseValue = (cellValue: any): any => {
                if (cellValue === null || cellValue === undefined || cellValue === '') {
                    return '';
                }
                // Convert to string and trim whitespace
                const strValue = String(cellValue).trim();
                if (strValue === '' || strValue === '-') {
                    return '';
                }
                // Try to parse as number (handles formulas that return numbers as strings)
                const numValue = Number(strValue);
                // If it's a valid number, return the number (not string)
                // Otherwise return the original string value
                return !isNaN(numValue) && strValue !== '' ? numValue : strValue;
            };

            data = rows.slice(1).map(row => {
                const item: any = {};
                headers.forEach((header: string, index: number) => {
                    const cellValue = row[index];
                    // Parse values - keep text as text, but parse numeric formulas
                    item[header] = parseValue(cellValue);
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
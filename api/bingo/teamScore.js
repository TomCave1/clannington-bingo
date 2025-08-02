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

        console.log('=== TEAM SCORE API DEBUG ===');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Sheet ID:', sheetId);
        console.log('Processing teamScore data with special logic');

        if (!sheetId) {
            res.status(500).json({ error: 'Google Sheet ID not configured' });
            return;
        }

        // Define team mappings
        const teamMappings = [
            { name: "Bonessa's Billionaire Club", sheet: "BBC", cell: "AH2" },
            { name: "Kris' Kanker Kunts", sheet: "Kris' KK", cell: "AH2" },
            { name: "Subo's Spaffers", sheet: "SS", cell: "AH2" },
            { name: "Greenboots Goon Squad", sheet: "GGS", cell: "AH2" },
            { name: "The eJackulators", sheet: "EJs", cell: "AH2" }
        ];

        // Fetch scores from each team's sheet
        const teamScores = [];

        for (const team of teamMappings) {
            try {
                console.log(`Fetching score for ${team.name} from ${team.sheet}!${team.cell}`);
                console.log(`Using sheet ID: ${sheetId}`);
                const teamResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: `${team.sheet}!${team.cell}`,
                });

                const score = teamResponse.data.values?.[0]?.[0] || '0';
                console.log(`Raw response for ${team.name}:`, teamResponse.data.values);
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

        console.log('Final team scores:', teamScores);

        res.json({
            data: teamScores,
            headers: ['team', 'score'],
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
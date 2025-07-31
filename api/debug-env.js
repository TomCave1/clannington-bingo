export default function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only show environment variable names, not values (for security)
    const envVars = {
        GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
        GOOGLE_SERVICE_ACCOUNT_TYPE: !!process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
        GOOGLE_SERVICE_ACCOUNT_PROJECT_ID: !!process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        GOOGLE_SERVICE_ACCOUNT_CLIENT_ID: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
        GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
        SHEET_RANGE_PAGE1: !!process.env.SHEET_RANGE_PAGE1,
        BONESSA_TEAM: !!process.env.BONESSA_TEAM,
        SUBO_TEAM: !!process.env.SUBO_TEAM,
        GREENBOOTS_TEAM: !!process.env.GREENBOOTS_TEAM,
        JACK_TEAM: !!process.env.JACK_TEAM,
        KRIS_TEAM: !!process.env.KRIS_TEAM,
        TILES: !!process.env.TILES,
        TEAM_SCORE_RANGE: !!process.env.TEAM_SCORE_RANGE
    };

    res.json({
        message: 'Environment Variables Debug',
        timestamp: new Date().toISOString(),
        environmentVariables: envVars,
        missingVars: Object.keys(envVars).filter(key => !envVars[key])
    });
} 
export default function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Show actual values for non-sensitive variables, mask sensitive ones
    const envVars = {
        GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? '***SET***' : 'NOT SET',
        GOOGLE_SERVICE_ACCOUNT_TYPE: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE || 'NOT SET',
        GOOGLE_SERVICE_ACCOUNT_PROJECT_ID: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID ? '***SET***' : 'NOT SET',
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? '***SET***' : 'NOT SET',
        GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || 'NOT SET',
        GOOGLE_SERVICE_ACCOUNT_CLIENT_ID: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID || 'NOT SET',
        GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL || 'NOT SET',
        SHEET_RANGE_PAGE1: process.env.SHEET_RANGE_PAGE1 || 'NOT SET',
        BONESSA_TEAM: process.env.BONESSA_TEAM || 'NOT SET',
        SUBO_TEAM: process.env.SUBO_TEAM || 'NOT SET',
        GREENBOOTS_TEAM: process.env.GREENBOOTS_TEAM || 'NOT SET',
        JACK_TEAM: process.env.JACK_TEAM || 'NOT SET',
        KRIS_TEAM: process.env.KRIS_TEAM || 'NOT SET',
        TILES: process.env.TILES || 'NOT SET',
        TEAM_SCORE_RANGE: process.env.TEAM_SCORE_RANGE || 'NOT SET'
    };

    res.json({
        message: 'Environment Variables Debug',
        timestamp: new Date().toISOString(),
        environmentVariables: envVars,
        missingVars: Object.keys(envVars).filter(key => envVars[key] === 'NOT SET')
    });
} 
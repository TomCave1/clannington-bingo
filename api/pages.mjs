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

export default function handler(req, res) {
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
        const pages = Object.keys(BINGO_SHEETS).map(pageId => ({
            id: pageId,
            title: BINGO_SHEETS[pageId].title,
            hasConfig: !!BINGO_SHEETS[pageId].sheetId
        }));
        res.json({ pages });
    } catch (error) {
        console.error('Error in /api/pages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
} 
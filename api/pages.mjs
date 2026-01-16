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
            navLabel: BINGO_SHEETS[pageId].navLabel || BINGO_SHEETS[pageId].title,
            hasConfig: !!BINGO_SHEETS[pageId].sheetId
        }));
        res.json({ pages });
    } catch (error) {
        console.error('Error in /api/pages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
} 
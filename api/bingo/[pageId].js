import { getSheets } from '../shared/auth.js';
import { createHash } from 'crypto';

// Simple hash function for ETag generation
function generateETag(data) {
    const dataString = JSON.stringify(data);
    const hash = createHash('md5').update(dataString).digest('hex');
    return `"${hash}"`;
}

// Configuration for all pages
const PAGE_CONFIG = {
    'page1': {
        getSheetId: () => process.env.GOOGLE_SHEET_ID_PAGE1 || process.env.GOOGLE_SHEET_ID,
        getRange: () => process.env.SHEET_RANGE_PAGE1 || 'Sheet1!A1:Z100',
        title: 'Dashboard',
        navLabel: 'Dashboard',
        processData: (rows) => {
            // Helper function to parse numeric value from formula results or text
            const parseValue = (cellValue) => {
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

            const headers = rows[0];
            return rows.slice(1).map(row => {
                const item = {};
                headers.forEach((header, index) => {
                    const cellValue = row[index];
                    // Parse values - keep text as text, but parse numeric formulas
                    item[header] = parseValue(cellValue);
                });
                return item;
            });
        }
    },
    'page2': {
        getSheetId: () => process.env.GOOGLE_SHEET_ID,
        getRange: () => {
            const teamName = process.env.TEAM1;
            const tilesRange = process.env.TILES;
            if (!teamName || !tilesRange) return null;
            return `'${teamName.replace(/'/g, "''")}'!${tilesRange}`;
        },
        title: `Imagine Bronze Dragons`,
        navLabel: 'IBD',
        processData: processTeamPageData
    },
    'page3': {
        getSheetId: () => process.env.GOOGLE_SHEET_ID,
        getRange: () => {
            const teamName = process.env.TEAM2;
            const tilesRange = process.env.TILES;
            if (!teamName || !tilesRange) return null;
            return `'${teamName.replace(/'/g, "''")}'!${tilesRange}`;
        },
        title: `Syndrome of a Down`,
        navLabel: 'SoaD',
        processData: processTeamPageData
    },
    'page4': {
        getSheetId: () => process.env.GOOGLE_SHEET_ID,
        getRange: () => {
            const teamName = process.env.TEAM3;
            const tilesRange = process.env.TILES;
            if (!teamName || !tilesRange) return null;
            return `'${teamName.replace(/'/g, "''")}'!${tilesRange}`;
        },
        title: `My Inappropriate Romance`,
        navLabel: 'MIR',
        processData: processTeamPageData
    },
    'page5': {
        getSheetId: () => process.env.GOOGLE_SHEET_ID,
        getRange: () => {
            const teamName = process.env.TEAM4;
            const tilesRange = process.env.TILES;
            if (!teamName || !tilesRange) return null;
            return `'${teamName.replace(/'/g, "''")}'!${tilesRange}`;
        },
        title: `Urethra Franklin`,
        navLabel: 'UF',
        processData: processTeamPageData
    },
    'page6': {
        getSheetId: () => process.env.GOOGLE_SHEET_ID,
        getRange: () => {
            const teamName = process.env.TEAM5;
            const tilesRange = process.env.TILES;
            if (!teamName || !tilesRange) return null;
            return `'${teamName.replace(/'/g, "''")}'!${tilesRange}`;
        },
        title: `McFlySIS`,
        navLabel: 'McFS',
        processData: processTeamPageData
    },
    'page7': {
        getSheetId: () => process.env.GOOGLE_SHEET_ID,
        getRange: () => {
            const teamName = process.env.TEAM6;
            const tilesRange = process.env.TILES;
            if (!teamName || !tilesRange) return null;
            return `'${teamName.replace(/'/g, "''")}'!${tilesRange}`;
        },
        title: `Nine Inch Noncers`,
        navLabel: 'NIN',
        processData: processTeamPageData
    },
    'teamScore': {
        getSheetId: () => process.env.GOOGLE_SHEET_ID_TEAM_SCORE || process.env.GOOGLE_SHEET_ID_PAGE1 || process.env.GOOGLE_SHEET_ID,
        getRange: () => null, // Special handling
        title: 'Team Score',
        navLabel: 'Team Score',
        processData: null // Special handling
    }
};

// Shared processing logic for team pages (page2-6)
function processTeamPageData(rows) {
    // Helper function to parse numeric value from formula results or text
    const parseValue = (cellValue) => {
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

    // Process the data similar to the backend server
    let rawData = rows.slice(1).map(row => ({
        id: (row[0] || '').trim(),
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
        { ids: ['Jar', 'Pet'], newId: '2 Pets 1 Jar' },
        { ids: ['Twinflame Staff'], newId: 'Titans' }
    ];

    const limits = {
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

    const points = {
        'Titans': 3,
        'Barrows and Moons': 4,
        'Gigachad': 3,
        'Huey': 3,
        'SRA': 6,
        'Horn': 5,
        'Muspah': 4,
        'Nightmare': 5,
        'Visage': 4,
        '2 Pets 1 Jar': 5,
        'Nox Hally': 3,
        'Godsword': 4, // Fixed: was 'Any Godsword', should match limits key
        'LotR': 4,
        'Mega Rare': 6,
        'Revs': 6,
        'F2P': 3,
        'Voidwaker': 5,
        "TDs": 3,
        'Parsec': 4,
        'Zulrah': 4,
        'Nex': 5,
        'Mix Up': 5,
        'Doom': 5,
        'Enrage': 5,
        'Dust': 4,
        'Yama': 5,
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

    // Define custom sort order (items not in this list will appear at the end)
    // Reorder this array to change the display order of items
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

    // Log any items missing points for debugging
    const itemsWithoutPoints = mergedData.filter(item => item.points === null || item.points === undefined);
    if (itemsWithoutPoints.length > 0) {
        console.warn(`[processTeamPageData] Items without points: ${itemsWithoutPoints.map(i => i.id).join(', ')}`);
    }

    return mergedData;
}

// Special handling for teamScore
async function fetchTeamScoreData(sheets, sheetId) {
    console.log(`[fetchTeamScoreData] Fetching team score data from spreadsheet: ${sheetId}`);
    const teamMappings = [
        { name: "Imagine Bronze Dragons", sheet: "IBD", scoreCell: "AH2", tilesCell: "AH1" },
        { name: "Syndrome of a Down", sheet: "SoaD", scoreCell: "AH2", tilesCell: "AH1" },
        { name: "My Inappropriate Romance", sheet: "MIR", scoreCell: "AH2", tilesCell: "AH1" },
        { name: "Urethra Franklin", sheet: "UF", scoreCell: "AH2", tilesCell: "AH1" },
        { name: "McFlySIS", sheet: "McFS", scoreCell: "AH2", tilesCell: "AH1" },
        { name: "Nine Inch Noncers", sheet: "NIN", scoreCell: "AH2", tilesCell: "AH1" }
    ];

    const teamScores = [];

    for (const team of teamMappings) {
        try {
            // Fetch score from AH2
            const scoreResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${team.sheet}!${team.scoreCell}`,
            });

            // Fetch completed tiles from AH1
            const tilesResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${team.sheet}!${team.tilesCell}`,
            });

            const score = scoreResponse.data.values?.[0]?.[0] || '0';
            const tiles = tilesResponse.data.values?.[0]?.[0] || '0';

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

    return teamScores;
}

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
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
        // Extract pageId from URL path
        // In Vercel, the path parameter is in the URL
        let pageId = 'page1';
        if (req.url) {
            const match = req.url.match(/\/api\/bingo\/([^/?]+)/);
            if (match) {
                pageId = match[1];
            }
        }

        const config = PAGE_CONFIG[pageId];
        if (!config) {
            res.status(404).json({ error: `Page ${pageId} not found` });
            return;
        }

        const sheets = getSheets();
        const sheetId = config.getSheetId();

        if (!sheetId) {
            res.status(500).json({ error: 'Google Sheet ID not configured' });
            return;
        }

        // Log which sheet ID is being used for debugging
        if (pageId === 'teamScore') {
            const usedEnvVar = process.env.GOOGLE_SHEET_ID_TEAM_SCORE
                ? 'GOOGLE_SHEET_ID_TEAM_SCORE'
                : process.env.GOOGLE_SHEET_ID_PAGE1
                    ? 'GOOGLE_SHEET_ID_PAGE1'
                    : 'GOOGLE_SHEET_ID';
            console.log(`[teamScore] Using sheet ID from ${usedEnvVar}: ${sheetId}`);
        } else if (['page2', 'page3', 'page4', 'page5', 'page6', 'page7'].includes(pageId)) {
            // Log environment variables for team pages
            const teamVar = pageId === 'page2' ? 'TEAM1' :
                pageId === 'page3' ? 'TEAM2' :
                    pageId === 'page4' ? 'TEAM3' :
                        pageId === 'page5' ? 'TEAM4' :
                            pageId === 'page6' ? 'TEAM5' : 'TEAM6';
            const teamName = process.env[teamVar];
            const tilesRange = process.env.TILES;
            console.log(`[${pageId}] Sheet ID: ${sheetId}, Team var (${teamVar}): ${teamName || 'NOT SET'}, TILES: ${tilesRange || 'NOT SET'}`);
        }

        let data;
        let headers = ['team', 'tilesCompleted', 'score'];

        // Special handling for teamScore
        if (pageId === 'teamScore') {
            data = await fetchTeamScoreData(sheets, sheetId);
        } else {
            const range = config.getRange();
            if (!range) {
                // Provide helpful error message indicating which env vars are missing
                let missingVars = [];
                if (pageId === 'page2' && !process.env.TEAM1) missingVars.push('TEAM1');
                if (pageId === 'page3' && !process.env.TEAM2) missingVars.push('TEAM2');
                if (pageId === 'page4' && !process.env.TEAM3) missingVars.push('TEAM3');
                if (pageId === 'page5' && !process.env.TEAM4) missingVars.push('TEAM4');
                if (pageId === 'page6' && !process.env.TEAM5) missingVars.push('TEAM5');
                if (pageId === 'page7' && !process.env.TEAM6) missingVars.push('TEAM6');
                if (!process.env.TILES) missingVars.push('TILES');

                const errorMsg = missingVars.length > 0
                    ? `Range not configured for ${pageId}. Missing environment variables: ${missingVars.join(', ')}`
                    : `Range not configured for ${pageId}`;

                console.error(`[${pageId}] ${errorMsg}`);
                res.status(500).json({ error: errorMsg });
                return;
            }

            console.log(`Fetching data for ${pageId} from sheet ${sheetId}, range: ${range}`);

            const response = await Promise.race([
                sheets.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: range,
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                )
            ]);

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                res.json({ error: 'No data found in the specified range' });
                return;
            }

            console.log(`Received ${rows.length} rows for ${pageId}`);

            data = config.processData(rows);

            // For page1, extract headers from first row
            if (pageId === 'page1') {
                headers = rows[0];
            }
        }

        // Generate ETag based on data content only (no timestamp)
        const etag = generateETag(data);

        // Check if client has the same version
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
            res.status(304).end(); // Not Modified
            return;
        }

        // Set ETag header
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', new Date().toUTCString());

        // For HEAD requests, only send headers
        if (req.method === 'HEAD') {
            res.status(200).end();
            return;
        }

        res.json({
            data,
            headers,
            title: config.title,
            pageId
        });
    } catch (error) {
        console.error(`Error in /api/bingo/${req.url}:`, error);
        res.status(500).json({
            error: 'Failed to fetch bingo data',
            details: error.message
        });
    }
}

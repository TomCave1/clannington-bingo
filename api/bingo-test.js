export default function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { pageId } = req.query;

        res.json({
            message: 'Bingo test endpoint working!',
            pageId: pageId,
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            query: req.query
        });
    } catch (error) {
        console.error('Error in bingo test endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
} 
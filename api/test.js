export default function handler(req, res) {
    res.json({
        message: 'Test API working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        query: req.query
    });
} 
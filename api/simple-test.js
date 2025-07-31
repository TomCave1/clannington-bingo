export default function handler(req, res) {
    res.json({
        message: 'Simple JavaScript API working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
    });
} 
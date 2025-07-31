import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.json({
        message: 'Simple TypeScript API working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
    });
} 
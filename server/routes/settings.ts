import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Get settings
router.get('/', async (req, res) => {
    return handleGetSettings('system_settings', req, res);
});

router.get('/:key', async (req, res) => {
    return handleGetSettings(req.params.key, req, res);
});

async function handleGetSettings(key: string, _req: express.Request, res: express.Response) {
    try {
        const row: any = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        if (!row) {
            return res.json({ key, value: null });
        }
        res.json({ key, ...JSON.parse(row.value) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
}

// Update settings (Admin only)
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const settings = req.body;
        const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');

        for (const [key, value] of Object.entries(settings)) {
            const valueStr = JSON.stringify(value);
            stmt.run(key, valueStr, valueStr);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;

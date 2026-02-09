import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Get settings
router.get('/', async (req, res) => {
    try {
        const row: any = db.prepare('SELECT value FROM settings WHERE key = "system_settings"').get();
        if (!row) {
            return res.json({ key: 'system_settings', pricingStrategy: null });
        }
        res.json({ key: 'system_settings', ...JSON.parse(row.value) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update settings (Admin only)
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const value = JSON.stringify(req.body);
        db.prepare(`
            INSERT INTO settings (key, value)
            VALUES ("system_settings", ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(value);
        res.json({ key: 'system_settings', ...req.body });
    } catch (error) {
        console.error('Failed to update settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;

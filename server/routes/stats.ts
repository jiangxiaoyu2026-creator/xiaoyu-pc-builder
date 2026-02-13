import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Get system stats (Admin only)
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const totalAiGenerations: any = db.prepare('SELECT SUM(aiGenerations) as total FROM daily_stats').get();
        const dailyStats = db.prepare('SELECT * FROM daily_stats ORDER BY date DESC LIMIT 30').all();

        res.json({
            totalAiGenerations: totalAiGenerations.total || 0,
            dailyStats: dailyStats.reverse()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Log custom event (Internal/Public)
router.post('/log', async (req, res) => {
    const { type } = req.body;
    const today = new Date().toISOString().split('T')[0];

    try {
        if (type === 'ai_generation') {
            db.prepare(`
                INSERT INTO daily_stats (date, aiGenerations) VALUES (?, 1)
                ON CONFLICT(date) DO UPDATE SET aiGenerations = daily_stats.aiGenerations + 1
            `).run(today);
        } else if (type === 'new_config') {
            db.prepare(`
                INSERT INTO daily_stats (date, newConfigs) VALUES (?, 1)
                ON CONFLICT(date) DO UPDATE SET newConfigs = daily_stats.newConfigs + 1
            `).run(today);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log event' });
    }
});

export default router;

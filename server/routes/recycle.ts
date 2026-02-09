import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Admin only: Get all recycle requests
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM recycle_requests ORDER BY createdAt DESC').all();
        const requests = rows.map((row: any) => ({
            ...row,
            isRead: row.isRead === 1
        }));
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recycle requests' });
    }
});

// Public: Create recycle request
router.post('/', async (req, res) => {
    const r = req.body;
    try {
        const newId = crypto.randomUUID();
        db.prepare(`
            INSERT INTO recycle_requests (id, userId, userName, description, wechat, image, status, isRead)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newId, r.userId, r.userName, r.description, r.wechat, r.image, r.status || 'pending', 0);

        const created = db.prepare('SELECT * FROM recycle_requests WHERE id = ?').get(newId);
        res.json(created);
    } catch (error) {
        console.error('Failed to save recycle request:', error);
        res.status(500).json({ error: 'Failed to save recycle request' });
    }
});

// Admin only: Delete recycle request
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
    try {
        db.prepare('DELETE FROM recycle_requests WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete recycle request' });
    }
});

export default router;

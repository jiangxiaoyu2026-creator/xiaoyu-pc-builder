import express from 'express';
import { db } from '../db';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Get all published configs (Public)
router.get('/', async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM configs WHERE status = "published" ORDER BY createdAt DESC').all();
        const configs = rows.map((row: any) => ({
            ...row,
            evaluation: row.evaluation ? JSON.parse(row.evaluation) : null
        }));
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch configurations' });
    }
});

// Get user's configs
router.get('/user/:userId', async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM configs WHERE userId = ? ORDER BY createdAt DESC').all(req.params.userId);
        const configs = rows.map((row: any) => ({
            ...row,
            evaluation: row.evaluation ? JSON.parse(row.evaluation) : null
        }));
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user configurations' });
    }
});

// Create/Update config
router.post('/', authenticate, async (req, res) => {
    const c = req.body;
    const user = (req as any).user;
    try {
        const id = c.id || c._id;
        const evaluation = c.evaluation ? JSON.stringify(c.evaluation) : null;
        const now = new Date().toISOString();

        if (id) {
            const existing: any = db.prepare('SELECT userId FROM configs WHERE id = ?').get(id);
            if (existing && existing.userId !== user.id && user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            db.prepare(`
                UPDATE configs 
                SET userId = ?, userName = ?, cpuId = ?, gpuId = ?, mbId = ?, ramId = ?, diskId = ?, psuId = ?, caseId = ?, coolId = ?, monId = ?, totalPrice = ?, status = ?, evaluation = ?, updatedAt = ?
                WHERE id = ?
            `).run(c.userId, c.userName, c.cpuId, c.gpuId, c.mbId, c.ramId, c.diskId, c.psuId, c.caseId, c.coolId, c.monId, c.totalPrice, c.status, evaluation, now, id);

            res.json({ ...c, updatedAt: now });
        } else {
            const newId = crypto.randomUUID();
            let sn = c.serialNumber;
            if (!sn) {
                const year = new Date().getFullYear();
                const result: any = db.prepare('SELECT COUNT(*) as count FROM configs WHERE serialNumber LIKE ?').get(`${year}-%`);
                sn = `${year}-${(result.count + 1).toString().padStart(6, '0')}`;
            }

            db.prepare(`
                INSERT INTO configs (id, userId, userName, serialNumber, cpuId, gpuId, mbId, ramId, diskId, psuId, caseId, coolId, monId, totalPrice, status, evaluation, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(newId, c.userId, c.userName, sn, c.cpuId, c.gpuId, c.mbId, c.ramId, c.diskId, c.psuId, c.caseId, c.coolId, c.monId, c.totalPrice, c.status || 'draft', evaluation, now, now);

            res.json({ ...c, id: newId, serialNumber: sn, createdAt: now, updatedAt: now });
        }
    } catch (error) {
        console.error('Failed to save config:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Delete config
router.delete('/:id', authenticate, async (req, res) => {
    const user = (req as any).user;
    try {
        const existing: any = db.prepare('SELECT userId FROM configs WHERE id = ?').get(req.params.id);
        if (existing && existing.userId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        db.prepare('DELETE FROM configs WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete configuration' });
    }
});

export default router;

import express from 'express';
import { db } from '../db';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Get all published configs (Public)
router.get('/', async (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM configs WHERE status = 'published' ORDER BY createdAt DESC").all();
        const configs = rows.map((row: any) => {
            let evaluation = null;
            let items = {};
            let tags = [];
            try {
                evaluation = row.evaluation ? JSON.parse(row.evaluation) : null;
                items = row.items ? JSON.parse(row.items) : {};
                tags = row.tags ? JSON.parse(row.tags) : [];
            } catch (e) {
                console.error(`Failed to parse JSON for config ${row.id}:`, e);
            }
            return { ...row, evaluation, items, tags };
        });
        res.json(configs);
    } catch (error) {
        console.error('Failed to fetch public configs:', error);
        res.status(500).json({ error: 'Failed to fetch configurations', details: (error as Error).message });
    }
});

// Get user's configs
router.get('/user/:userId', async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM configs WHERE userId = ? ORDER BY createdAt DESC').all(req.params.userId);
        const configs = rows.map((row: any) => {
            let evaluation = null;
            let items = {};
            let tags = [];
            try {
                evaluation = row.evaluation ? JSON.parse(row.evaluation) : null;
                items = row.items ? JSON.parse(row.items) : {};
                tags = row.tags ? JSON.parse(row.tags) : [];
            } catch (e) {
                console.error(`Failed to parse JSON for config ${row.id}:`, e);
            }
            return { ...row, evaluation, items, tags };
        });
        res.json(configs);
    } catch (error) {
        console.error('Failed to fetch user configs:', error);
        res.status(500).json({ error: 'Failed to fetch user configurations', details: (error as Error).message });
    }
});

// Create/Update config
router.post('/', authenticate, async (req, res) => {
    const c = req.body;
    const user = (req as any).user;
    try {
        const id = c.id || c._id;
        const now = new Date().toISOString();

        // Extract nested items if present (from frontend) or use flat properties
        const itemsObj = c.items || {};
        const cpuId = itemsObj.cpu || c.cpuId;
        const gpuId = itemsObj.gpu || c.gpuId;
        const mbId = itemsObj.mainboard || c.mbId;
        const ramId = itemsObj.ram || c.ramId;
        const diskId = itemsObj.disk || c.diskId;
        const psuId = itemsObj.power || c.psuId;
        const caseId = itemsObj.case || c.caseId;
        const coolId = itemsObj.cooling || c.coolId;
        const monId = itemsObj.monitor || c.monId;

        // Mandatory columns
        const evaluation = JSON.stringify(c.evaluation || { score: 0, verdict: 'Pending evaluation' });
        const itemsJson = JSON.stringify(itemsObj);
        const tagsJson = JSON.stringify(c.tags || []);
        const totalPrice = c.totalPrice || 0;
        const status = c.status || 'draft';
        const isRecommended = c.isRecommended ? 1 : 0;
        const views = c.views || 0;
        const likes = c.likes || 0;

        if (id) {
            const existing: any = db.prepare('SELECT userId FROM configs WHERE id = ?').get(id);
            if (existing && existing.userId !== user.id && user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            db.prepare(`
                UPDATE configs 
                SET userId = ?, userName = ?, cpuId = ?, gpuId = ?, mbId = ?, ramId = ?, diskId = ?, psuId = ?, caseId = ?, coolId = ?, monId = ?, 
                    totalPrice = ?, status = ?, evaluation = ?, items = ?, tags = ?, isRecommended = ?, views = ?, likes = ?, updatedAt = ?
                WHERE id = ?
            `).run(
                c.userId || user.id, c.userName || user.username, cpuId, gpuId, mbId, ramId, diskId, psuId, caseId, coolId, monId,
                totalPrice, status, evaluation, itemsJson, tagsJson, isRecommended, views, likes, now, id
            );

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
                INSERT INTO configs (id, userId, userName, serialNumber, cpuId, gpuId, mbId, ramId, diskId, psuId, caseId, coolId, monId, 
                                    totalPrice, status, evaluation, items, tags, isRecommended, views, likes, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                newId, c.userId || user.id, c.userName || user.username, sn, cpuId, gpuId, mbId, ramId, diskId, psuId, caseId, coolId, monId,
                totalPrice, status, evaluation, itemsJson, tagsJson, isRecommended, views, likes, now, now
            );

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

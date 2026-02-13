import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Get published used items (Public)
router.get('/', async (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM used_items WHERE status = 'published' ORDER BY createdAt DESC").all();
        const items = rows.map((row: any) => {
            let images = [];
            let report = null;
            try {
                images = row.images ? JSON.parse(row.images) : [];
                report = row.inspectionReport ? JSON.parse(row.inspectionReport) : null;
            } catch (e) {
                console.error(`Failed to parse JSON for used item ${row.id}:`, e);
            }
            return { ...row, images, inspectionReport: report };
        });
        res.json(items);
    } catch (error) {
        console.error('Failed to fetch used items:', error);
        res.status(500).json({ error: 'Failed to fetch used items', details: (error as Error).message });
    }
});

// Admin/Streamer: Get all items
router.get('/admin', authenticate, authorize(['admin', 'streamer']), async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM used_items ORDER BY createdAt DESC').all();
        const items = rows.map((row: any) => {
            let images = [];
            let report = null;
            try {
                images = row.images ? JSON.parse(row.images) : [];
                report = row.inspectionReport ? JSON.parse(row.inspectionReport) : null;
            } catch (e) {
                console.error(`Failed to parse JSON for used item ${row.id}:`, e);
            }
            return { ...row, images, inspectionReport: report };
        });
        res.json(items);
    } catch (error) {
        console.error('Failed to fetch admin used items:', error);
        res.status(500).json({ error: 'Failed to fetch all used items', details: (error as Error).message });
    }
});

// Create/Update item
router.post('/', authenticate, authorize(['admin', 'streamer']), async (req, res) => {
    const item = req.body;
    try {
        const id = item.id || item._id;
        const images = JSON.stringify(item.images || []);
        const report = item.inspectionReport ? JSON.stringify(item.inspectionReport) : null;
        const now = new Date().toISOString();

        // Mandatory columns with defaults if missing
        const price = item.price || 0;
        const condition = item.condition || '99新';
        const description = item.description || '';
        const status = item.status || 'pending';

        if (id) {
            db.prepare(`
                UPDATE used_items 
                SET type = ?, sellerId = ?, sellerName = ?, contact = ?, category = ?, brand = ?, model = ?, price = ?, originalPrice = ?, condition = ?, images = ?, description = ?, status = ?, inspectionReport = ?, soldAt = ?
                WHERE id = ?
            `).run(item.type, item.sellerId, item.sellerName, item.contact, item.category, item.brand, item.model, price, item.originalPrice, condition, images, description, status, report, item.soldAt || null, id);
            res.json(db.prepare('SELECT * FROM used_items WHERE id = ?').get(id));
        } else {
            const newId = crypto.randomUUID();
            db.prepare(`
                INSERT INTO used_items (id, type, sellerId, sellerName, contact, category, brand, model, price, originalPrice, condition, images, description, status, inspectionReport, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(newId, item.type, item.sellerId, item.sellerName, item.contact, item.category, item.brand, item.model, price, item.originalPrice, condition, images, description, status, report, now);
            res.json(db.prepare('SELECT * FROM used_items WHERE id = ?').get(newId));
        }
    } catch (error) {
        console.error('Failed to save used item:', error);
        res.status(500).json({ error: 'Failed to save used item' });
    }
});

// Delete item (Admin only)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
    try {
        db.prepare('DELETE FROM used_items WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete used item' });
    }
});

export default router;

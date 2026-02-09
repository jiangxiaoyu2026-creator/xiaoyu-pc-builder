import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Get published used items (Public)
router.get('/', async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM used_items WHERE status = "published" ORDER BY createdAt DESC').all();
        const items = rows.map((row: any) => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : [],
            inspectionReport: row.inspectionReport ? JSON.parse(row.inspectionReport) : null
        }));
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch used items' });
    }
});

// Admin/Streamer: Get all items
router.get('/admin', authenticate, authorize(['admin', 'streamer']), async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM used_items ORDER BY createdAt DESC').all();
        const items = rows.map((row: any) => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : [],
            inspectionReport: row.inspectionReport ? JSON.parse(row.inspectionReport) : null
        }));
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all used items' });
    }
});

// Create/Update item
router.post('/', authenticate, authorize(['admin', 'streamer']), async (req, res) => {
    const item = req.body;
    try {
        const id = item.id || item._id;
        const images = item.images ? JSON.stringify(item.images) : '[]';
        const report = item.inspectionReport ? JSON.stringify(item.inspectionReport) : null;

        if (id) {
            db.prepare(`
                UPDATE used_items 
                SET type = ?, sellerId = ?, sellerName = ?, contact = ?, category = ?, brand = ?, model = ?, price = ?, originalPrice = ?, condition = ?, images = ?, description = ?, status = ?, inspectionReport = ?
                WHERE id = ?
            `).run(item.type, item.sellerId, item.sellerName, item.contact, item.category, item.brand, item.model, item.price, item.originalPrice, item.condition, images, item.description, item.status, report, id);
            res.json(db.prepare('SELECT * FROM used_items WHERE id = ?').get(id));
        } else {
            const newId = crypto.randomUUID();
            db.prepare(`
                INSERT INTO used_items (id, type, sellerId, sellerName, contact, category, brand, model, price, originalPrice, condition, images, description, status, inspectionReport)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(newId, item.type, item.sellerId, item.sellerName, item.contact, item.category, item.brand, item.model, item.price, item.originalPrice, item.condition, images, item.description, item.status || 'pending', report);
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

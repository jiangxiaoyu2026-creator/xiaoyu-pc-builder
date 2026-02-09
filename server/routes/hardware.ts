import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Get all active products (Public)
router.get('/', async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM hardware WHERE status = "active" ORDER BY sortOrder ASC').all();
        const products = rows.map((row: any) => ({
            ...row,
            specs: row.specs ? JSON.parse(row.specs) : {}
        }));
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Admin/Streamer: Get all products
router.get('/admin', authenticate, authorize(['admin', 'streamer']), async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM hardware ORDER BY sortOrder ASC').all();
        const products = rows.map((row: any) => ({
            ...row,
            specs: row.specs ? JSON.parse(row.specs) : {}
        }));
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Create/Update product (Admin or Streamer)
router.post('/', authenticate, authorize(['admin', 'streamer']), async (req, res) => {
    const p = req.body;
    try {
        const id = p.id || p._id;
        const specs = p.specs ? JSON.stringify(p.specs) : null;

        if (id) {
            db.prepare(`
                UPDATE hardware 
                SET category = ?, brand = ?, model = ?, price = ?, status = ?, sortOrder = ?, specs = ?, imageUrl = ?
                WHERE id = ?
            `).run(p.category, p.brand, p.model, p.price, p.status, p.sortOrder, specs, p.imageUrl, id);

            const updated = db.prepare('SELECT * FROM hardware WHERE id = ?').get(id);
            res.json({ ...updated as any, specs: p.specs });
        } else {
            const newId = crypto.randomUUID();
            db.prepare(`
                INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, imageUrl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(newId, p.category, p.brand, p.model, p.price, p.status || 'active', p.sortOrder || 100, specs, p.imageUrl);

            const created = db.prepare('SELECT * FROM hardware WHERE id = ?').get(newId);
            res.json({ ...created as any, specs: p.specs });
        }
    } catch (error) {
        console.error('Failed to save product:', error);
        res.status(500).json({ error: 'Failed to save product' });
    }
});

// Delete product (Admin only)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
    try {
        db.prepare('DELETE FROM hardware WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

export default router;

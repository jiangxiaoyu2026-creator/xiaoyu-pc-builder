import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Get all active products (Public)
router.get('/', async (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM hardware WHERE status = 'active' ORDER BY sortOrder ASC").all();
        const products = rows.map((row: any) => {
            let specs = {};
            try {
                specs = row.specs ? JSON.parse(row.specs) : {};
            } catch (e) {
                console.error(`Failed to parse specs for product ${row.uuid || row.id}:`, e);
            }
            return { ...row, specs };
        });
        res.json(products);
    } catch (error) {
        console.error('Failed to fetch public products:', error);
        res.status(500).json({ error: 'Failed to fetch products', details: (error as Error).message });
    }
});

// Admin/Streamer: Get all products
router.get('/admin', authenticate, authorize(['admin', 'streamer']), async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM hardware ORDER BY sortOrder ASC').all();
        const products = rows.map((row: any) => {
            let specs = {};
            try {
                specs = row.specs ? JSON.parse(row.specs) : {};
            } catch (e) {
                console.error(`Failed to parse specs for product ${row.id}:`, e);
            }
            return { ...row, specs };
        });
        res.json(products);
    } catch (error) {
        console.error('Failed to fetch admin products:', error);
        res.status(500).json({ error: 'Failed to fetch products', details: (error as Error).message });
    }
});

// Create/Update product (Admin or Streamer)
router.post('/', authenticate, authorize(['admin', 'streamer']), async (req, res) => {
    const p = req.body;
    try {
        let id = p.id || p._id;
        const specs = p.specs ? JSON.stringify(p.specs) : '{}';

        // If it's a temporary ID from frontend, treat it as new
        const isNew = !id || id.startsWith('new-');

        if (!isNew) {
            // Check if it actually exists in DB
            const existing = db.prepare('SELECT id FROM hardware WHERE id = ?').get(id);
            if (existing) {
                db.prepare(`
                    UPDATE hardware 
                    SET category = ?, brand = ?, model = ?, price = ?, status = ?, sortOrder = ?, specs = ?, image = ?, isDiscount = ?, isRecommended = ?, isNew = ?
                    WHERE id = ?
                `).run(p.category, p.brand, p.model, p.price, p.status, p.sortOrder, specs, p.image, p.isDiscount || 0, p.isRecommended || 0, p.isNew || 0, id);

                const updated = db.prepare('SELECT * FROM hardware WHERE id = ?').get(id);
                return res.json({ ...updated as any, specs: p.specs });
            }
        }

        // Create new
        const newId = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, image, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
        `).run(newId, p.category, p.brand, p.model, p.price, p.status || 'active', p.sortOrder || 100, specs, p.image, now);

        const created = db.prepare('SELECT * FROM hardware WHERE id = ?').get(newId);
        res.json({ ...created as any, specs: p.specs });
    } catch (error) {
        console.error('Failed to save product:', error);
        res.status(500).json({ error: 'Failed to save product', details: (error as Error).message });
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

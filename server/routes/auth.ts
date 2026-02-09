import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'xiaoyu_pc_builder_secret_key_2026';

// Register
router.post('/register', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (existing) return res.status(400).json({ error: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        db.prepare(`
            INSERT INTO users (id, username, password, role)
            VALUES (?, ?, ?, ?)
        `).run(userId, username, hashedPassword, 'user');

        const token = jwt.sign({ id: userId, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: userId, username, role: 'user' } });
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const lastLogin = new Date().toISOString();
        db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?').run(lastLogin, user.id);

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get all users (Admin only)
router.get('/users', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
        const users = db.prepare('SELECT id, username, role, status, lastLogin, vipExpireAt, inviteCode, invitedBy, inviteCount, inviteVipDays FROM users').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update/Create user (Admin or Self)
router.post('/user', authenticate, async (req: Request, res: Response) => {
    const userData = req.body;
    const { user } = req as any;

    try {
        const id = userData.id || userData._id;
        if (id) {
            // Authorization check
            if (user.role !== 'admin' && user.id !== id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Update user
            const fields = [];
            const params = [];

            if (userData.username) { fields.push('username = ?'); params.push(userData.username); }
            if (userData.password) {
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                fields.push('password = ?');
                params.push(hashedPassword);
            }
            if (userData.role && user.role === 'admin') { fields.push('role = ?'); params.push(userData.role); }
            if (userData.status && user.role === 'admin') { fields.push('status = ?'); params.push(userData.status); }
            if (userData.vipExpireAt !== undefined) { fields.push('vipExpireAt = ?'); params.push(userData.vipExpireAt); }

            if (fields.length === 0) return res.json({ id });

            params.push(id);
            db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);

            const updatedUser = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(id);
            res.json(updatedUser);
        } else {
            // Create user (Admin only)
            if (user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

            const hashedPassword = await bcrypt.hash(userData.password || '123456', 10);
            const newId = crypto.randomUUID();

            db.prepare(`
                INSERT INTO users (id, username, password, role, status)
                VALUES (?, ?, ?, ?, ?)
            `).run(newId, userData.username, hashedPassword, userData.role || 'user', userData.status || 'active');

            const newUser = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(newId);
            res.json(newUser);
        }
    } catch (error) {
        console.error('Failed to save user:', error);
        res.status(500).json({ error: 'Failed to save user' });
    }
});

export default router;

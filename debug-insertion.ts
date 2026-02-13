
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data/xiaoyu.db');

const db = new Database(dbPath);

async function testHardwareInsert() {
    console.log('\n--- Testing Hardware INSERT ---');
    const p = {
        category: 'cpu',
        brand: 'Intel',
        model: 'Core i9-14900K',
        price: 4500,
        status: 'active',
        sortOrder: 10,
        specs: { cores: 24 },
        image: 'cpu.jpg'
    };
    const specs = JSON.stringify(p.specs);
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        db.prepare(`
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, image, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
        `).run(newId, p.category, p.brand, p.model, p.price, p.status || 'active', p.sortOrder || 100, specs, p.image, now);
        console.log('✅ Hardware INSERT successful');
        db.prepare('DELETE FROM hardware WHERE id = ?').run(newId);
    } catch (e) {
        console.error('❌ Hardware INSERT failed:', (e as Error).message);
    }
}

async function testUserInsert() {
    console.log('\n--- Testing User INSERT ---');
    const userData = {
        username: 'tester-' + Date.now(),
        password: 'password123',
        phone: '13800138000',
        role: 'user',
        status: 'active'
    };
    const newId = crypto.randomUUID();

    try {
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO users (id, username, password, phone, role, status, inviteCount, inviteVipDays, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newId, userData.username, userData.password, userData.phone || null, userData.role || 'user', userData.status || 'active', 0, 0, now);
        console.log('✅ User INSERT successful');
        db.prepare('DELETE FROM users WHERE id = ?').run(newId);
    } catch (e) {
        console.error('❌ User INSERT failed:', (e as Error).message);
    }
}

async function run() {
    await testHardwareInsert();
    await testUserInsert();
    db.close();
}

run();

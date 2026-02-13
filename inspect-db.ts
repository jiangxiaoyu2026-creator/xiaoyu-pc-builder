
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data/xiaoyu.db');

const db = new Database(dbPath);

console.log('--- Database Inspection ---');
console.log('DB Path:', dbPath);

// 1. Check users
const users = db.prepare('SELECT id, username, role, status, phone FROM users').all();
console.log('\nUsers Table Data:', users);

const usersInfo = db.prepare('PRAGMA table_info(users)').all();
console.log('\nUsers Table Info:', usersInfo);

// 2. Check hardware table info
const hardwareInfo = db.prepare('PRAGMA table_info(hardware)').all();
console.log('\nHardware Table Info:', hardwareInfo);

// 3. Check daily_stats
const statsInfo = db.prepare('PRAGMA table_info(daily_stats)').all();
console.log('\nDaily Stats Table Info:', statsInfo);

// 4. Try a dry run of the failing INSERT in auth.ts
const today = new Date().toISOString().split('T')[0];
try {
    db.prepare(`
        INSERT INTO daily_stats (date, newUsers) VALUES (?, 1)
        ON CONFLICT(date) DO UPDATE SET newUsers = daily_stats.newUsers + 1
    `).run(today);
    console.log('\n✅ daily_stats INSERT/UPDATE test successful');
} catch (e) {
    console.error('\n❌ daily_stats operation failed:', (e as Error).message);
}

db.close();

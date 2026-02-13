import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../data/xiaoyu.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');

export function connectDB() {
    console.log(`📡 SQLite connected: ${dbPath}`);

    // Create Tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            mobile TEXT,
            password TEXT NOT NULL,
            phone TEXT UNIQUE,
            role TEXT DEFAULT 'user',
            status TEXT DEFAULT 'active',
            lastLogin TEXT,
            vipExpireAt INTEGER,
            inviteCode TEXT,
            invitedBy TEXT,
            inviteCount INTEGER DEFAULT 0,
            inviteVipDays INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            planId TEXT NOT NULL,
            planName TEXT,
            amount INTEGER NOT NULL, -- 单位：分
            status TEXT DEFAULT 'pending', -- pending, paid, failed
            payMethod TEXT, -- wechat, alipay
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            paidAt TEXT
        );

        CREATE TABLE IF NOT EXISTS daily_stats (
            date TEXT PRIMARY KEY, -- YYYY-MM-DD
            aiGenerations INTEGER DEFAULT 0,
            newConfigs INTEGER DEFAULT 0,
            newUsers INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS hardware (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            price REAL NOT NULL,
            status TEXT DEFAULT 'active',
            sortOrder INTEGER DEFAULT 100,
            specs TEXT, -- JSON string
            image TEXT,
            isDiscount INTEGER DEFAULT 0,
            isRecommended INTEGER DEFAULT 0,
            isNew INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS configs (
            id TEXT PRIMARY KEY,
            userId TEXT,
            userName TEXT,
            serialNumber TEXT UNIQUE,
            cpuId TEXT,
            gpuId TEXT,
            mbId TEXT,
            ramId TEXT,
            diskId TEXT,
            psuId TEXT,
            caseId TEXT,
            coolId TEXT,
            monId TEXT,
            totalPrice REAL NOT NULL,
            status TEXT DEFAULT 'draft',
            evaluation TEXT NOT NULL, -- JSON string
            items TEXT NOT NULL, -- JSON string (redundant but required by DB)
            tags TEXT NOT NULL, -- JSON string
            isRecommended INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS used_items (
            id TEXT PRIMARY KEY,
            type TEXT DEFAULT 'personal',
            sellerId TEXT,
            sellerName TEXT,
            contact TEXT,
            category TEXT,
            brand TEXT,
            model TEXT,
            price REAL NOT NULL,
            originalPrice REAL,
            condition TEXT NOT NULL,
            images TEXT NOT NULL, -- JSON string
            description TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            inspectionReport TEXT, -- JSON string
            soldAt INTEGER,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT -- JSON string (PricingStrategy)
        );

        CREATE TABLE IF NOT EXISTS recycle_requests (
            id TEXT PRIMARY KEY,
            userId TEXT,
            userName TEXT,
            description TEXT,
            wechat TEXT,
            image TEXT,
            status TEXT DEFAULT 'pending',
            isRead INTEGER DEFAULT 0, -- 0 for false, 1 for true
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Migration logic to ensure code and actual DB are in sync
    const migrateTable = (tableName: string, definitions: Record<string, string>) => {
        const tableInfo: any = db.prepare(`PRAGMA table_info(${tableName})`).all();
        const existingCols = tableInfo.map((col: any) => col.name);

        for (const [col, def] of Object.entries(definitions)) {
            if (!existingCols.includes(col)) {
                console.log(`🔄 Migrating ${tableName} table: adding missing column ${col}...`);
                try {
                    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${def}`).run();
                } catch (e) {
                    console.error(`❌ Failed to add ${col} to ${tableName}:`, e);
                }
            }
        }
    };

    migrateTable('users', {
        'phone': 'TEXT',
        'mobile': 'TEXT',
        'inviteCount': 'INTEGER DEFAULT 0',
        'inviteVipDays': 'INTEGER DEFAULT 0'
    });

    migrateTable('hardware', {
        'isDiscount': 'INTEGER DEFAULT 0',
        'isRecommended': 'INTEGER DEFAULT 0',
        'isNew': 'INTEGER DEFAULT 0'
    });

    migrateTable('configs', {
        'items': 'TEXT NOT NULL DEFAULT "{}"',
        'tags': 'TEXT NOT NULL DEFAULT "[]"',
        'isRecommended': 'INTEGER DEFAULT 0',
        'views': 'INTEGER DEFAULT 0',
        'likes': 'INTEGER DEFAULT 0'
    });

    migrateTable('used_items', {
        'soldAt': 'INTEGER'
    });

    // Special case: Ensure unique phone index
    try {
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone)').run();
    } catch (e) { }

    // Seed Admin User
    const admin = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
    if (!admin) {
        console.log('🌱 Seeding default admin user...');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare(`
            INSERT INTO users (id, username, password, role, status, inviteCount, inviteVipDays, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('admin-root', 'admin', hashedPassword, 'admin', 'active', 0, 0, new Date().toISOString());
        console.log('✅ Default admin user created: admin / admin123');
    }
}

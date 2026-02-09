import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
            password TEXT NOT NULL,
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

        CREATE TABLE IF NOT EXISTS hardware (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            price REAL NOT NULL,
            status TEXT DEFAULT 'active',
            sortOrder INTEGER DEFAULT 100,
            specs TEXT, -- JSON string
            imageUrl TEXT,
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
            totalPrice REAL,
            status TEXT DEFAULT 'draft',
            evaluation TEXT, -- JSON string
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
            price REAL,
            originalPrice REAL,
            condition TEXT,
            images TEXT, -- JSON string
            description TEXT,
            status TEXT DEFAULT 'pending',
            inspectionReport TEXT, -- JSON string
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
}

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../data/xiaoyu.db');

const db = new Database(dbPath);

console.log('🌱 Starting database seeding...');

// 1. Hardware Data
const hardware = [
    // CPUs
    { category: 'cpu', brand: 'Intel', model: 'Core i9-14900K', price: 4299, specs: { cores: '24', threads: '32', baseClock: '3.2GHz', turboClock: '6.0GHz' } },
    { category: 'cpu', brand: 'Intel', model: 'Core i7-14700K', price: 2999, specs: { cores: '20', threads: '28', baseClock: '3.4GHz', turboClock: '5.6GHz' } },
    { category: 'cpu', brand: 'Intel', model: 'Core i5-14600K', price: 2199, specs: { cores: '14', threads: '20' } },
    { category: 'cpu', brand: 'AMD', model: 'Ryzen 9 7950X3D', price: 4599, specs: { cores: '16', threads: '32', cache: '144MB' } },
    { category: 'cpu', brand: 'AMD', model: 'Ryzen 7 7800X3D', price: 2699, specs: { cores: '8', threads: '16' } },

    // GPUs
    { category: 'gpu', brand: 'NVIDIA', model: 'GeForce RTX 4090', price: 15999, specs: { vram: '24GB GDDR6X', power: '450W' } },
    { category: 'gpu', brand: 'NVIDIA', model: 'GeForce RTX 4080 Super', price: 8499, specs: { vram: '16GB GDDR6X' } },
    { category: 'gpu', brand: 'NVIDIA', model: 'GeForce RTX 4070 Ti Super', price: 6499, specs: { vram: '16GB GDDR6X' } },
    { category: 'gpu', brand: 'NVIDIA', model: 'GeForce RTX 4060 Ti', price: 2999, specs: { vram: '8GB GDDR6' } },
    { category: 'gpu', brand: 'AMD', model: 'Radeon RX 7900 XTX', price: 7999, specs: { vram: '24GB GDDR6' } },

    // Motherboards
    { category: 'mainboard', brand: 'ASUS', model: 'ROG MAXIMUS Z790 HERO', price: 4999, specs: { socket: 'LGA1700', chipset: 'Z790' } },
    { category: 'mainboard', brand: 'ASUS', model: 'ROG STRIX Z790-A GAMING WIFI', price: 2899, specs: { socket: 'LGA1700', chipset: 'Z790' } },
    { category: 'mainboard', brand: 'MSI', model: 'MPG Z790 CARBON WIFI', price: 2699, specs: { socket: 'LGA1700' } },
    { category: 'mainboard', brand: 'Gigabyte', model: 'Z790 AORUS ELITE AX', price: 1999, specs: { socket: 'LGA1700' } }
];

const insertHardware = db.prepare(`
    INSERT OR REPLACE INTO hardware (id, category, brand, model, price, status, specs, image, sortOrder, createdAt, isDiscount, isRecommended, isNew)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 0, 0, 0)
`);

const nowISO = new Date().toISOString();

hardware.forEach((item, index) => {
    insertHardware.run(
        crypto.randomUUID(),
        item.category,
        item.brand,
        item.model,
        item.price,
        JSON.stringify(item.specs),
        `https://placeholder.com/400x400?text=${encodeURIComponent(item.model)}`,
        index * 10,
        nowISO
    );
});

// 2. Used Items
const usedItems = [
    { type: 'official', category: 'gpu', brand: 'NVIDIA', model: 'RTX 3080 Ti FE', price: 3500, originalPrice: 8999, condition: '99新', description: '官方回收，成色极好，带原包装。', status: 'published' },
    { type: 'personal', category: 'cpu', brand: 'Intel', model: 'i7-12700K', price: 1200, originalPrice: 2800, condition: '95新', description: '个人自用升级换下，体质一般，默认使用正常。', status: 'published' }
];

const insertUsed = db.prepare(`
    INSERT OR REPLACE INTO used_items (id, type, category, brand, model, price, originalPrice, condition, description, status, createdAt, images, sellerId, sellerName, contact, inspectionReport)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

usedItems.forEach(item => {
    insertUsed.run(
        crypto.randomUUID(),
        item.type,
        item.category,
        item.brand,
        item.model,
        item.price,
        item.originalPrice,
        item.condition,
        item.description,
        item.status,
        nowISO,
        JSON.stringify(['https://placeholder.com/400x400']),
        'system',
        '小鱼自营',
        '13800138000',
        JSON.stringify({})
    );
});

// 3. Stats
const today = new Date().toISOString().split('T')[0];
db.prepare(`
    INSERT OR REPLACE INTO daily_stats (date, aiGenerations, newConfigs, newUsers)
    VALUES (?, ?, ?, ?)
`).run(today, 128, 45, 12);

console.log('✅ Seeding completed successfully!');
db.close();

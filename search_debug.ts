import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data/xiaoyu.db');

const db = new Database(dbPath);

console.log('Searching for items matching "MSI" or "迫击炮" in hardware table...');
try {
    const items = db.prepare('SELECT * FROM hardware WHERE model LIKE "%迫击炮%" OR brand LIKE "%MSI%"').all();
    console.log(JSON.stringify(items, null, 2));
} catch (e) {
    console.error('Query failed:', e.message);
}

db.close();

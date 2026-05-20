const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const DB = path.resolve('data/xiaoyu.db');
const OUT_DIR = path.resolve('product_images_test/pcdiy_downloads');
const MANIFEST = path.join(OUT_DIR, 'manifest.jsonl');
const LIMIT = Number(process.env.LIMIT || 0);

function rowsFromDb() {
  const sql = `
    SELECT id, category, brand, model, price
    FROM hardware
    WHERE category='cpu' AND (image IS NULL OR image='' OR image='null')
    ORDER BY sortOrder, brand, model
  `;
  const raw = execFileSync('sqlite3', ['-json', DB, sql], { encoding: 'utf8' });
  const rows = JSON.parse(raw || '[]');
  return LIMIT > 0 ? rows.slice(0, LIMIT) : rows;
}

function cleanModel(text) {
  return String(text || '')
    .replace(/散片|盒包|中文盒|盒|白色|黑色/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(values) {
  return [...new Set(values.filter(Boolean).map(v => v.trim()).filter(Boolean))];
}

function queriesFor(p) {
  const joined = cleanModel(`${p.brand} ${p.model}`);
  const model = cleanModel(p.model);
  const q = [];
  const cpu = joined.match(/\b(?:i[3579])[-\s]?(\d{4,5}[A-Z]{0,3})\b/i);
  if (cpu) {
    const bare = cpu[1].toUpperCase();
    q.push(bare);
    if (/EF$/.test(bare)) q.push(bare.replace(/EF$/, 'F'));
    q.push(joined.replace(/-/g, ' '), joined.replace(/-/g, ''));
  }
  const ultra = joined.match(/Ultra\s*([3579])\s*(\d{3,4}[A-Z]{0,3})(?:\s*PLUS)?/i);
  if (ultra) {
    q.push(`${ultra[2].toUpperCase()}${/PLUS/i.test(joined) ? ' Plus' : ''}`);
    q.push(`Ultra ${ultra[1]} ${ultra[2].toUpperCase()}${/PLUS/i.test(joined) ? ' Plus' : ''}`);
  }
  const plus = joined.match(/\b(\d{3,4}K)\s*PLUS\b/i);
  if (plus) q.push(`${plus[1].toUpperCase()} Plus`);
  const amd = joined.match(/\bR([3579])[-\s]?(\d{4,5}[A-Z0-9]*)\b/i);
  if (amd) q.push(amd[2].toUpperCase(), `Ryzen${amd[1]} ${amd[2].toUpperCase()}`, `R${amd[1]} ${amd[2].toUpperCase()}`);
  q.push(model.replace(/-/g, ' '), model.replace(/-/g, ''), joined.replace(/-/g, ' '));
  return uniq(q);
}

function normalize(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function extFromUrl(url) {
  const m = new URL(url).pathname.match(/\.(png|jpe?g|webp)$/i);
  return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

function safeName(text) {
  return normalize(text).slice(0, 64) || 'CPU';
}

function existingDone() {
  if (!fs.existsSync(MANIFEST)) return new Set();
  const done = new Set();
  for (const line of fs.readFileSync(MANIFEST, 'utf8').split(/\n+/)) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row.status === 'downloaded' && row.localFile && fs.existsSync(path.resolve(row.localFile))) done.add(row.id);
    } catch {}
  }
  return done;
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const products = rowsFromDb();
  const done = existingDone();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://pcdiy.top/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('input[placeholder="搜索配件名称"]', { timeout: 30000 });

  let ok = 0, skipped = 0, failed = 0;
  for (const p of products) {
    if (done.has(p.id)) {
      skipped++;
      continue;
    }
    const attempts = queriesFor(p);
    let result = null;

    for (const query of attempts) {
      const target = normalize(query.replace(/\s*Plus$/i, 'PLUS'));
      await page.locator('input[placeholder="搜索配件名称"]').fill(query);
      await page.locator('.el-input__suffix-inner svg').first().click();
      await page.waitForTimeout(1200);

      const cards = await page.$$eval('.goods_list > div', els => els.map((el, i) => {
        const img = el.querySelector('.img img, img');
        return { i, text: el.innerText || '', img: img ? img.src : '' };
      }));
      const match = cards.find(c => normalize(c.text).includes(target));
      if (!match) continue;

      await page.locator('.goods_list > div').nth(match.i).locator('.img').click();
      await page.waitForTimeout(900);
      const images = await page.$$eval('[role=dialog] img, .el-dialog img', imgs => imgs.map(img => ({
        src: img.currentSrc || img.src,
        width: img.naturalWidth,
        height: img.naturalHeight
      })).filter(x => x.src && x.width >= 300 && x.height >= 300));
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(250);
      if (images.length) {
        result = { query, title: match.text.split('\n')[0].trim(), url: images[0].src };
        break;
      }
    }

    if (!result) {
      failed++;
      fs.appendFileSync(MANIFEST, JSON.stringify({ ...p, attempts, status: 'no_match' }) + '\n');
      console.log(`NO ${p.model.trim()}`);
      continue;
    }

    const localRel = `product_images_test/pcdiy_downloads/${p.id}__${safeName(`${p.brand}-${cleanModel(p.model)}`)}${extFromUrl(result.url)}`;
    const res = await fetch(result.url);
    if (!res.ok) {
      failed++;
      fs.appendFileSync(MANIFEST, JSON.stringify({ ...p, attempts, query: result.query, pcdiyTitle: result.title, sourceUrl: result.url, status: `download_failed_${res.status}` }) + '\n');
      console.log(`FAIL ${p.model.trim()} ${res.status}`);
      continue;
    }
    fs.writeFileSync(path.resolve(localRel), Buffer.from(await res.arrayBuffer()));
    fs.appendFileSync(MANIFEST, JSON.stringify({ ...p, query: result.query, pcdiyTitle: result.title, sourceUrl: result.url, localFile: localRel, status: 'downloaded' }) + '\n');
    ok++;
    console.log(`OK ${p.model.trim()} <= ${result.query}`);
  }

  await browser.close();
  console.log(`SUMMARY ok=${ok} skipped=${skipped} failed=${failed} total=${products.length}`);
}

run().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});

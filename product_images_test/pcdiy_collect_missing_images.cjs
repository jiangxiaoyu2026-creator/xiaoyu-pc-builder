const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DB = path.resolve('data/xiaoyu.db');
const OUT_DIR = path.resolve('product_images_test/pcdiy_downloads');
const MANIFEST = path.join(OUT_DIR, 'manifest.jsonl');
const LIMIT = Number(process.env.LIMIT || 0);
const ONLY_CATEGORY = process.env.CATEGORY || '';
const RELAXED = process.env.RELAXED === '1';
const BASE = 'https://pcdiy.top';
const HEADERS = {
  'content-type': 'application/json',
  origin: BASE,
  referer: `${BASE}/`,
  'user-agent': 'Mozilla/5.0'
};

const CATEGORY_SOURCES = {
  cpu: [{ classify: 1, classify1: [0] }],
  mainboard: [{ classify: 2, classify1: [0] }],
  ram: [{ classify: 3, classify1: [0] }],
  gpu: [{ classify: 4, classify1: [0] }],
  disk: [{ classify: 5, classify1: [0] }],
  power: [{ classify: 6, classify1: [0] }],
  cooling: [{ classify: 7, classify1: [23, 24, 0] }],
  fan: [{ classify: 10, classify1: [25] }],
  case: [{ classify: 8, classify1: [0] }],
  monitor: [{ classify: 9, classify1: [0] }],
  keyboard: [{ classify: 32, classify1: [33, 37] }],
  mouse: [{ classify: 32, classify1: [34, 37] }],
  accessory: [
    { classify: 32, classify1: [35, 36, 37, 34, 33] },
    { classify: 10, classify1: [25, 26, 27, 28, 29, 30, 31] }
  ]
};

function decrypt(data) {
  const md5 = crypto.createHash('md5').update('liveiSYNHzN(3Z').digest('hex');
  const key = Buffer.from(md5.slice(16), 'utf8');
  const iv = Buffer.from(md5.slice(0, 16), 'utf8');
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  const text = Buffer.concat([decipher.update(data, 'base64'), decipher.final()]).toString('utf8');
  return JSON.parse(text);
}

async function goodsList(title, classify, classify1) {
  const body = {
    page: 1,
    limit: 12,
    title,
    classify,
    classify1,
    filters: {},
    zhuban_jiekou: '',
    zhuban_gongdian: '',
    cpu_jiekou: '',
    cpu_gongdian: '',
    zhuban_ddr: '',
    neicun_daishu: '',
    gonghao: 0,
    zhuban_banxing: '',
    zhuban_pinlv: ''
  };
  const res = await fetch(`${BASE}/api/goods/goodsList`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`goodsList ${res.status}`);
  const json = await res.json();
  if (json.code !== 1 || typeof json.data !== 'string') return { total: 0, list: [] };
  return decrypt(json.data);
}

function rowsFromDb() {
  const categorySql = ONLY_CATEGORY ? ` AND category='${ONLY_CATEGORY.replace(/'/g, "''")}'` : '';
  const sql = `
    SELECT id, category, brand, model, price
    FROM hardware
    WHERE (image IS NULL OR image='' OR image='null')${categorySql}
    ORDER BY category, sortOrder, brand, model
  `;
  const raw = execFileSync('sqlite3', ['-cmd', '.timeout 5000', '-json', DB, sql], { encoding: 'utf8' });
  const rows = JSON.parse(raw || '[]');
  return LIMIT > 0 ? rows.slice(0, LIMIT) : rows;
}

function normalize(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9\u4e00-\u9fa5]/g, '');
}

function latinNormalize(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function cleanModel(text) {
  return String(text || '')
    .replace(/二手|散片|盒包|中文盒|盒装|盒|白色|黑色|银色|金色|普通底座|京东/g, ' ')
    .replace(/[（）()【】,，/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(values) {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))];
}

function latinTokens(text) {
  return [...new Set(String(text || '').toUpperCase().match(/[A-Z]*\d[A-Z0-9-]*/g) || [])]
    .map(t => t.replace(/^-+|-+$/g, ''))
    .filter(t => t.length >= 3 && !/^\d{1,2}$/.test(t));
}

function chineseTokens(text) {
  return [...new Set(String(text || '').match(/[\u4e00-\u9fa5]{2,}/g) || [])]
    .filter(t => !['白色', '黑色', '银色', '金色', '灯条', '散片', '盒包', '电竞', '游戏', '无线', '有线'].includes(t));
}

function queriesFor(p) {
  const brand = cleanModel(p.brand);
  const model = cleanModel(p.model);
  const joined = cleanModel(`${brand} ${model}`);
  const q = [];

  const cpu = joined.match(/\b(?:i[3579])[-\s]?(\d{4,5}[A-Z]{0,3})\b/i);
  if (cpu) {
    const bare = cpu[1].toUpperCase();
    q.push(bare);
    if (/EF$/.test(bare)) q.push(bare.replace(/EF$/, 'F'));
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

  const lats = latinTokens(joined);
  if (lats.length) {
    q.push(`${brand} ${lats.slice(0, 3).join(' ')}`);
    q.push(lats.slice(0, 3).join(' '));
    for (const t of lats.slice(0, 4)) {
      q.push(t, t.replace(/-/g, ' '), t.replace(/-/g, ''));
      if (RELAXED && /[A-Z]$/.test(t) && /\d/.test(t.slice(0, -1))) q.push(t.slice(0, -1), t.slice(0, -1).replace(/-/g, ' '));
    }
  }
  const cnTokens = chineseTokens(model).slice(0, RELAXED ? 5 : 3);
  for (const t of cnTokens) q.push(`${brand} ${t}`, t);
  if (RELAXED) {
    for (const t of cnTokens) {
      const nums = model.match(/\d+/g) || [];
      for (const n of nums.slice(0, 2)) q.push(`${t}${n}`, `${t} ${n}`);
      if (/PRO/i.test(model)) q.push(`${t} PRO`, `${t}PRO`);
    }
    const rogFamilies = ['魔导士', '游侠2', '夜魔', '龙骑士', '果冻75', '影魔', '龙鳞', '月刃', '战刃', '斯巴达', '棱镜', '降临', '雷切', '卡尼克斯', '臻世', '破风', '创世'];
    for (const fam of rogFamilies) if (model.includes(fam)) q.push(fam, `ROG ${fam}`);
  }
  q.push(joined, model, joined.replace(/-/g, ' '), model.replace(/-/g, ' '));
  return uniq(q).filter(q => normalize(q).length >= 2);
}

function scoreCandidate(p, query, item) {
  const title = item.title || '';
  const titleN = normalize(title);
  const titleL = latinNormalize(title);
  const queryN = normalize(query);
  const queryL = latinNormalize(query);
  const model = cleanModel(p.model);
  const tokens = latinTokens(model);
  const cn = chineseTokens(model);
  let score = 0;

  if (queryL.length >= 3 && titleL.includes(queryL)) score += 4;
  if (queryN.length >= 4 && titleN.includes(queryN)) score += 3;
  for (const t of tokens) {
    const n = latinNormalize(t);
    if (n.length >= 3 && titleL.includes(n)) score += n.length >= 5 ? 4 : 2;
  }
  for (const t of cn) {
    if (t.length >= 2 && title.includes(t)) score += 2;
  }
  if (RELAXED) {
    const nums = String(model).match(/\d{3,4}/g) || [];
    for (const n of nums) if (title.includes(n)) score += 1;
    if (['keyboard', 'mouse', 'accessory'].includes(p.category) && /ROG/i.test(`${p.brand} ${p.model}`) && /ROG/i.test(title)) score += 2;
    if (p.category === 'fan' && cn.some(t => title.includes(t))) score += 2;
  }
  if (p.brand && titleN.includes(normalize(p.brand))) score += 1;
  return score;
}

function minScoreFor(p) {
  if (!RELAXED) return 4;
  if (['keyboard', 'mouse', 'accessory', 'ram', 'fan'].includes(p.category)) return 3;
  return 4;
}

function pickImage(item) {
  const imgs = [];
  if (item.son && item.son.img) imgs.push(...String(item.son.img).split(','));
  if (item.pic) imgs.push(item.pic);
  return imgs.find(u => /^https?:\/\//.test(u) && !/icon|logo|static\.pcdiy/i.test(u)) || '';
}

function extFromUrl(url, contentType = '') {
  const m = new URL(url).pathname.match(/\.(png|jpe?g|webp)$/i);
  if (m) return `.${m[1].toLowerCase().replace('jpeg', 'jpg')}`;
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  return '.jpg';
}

function safeName(p) {
  return latinNormalize(`${p.category}-${p.brand}-${cleanModel(p.model)}`).slice(0, 72) || p.category || 'product';
}

function existingDownloaded() {
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

function record(row) {
  fs.appendFileSync(MANIFEST, JSON.stringify(row) + '\n');
}

async function download(url, localBase) {
  const res = await fetch(url, { headers: { 'user-agent': HEADERS['user-agent'], referer: BASE } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get('content-type') || '';
  const ext = extFromUrl(url, type);
  const localRel = `${localBase}${ext}`;
  fs.writeFileSync(path.resolve(localRel), Buffer.from(await res.arrayBuffer()));
  return localRel;
}

function compressManifest() {
  if (!fs.existsSync(MANIFEST)) return;
  const latest = new Map();
  for (const line of fs.readFileSync(MANIFEST, 'utf8').split(/\n+/)) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      latest.set(row.id, row);
    } catch {}
  }
  fs.writeFileSync(MANIFEST, [...latest.values()].map(row => JSON.stringify(row)).join('\n') + '\n');
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const products = rowsFromDb();
  const done = existingDownloaded();
  const summary = {};
  let ok = 0, skipped = 0, failed = 0, processed = 0;

  for (const p of products) {
    processed++;
    summary[p.category] ||= { ok: 0, skipped: 0, failed: 0, total: 0 };
    summary[p.category].total++;
    if (done.has(p.id)) {
      skipped++;
      summary[p.category].skipped++;
      continue;
    }

    const sources = CATEGORY_SOURCES[p.category] || [];
    const attempts = [];
    let best = null;
    for (const query of queriesFor(p).slice(0, 10)) {
      for (const source of sources) {
        for (const classify1 of source.classify1) {
          attempts.push(`${query}@${source.classify}/${classify1}`);
          let data;
          try {
            data = await goodsList(query, source.classify, classify1);
          } catch {
            continue;
          }
          for (const item of data.list || []) {
            const image = pickImage(item);
            if (!image) continue;
            const score = scoreCandidate(p, query, item);
            if (score >= minScoreFor(p) && (!best || score > best.score)) best = { item, image, query, classify: source.classify, classify1, score };
          }
          if (best && best.score >= (RELAXED ? minScoreFor(p) + 2 : 6)) break;
          await new Promise(r => setTimeout(r, 80));
        }
        if (best && best.score >= (RELAXED ? minScoreFor(p) + 2 : 6)) break;
      }
      if (best && best.score >= (RELAXED ? minScoreFor(p) + 2 : 6)) break;
    }

    if (!best) {
      failed++;
      summary[p.category].failed++;
      record({ ...p, attempts, status: 'no_match' });
    } else {
      try {
        const localBase = `product_images_test/pcdiy_downloads/${p.id}__${safeName(p)}`;
        const localFile = await download(best.image, localBase);
        ok++;
        summary[p.category].ok++;
        record({
          ...p,
          query: best.query,
          pcdiyTitle: best.item.title,
          pcdiyId: best.item.id,
          classify: best.classify,
          classify1: best.classify1,
          matchScore: best.score,
          sourceUrl: best.image,
          localFile,
          status: 'downloaded'
        });
      } catch (err) {
        failed++;
        summary[p.category].failed++;
        record({ ...p, query: best.query, pcdiyTitle: best.item.title, sourceUrl: best.image, status: `download_failed:${err.message}` });
      }
    }

    if (processed % 25 === 0) console.log(`PROGRESS ${processed}/${products.length} ok=${ok} skipped=${skipped} failed=${failed}`);
  }

  compressManifest();
  console.log(JSON.stringify({ ok, skipped, failed, total: products.length, summary }, null, 2));
}

run().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});

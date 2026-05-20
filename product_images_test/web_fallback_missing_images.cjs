const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve('product_images_test/pcdiy_downloads');
const MANIFEST = path.join(OUT_DIR, 'manifest.jsonl');
const LIMIT = Number(process.env.LIMIT || 0);
const UA = 'Mozilla/5.0';

function latestRows() {
  const rows = fs.readFileSync(MANIFEST, 'utf8').trim().split(/\n/).filter(Boolean).map(JSON.parse);
  return [...new Map(rows.map(r => [r.id, r])).values()];
}

function normalize(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9\u4e00-\u9fa5]/g, '');
}

function latin(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function safeName(p) {
  return latin(`${p.category}-${p.brand}-${p.model}`).slice(0, 72) || p.category || 'product';
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function decodeDuck(url) {
  url = decodeHtml(url);
  if (url.startsWith('//')) url = `https:${url}`;
  const m = url.match(/[?&]uddg=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : url;
}

function extFrom(url, type = '') {
  const m = String(url).match(/\.(png|jpe?g|webp)(?:[?#]|$)/i);
  if (m) return `.${m[1].toLowerCase().replace('jpeg', 'jpg')}`;
  if (type.includes('png')) return '.png';
  if (type.includes('webp')) return '.webp';
  return '.jpg';
}

function absUrl(u, base) {
  try { return new URL(decodeHtml(u), base).href; } catch { return ''; }
}

async function searchLinks(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000) });
  const html = await res.text();
  return [...html.matchAll(/class="result__a" href="([^"]+)"/g)]
    .map(m => decodeDuck(m[1]))
    .filter(u => /^https?:\/\//.test(u))
    .slice(0, 8);
}

function priority(url) {
  const u = url.toLowerCase();
  if (u.includes('rog.asus') || u.includes('asus.com.cn') || u.includes('asus.com/')) return 10;
  if (u.includes('corsair') || u.includes('philips') || u.includes('aoc') || u.includes('hkc')) return 9;
  if (u.includes('jd.com') || u.includes('zol.com.cn')) return 8;
  if (u.includes('smzdm') || u.includes('ithome') || u.includes('zhihu')) return 3;
  return 1;
}

async function pageImages(pageUrl) {
  const res = await fetch(pageUrl, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000) });
  if (!res.ok || !String(res.headers.get('content-type') || '').includes('text/html')) return [];
  const html = await res.text();
  const out = [];
  const metaRe = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  const metaRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image|image)["'][^>]*>/gi;
  for (const re of [metaRe, metaRe2]) for (const m of html.matchAll(re)) out.push(absUrl(m[1], pageUrl));
  for (const m of html.matchAll(/"image"\s*:\s*"([^"]+)"/gi)) out.push(absUrl(m[1].replace(/\\\//g, '/'), pageUrl));
  for (const m of html.matchAll(/<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi)) out.push(absUrl(m[1], pageUrl));
  return [...new Set(out)].filter(u => /^https?:\/\//.test(u) && !/logo|icon|avatar|sprite|wechat|qrcode/i.test(u)).slice(0, 20);
}

async function downloadFirst(p, imageUrls, pageUrl) {
  for (const url of imageUrls.slice(0, 8)) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, referer: pageUrl }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const type = res.headers.get('content-type') || '';
      const buf = Buffer.from(await res.arrayBuffer());
      if (!type.includes('image') || buf.length < 5000) continue;
      const rel = `product_images_test/pcdiy_downloads/${p.id}__${safeName(p)}__web${extFrom(url, type)}`;
      fs.writeFileSync(path.resolve(rel), buf);
      return { localFile: rel, sourceUrl: url };
    } catch {}
  }
  return null;
}

function queriesFor(p) {
  const base = `${p.brand || ''} ${p.model || ''}`.trim();
  const q = [`${base} 产品图`, `${base} 图片`, `${base} product image`];
  const model = String(p.model || '');
  const aliases = {
    卡尼克斯: 'ROG Carnyx microphone',
    月石: 'ROG Moonstone Ace mouse pad',
    雷切: 'ROG Raikiri Pro controller',
    银翼: 'ROG Destrier gaming chair',
    龙驹: 'ROG Chariot gaming chair',
    追风王座: 'ROG Chariot gaming chair',
    龙鳞: 'ROG Harpe Ace mouse',
    月刃: 'ROG Keris mouse',
    斯巴达: 'ROG Spatha mouse',
    魔导士: 'ROG Falchion keyboard',
    游侠: 'ROG Strix Scope keyboard',
    龙骑士: 'ROG Claymore keyboard',
    夜魔: 'ROG Azoth keyboard',
    棱镜: 'ROG Delta headset',
    降临: 'ROG Cetra earbuds'
  };
  for (const [key, alias] of Object.entries(aliases)) if (model.includes(key)) q.push(alias, `${alias} product image`);
  return [...new Set(q.filter(x => normalize(x).length > 2))];
}

function compressManifest() {
  const latest = new Map();
  for (const line of fs.readFileSync(MANIFEST, 'utf8').split(/\n+/)) {
    if (!line.trim()) continue;
    try { const row = JSON.parse(line); latest.set(row.id, row); } catch {}
  }
  fs.writeFileSync(MANIFEST, [...latest.values()].map(r => JSON.stringify(r)).join('\n') + '\n');
}

async function run() {
  let targets = latestRows().filter(r => r.status !== 'downloaded');
  if (LIMIT > 0) targets = targets.slice(0, LIMIT);
  let ok = 0, failed = 0, processed = 0;
  for (const p of targets) {
    processed++;
    let done = null;
    const tried = [];
    for (const query of queriesFor(p)) {
      tried.push(query);
      let links = [];
      try { links = await searchLinks(query); } catch {}
      links = links.sort((a, b) => priority(b) - priority(a));
      for (const link of links.slice(0, 5)) {
        let imgs = [];
        try { imgs = await pageImages(link); } catch {}
        done = await downloadFirst(p, imgs, link);
        if (done) {
          fs.appendFileSync(MANIFEST, JSON.stringify({
            ...p,
            query,
            source: 'web_fallback',
            sourcePage: link,
            sourceUrl: done.sourceUrl,
            localFile: done.localFile,
            status: 'downloaded'
          }) + '\n');
          ok++;
          break;
        }
      }
      if (done) break;
      await new Promise(r => setTimeout(r, 300));
    }
    if (!done) {
      fs.appendFileSync(MANIFEST, JSON.stringify({ ...p, attempts: tried, status: 'no_match' }) + '\n');
      failed++;
    }
    if (processed % 10 === 0) console.log(`WEB ${processed}/${targets.length} ok=${ok} failed=${failed}`);
  }
  compressManifest();
  console.log(JSON.stringify({ ok, failed, total: targets.length }, null, 2));
}

run().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});

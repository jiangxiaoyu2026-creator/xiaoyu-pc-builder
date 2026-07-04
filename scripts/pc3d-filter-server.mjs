import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const mappingPath = path.join(publicDir, 'data/pc3d/product-model-mapping.json');
const decisionsPath = path.join(publicDir, 'data/pc3d/model-filter-decisions.json');
const filterHtmlPath = path.join(publicDir, 'pc3d/filter.html');
const dbPath = path.join(rootDir, 'data/xiaoyu.db');
const uploadDirs = [path.join(rootDir, 'uploads'), path.join(rootDir, 'server_py/uploads')];
const preferredPort = Number(process.env.PORT || 8787);
const execFileAsync = promisify(execFile);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function readMapping() {
  return readJson(mappingPath, null);
}

async function readDecisions() {
  return readJson(decisionsPath, { version: 1, updated_at: '', decisions: {} });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadProductImages() {
  if (!(await pathExists(dbPath))) return new Map();
  try {
    const { stdout } = await execFileAsync('sqlite3', [
      '-json',
      dbPath,
      "select id,image from hardware where image is not null and image != ''"
    ], { maxBuffer: 12 * 1024 * 1024 });
    const rows = stdout.trim() ? JSON.parse(stdout) : [];
    return new Map(rows.map((row) => [String(row.id), String(row.image || '')]));
  } catch (error) {
    console.warn('Failed to load product images from sqlite:', error?.message || error);
    return new Map();
  }
}

async function resolveProductImage(imageValue) {
  if (!imageValue) return { url: '', available: false };
  if (/^(data:|https?:\/\/)/i.test(imageValue)) return { url: imageValue, available: true };
  if (!imageValue.startsWith('/uploads/')) return { url: imageValue, available: true };
  const relativeName = imageValue.slice('/uploads/'.length);
  for (const dir of uploadDirs) {
    if (await pathExists(path.join(dir, relativeName))) return { url: imageValue, available: true };
  }
  return { url: imageValue, available: false };
}

async function decorateProducts(products) {
  const imageMap = await loadProductImages();
  return Promise.all((products || []).map(async (product) => {
    const image = await resolveProductImage(imageMap.get(product.product_id));
    return {
      ...product,
      product_image_url: image.url,
      product_image_available: image.available,
    };
  }));
}

function timestamp() {
  return new Date().toISOString();
}

function recalculateMapping(mapping) {
  const byMatchKind = {};
  const byCategoryMatch = {};
  const byAsset = {};
  const mappings = {};

  for (const product of mapping.products || []) {
    const kind = product.match_kind || 'none';
    byMatchKind[kind] = (byMatchKind[kind] || 0) + 1;
    byCategoryMatch[product.category] = byCategoryMatch[product.category] || {};
    byCategoryMatch[product.category][kind] = (byCategoryMatch[product.category][kind] || 0) + 1;
    if (product.asset_id) byAsset[product.asset_id] = (byAsset[product.asset_id] || 0) + 1;
    mappings[product.product_id] = {
      asset_id: product.asset_id || '',
      match_kind: kind,
      review_status: product.review_status || 'unmapped',
      confidence: product.confidence || 0,
      reason: product.reason || '',
      risk: product.risk || '',
    };
  }

  mapping.summary = {
    ...(mapping.summary || {}),
    total_products: (mapping.products || []).length,
    by_match_kind: byMatchKind,
    by_category_match: byCategoryMatch,
    by_asset: byAsset,
  };
  mapping.mappings = mappings;
  return mapping;
}

function markRejected(product) {
  const originalAssetLabel = product.asset_label || product.asset_source_name || '';
  return {
    ...product,
    asset_id: '',
    asset_label: '',
    asset_source_name: '',
    asset_model_url: '',
    match_kind: 'none',
    match_label: '已剔除',
    review_status: 'unmapped',
    confidence: 0,
    reason: `本地筛选已删除，不使用候选模型${originalAssetLabel ? `：${originalAssetLabel}` : ''}`,
    risk: '',
  };
}

function markApproved(product) {
  return {
    ...product,
    match_kind: 'exact',
    match_label: '手动可用',
    review_status: 'manual_approved',
    confidence: Math.max(Number(product.confidence || 0), 90),
    reason: product.reason?.startsWith('本地筛选标记可用')
      ? product.reason
      : `本地筛选标记可用：${product.reason || '人工确认此模型可用于该产品'}`,
  };
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function servePublicFile(res, urlPath) {
  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.resolve(publicDir, safePath.replace(/^\/+/, ''));
  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch (error) {
    if (error?.code === 'ENOENT') sendJson(res, 404, { error: 'Not found' });
    else throw error;
  }
}

async function serveUploadFile(res, urlPath) {
  const relativeName = path.normalize(decodeURIComponent(urlPath.slice('/uploads/'.length))).replace(/^(\.\.[/\\])+/, '');
  for (const dir of uploadDirs) {
    const filePath = path.resolve(dir, relativeName);
    if (!filePath.startsWith(dir)) continue;
    try {
      const data = await fs.readFile(filePath);
      res.writeHead(200, {
        'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
      return;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  sendJson(res, 404, { error: 'Upload not found' });
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/mapping') {
    const [mapping, decisions] = await Promise.all([readMapping(), readDecisions()]);
    const products = await decorateProducts(mapping.products || []);
    sendJson(res, 200, {
      generated_at: mapping.generated_at,
      policy: mapping.policy,
      summary: mapping.summary,
      assets: mapping.assets || [],
      products,
      decisions: decisions.decisions || {},
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/delete') {
    const body = await readRequestJson(req);
    const productId = String(body.product_id || '');
    if (!productId) {
      sendJson(res, 400, { error: '缺少 product_id' });
      return;
    }

    const [mapping, decisions] = await Promise.all([readMapping(), readDecisions()]);
    const productIndex = (mapping.products || []).findIndex((product) => product.product_id === productId);
    if (productIndex === -1) {
      sendJson(res, 404, { error: '找不到产品' });
      return;
    }
    const product = mapping.products[productIndex];
    if (product.match_kind === 'none' && !product.asset_id) {
      sendJson(res, 200, { ok: true, already_unmapped: true });
      return;
    }

    decisions.decisions = decisions.decisions || {};
    const previousDecision = decisions.decisions[productId];
    decisions.decisions[productId] = {
      action: 'rejected',
      product_id: product.product_id,
      category: product.category,
      category_label: product.category_label,
      brand: product.brand,
      model: product.model,
      asset_id: product.asset_id,
      asset_label: product.asset_label,
      match_kind: product.match_kind,
      review_status: product.review_status,
      confidence: product.confidence,
      reason: product.reason,
      risk: product.risk,
      decided_at: timestamp(),
      original: previousDecision?.original || product,
    };
    decisions.updated_at = timestamp();
    mapping.products[productIndex] = markRejected(product);
    recalculateMapping(mapping);

    await Promise.all([writeJson(mappingPath, mapping), writeJson(decisionsPath, decisions)]);
    sendJson(res, 200, { ok: true, product: mapping.products[productIndex] });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/approve') {
    const body = await readRequestJson(req);
    const productId = String(body.product_id || '');
    if (!productId) {
      sendJson(res, 400, { error: '缺少 product_id' });
      return;
    }

    const [mapping, decisions] = await Promise.all([readMapping(), readDecisions()]);
    const productIndex = (mapping.products || []).findIndex((product) => product.product_id === productId);
    if (productIndex === -1) {
      sendJson(res, 404, { error: '找不到产品' });
      return;
    }
    const product = mapping.products[productIndex];
    if (!product.asset_id) {
      sendJson(res, 400, { error: '这个产品没有候选模型，不能标记可用' });
      return;
    }
    if (product.review_status === 'manual_approved' || product.review_status === 'auto_exact') {
      sendJson(res, 200, { ok: true, already_approved: true, product });
      return;
    }

    decisions.decisions = decisions.decisions || {};
    if (!decisions.decisions[productId]) {
      decisions.decisions[productId] = {
        action: 'approved',
        product_id: product.product_id,
        category: product.category,
        category_label: product.category_label,
        brand: product.brand,
        model: product.model,
        asset_id: product.asset_id,
        asset_label: product.asset_label,
        match_kind: product.match_kind,
        review_status: product.review_status,
        confidence: product.confidence,
        reason: product.reason,
        risk: product.risk,
        decided_at: timestamp(),
        original: product,
      };
    }
    decisions.updated_at = timestamp();
    mapping.products[productIndex] = markApproved(product);
    recalculateMapping(mapping);

    await Promise.all([writeJson(mappingPath, mapping), writeJson(decisionsPath, decisions)]);
    sendJson(res, 200, { ok: true, product: mapping.products[productIndex] });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/restore') {
    const body = await readRequestJson(req);
    const productId = String(body.product_id || '');
    const [mapping, decisions] = await Promise.all([readMapping(), readDecisions()]);
    const decision = decisions.decisions?.[productId];
    if (!decision?.original) {
      sendJson(res, 404, { error: '找不到可恢复记录' });
      return;
    }
    const productIndex = (mapping.products || []).findIndex((product) => product.product_id === productId);
    if (productIndex === -1) {
      sendJson(res, 404, { error: '找不到产品' });
      return;
    }
    mapping.products[productIndex] = decision.original;
    delete decisions.decisions[productId];
    decisions.updated_at = timestamp();
    recalculateMapping(mapping);
    await Promise.all([writeJson(mappingPath, mapping), writeJson(decisionsPath, decisions)]);
    sendJson(res, 200, { ok: true, product: mapping.products[productIndex] });
    return;
  }

  sendJson(res, 404, { error: 'Unknown API' });
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url.pathname);
        return;
      }
      if (url.pathname.startsWith('/uploads/')) {
        await serveUploadFile(res, url.pathname);
        return;
      }
      if (url.pathname === '/' || url.pathname === '/filter.html' || url.pathname === '/pc3d/filter.html') {
        const data = await fs.readFile(filterHtmlPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(data);
        return;
      }
      await servePublicFile(res, url.pathname);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: error?.message || 'Internal error' });
    }
  });
}

async function listenWithFallback(port) {
  for (let candidate = port; candidate < port + 20; candidate += 1) {
    const server = createServer();
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(candidate, '127.0.0.1', resolve);
      });
      console.log(`PC3D filter server running at http://127.0.0.1:${candidate}/`);
      return;
    } catch (error) {
      if (error?.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(`No available port from ${port} to ${port + 19}`);
}

listenWithFallback(preferredPort).catch((error) => {
  console.error(error);
  process.exit(1);
});

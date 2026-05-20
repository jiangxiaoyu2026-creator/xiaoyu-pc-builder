#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = process.env.PCDIY_BASE || 'https://pcdiy.top';
const OUT_DIR = path.resolve('data/collected');
const LIMIT = 100;
const SCORE_CLASSIFY = new Set([1, 3, 4, 5]);

const SOURCES = [
  { category: 'cpu', classify: 1, classify1: 0 },
  { category: 'mainboard', classify: 2, classify1: 0 },
  { category: 'ram', classify: 3, classify1: 0 },
  { category: 'gpu', classify: 4, classify1: 0 },
  { category: 'disk', classify: 5, classify1: 0 },
  { category: 'power', classify: 6, classify1: 0 },
  { category: 'cooling', classify: 7, classify1: 0 },
  { category: 'case', classify: 8, classify1: 0 },
  { category: 'monitor', classify: 9, classify1: 0 },
  { category: 'accessory', classify: 10, classify1: 0 },
  { category: 'fan', classify: 10, classify1: 25 },
  { category: 'cable', classify: 10, classify1: 26 },
  { category: 'bracket', classify: 10, classify1: 27 },
  { category: 'extension_cable', classify: 10, classify1: 28 },
  { category: 'controller', classify: 10, classify1: 29 },
  { category: 'network_card', classify: 10, classify1: 30 },
  { category: 'thermal_paste', classify: 10, classify1: 31 },
  { category: 'keyboard', classify: 32, classify1: 33 },
  { category: 'mouse', classify: 32, classify1: 34 },
  { category: 'headset', classify: 32, classify1: 35 },
  { category: 'peripheral_combo', classify: 32, classify1: 37 },
];

const FIELD_LABELS = {
  1: { hexin: '核心', xiancheng: '线程', jiasu: '加速频率' },
  2: { xinpian: '芯片组', ddr: '内存类型', rgb: 'RGB', wifi: 'WiFi' },
  3: { rongliang: '容量', daishu: '代数', pinlv: '频率' },
  4: { xiancun: '显存', xclx: '显存类型', xcwk: '显存位宽' },
  5: { rongliang: '容量', dusu: '速度', jiekou: '接口' },
  6: { dygl: '电源功率', chicun: '尺寸', mozu: '模组' },
  7: { leixing: '类型', rgsl: '热管数量', dengxiao: '灯效', dyjk: '电源接口' },
  8: { tixing: '体型', yanse: '颜色', fsw: '风扇位' },
  9: { chicun: '尺寸', bili: '比例', shuaxin: '刷新率', fenbian: '分辨率' },
  33: { zhouti: '轴体', beiguang: '背光', lianjie: '连接' },
};

function decrypt(data) {
  const md5 = crypto.createHash('md5').update('liveiSYNHzN(3Z').digest('hex');
  const key = Buffer.from(md5.slice(16), 'utf8');
  const iv = Buffer.from(md5.slice(0, 16), 'utf8');
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  return JSON.parse(Buffer.concat([decipher.update(data, 'base64'), decipher.final()]).toString('utf8'));
}

async function goodsList(source, page) {
  const body = {
    page,
    limit: LIMIT,
    title: '',
    classify: source.classify,
    classify1: source.classify1,
    filters: {},
    zhuban_jiekou: '',
    zhuban_gongdian: '',
    cpu_jiekou: '',
    cpu_gongdian: '',
    zhuban_ddr: '',
    neicun_daishu: '',
    gonghao: 0,
    zhuban_banxing: '',
    zhuban_pinlv: '',
  };
  const res = await fetch(`${BASE}/api/goods/goodsList`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: BASE,
      referer: `${BASE}/`,
      'user-agent': 'Mozilla/5.0',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 1 || typeof json.data !== 'string') return { list: [], total: 0 };
  return decrypt(json.data);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : '';
}

function normalizeItem(item, source) {
  const params = item.son && typeof item.son === 'object' ? item.son : {};
  const labels = FIELD_LABELS[item.classify1] || FIELD_LABELS[item.classify] || {};
  return {
    id: item.id,
    gid: item.gid || '',
    sourceCategory: source.category,
    classify: item.classify,
    classify1: item.classify1,
    title: item.title || '',
    brand: params.pinpai || item.brand || '',
    price: num(item.price),
    originalPrice: num(item.orginal_price),
    power: num(item.gonglv),
    ludashiScore: num(item.paofen),
    image: item.pic || '',
    url: item.url || '',
    jdurl: item.jdurl || '',
    status: item.status ?? '',
    isStop: item.is_stop ?? '',
    params,
    paramLabels: labels,
    collectedFrom: `${BASE}/api/goods/goodsList`,
  };
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file, rows) {
  const headers = ['id', 'gid', 'sourceCategory', 'classify', 'classify1', 'title', 'brand', 'price', 'originalPrice', 'power', 'ludashiScore', 'image', 'url', 'jdurl', 'params_json'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(h === 'params_json' ? JSON.stringify(row.params) : row[h])).join(','));
  }
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const byId = new Map();
  const sourceStats = [];

  for (const source of SOURCES) {
    let page = 1;
    let total = 0;
    let count = 0;
    while (true) {
      const data = await goodsList(source, page);
      total = data.total || total;
      for (const item of data.list || []) byId.set(String(item.id), normalizeItem(item, source));
      count += (data.list || []).length;
      if (!data.list?.length || count >= total || data.list.length < LIMIT) break;
      page += 1;
    }
    sourceStats.push({ ...source, total, fetched: count });
    console.log(`${source.category}:${count}/${total}`);
  }

  const products = [...byId.values()].sort((a, b) => a.classify - b.classify || a.classify1 - b.classify1 || a.id - b.id);
  const scores = products.filter(p => SCORE_CLASSIFY.has(p.classify));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const payload = {
    source: BASE,
    collectedAt: new Date().toISOString(),
    productCount: products.length,
    scoreCount: scores.length,
    scoreFilledCount: scores.filter(p => p.ludashiScore).length,
    sourceStats,
    products,
    ludashiScores: scores,
  };

  const jsonFile = path.join(OUT_DIR, `pcdiy_products_specs_ludashi_${stamp}.json`);
  const productCsv = path.join(OUT_DIR, `pcdiy_product_specs_${stamp}.csv`);
  const scoreCsv = path.join(OUT_DIR, `pcdiy_ludashi_scores_${stamp}.csv`);
  fs.writeFileSync(jsonFile, JSON.stringify(payload, null, 2), 'utf8');
  writeCsv(productCsv, products);
  writeCsv(scoreCsv, scores);
  fs.copyFileSync(jsonFile, path.join(OUT_DIR, 'pcdiy_products_specs_ludashi_latest.json'));
  fs.copyFileSync(productCsv, path.join(OUT_DIR, 'pcdiy_product_specs_latest.csv'));
  fs.copyFileSync(scoreCsv, path.join(OUT_DIR, 'pcdiy_ludashi_scores_latest.csv'));

  console.log(JSON.stringify({ productCount: payload.productCount, scoreCount: payload.scoreCount, scoreFilledCount: payload.scoreFilledCount, jsonFile, productCsv, scoreCsv }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

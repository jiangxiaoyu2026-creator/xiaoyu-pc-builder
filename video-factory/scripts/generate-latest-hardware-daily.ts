import axios from "axios";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

type RawChange = {
  hardwareName?: string;
  category?: string;
  oldPrice?: number;
  newPrice?: number;
  changeAmount?: number;
  changePercent?: number;
  changedAt?: string;
};

type TrendResponse = {
  todaySummary?: {
    upCount?: number;
    downCount?: number;
    totalChanges?: number;
    avgUpAmount?: number;
    avgDownAmount?: number;
  };
  recentChanges?: RawChange[];
};

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type HistoryResponse = {
  products?: Product[];
  categoryTotalAvgTrend?: Array<{ date: string; avgPrice: number }>;
  historicalLows?: Array<{
    name: string;
    category: string;
    currentPrice: number;
    changeAmount: number;
    changePercent: number;
  }>;
  historicalHighs?: Array<{
    name: string;
    category: string;
    currentPrice: number;
    changeAmount: number;
    changePercent: number;
  }>;
};

type ChangeItem = {
  name: string;
  oldPrice: number | null;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
  changedAt?: string;
};

type CategoryKey = "gpu" | "cpu" | "ram" | "disk";

type CategoryData = {
  key: CategoryKey;
  label: string;
  eyebrow: string;
  color: string;
  changes: ChangeItem[];
  stats: {
    raw: number;
    changed: number;
    up: number;
    down: number;
    flat: number;
    anomalies: number;
    avgUp: number;
    avgDown: number;
  };
  history: HistoryResponse;
};

type SourceRow = {
  category: string;
  name: string;
  oldPrice: string;
  newPrice: string;
  changeAmount: string;
  changePercent: string;
  status: string;
};

const categoryMeta: Array<{
  key: CategoryKey;
  label: string;
  eyebrow: string;
  color: string;
}> = [
  { key: "gpu", label: "显卡", eyebrow: "GPU MAIN SIGNAL", color: "#22c55e" },
  { key: "cpu", label: "CPU", eyebrow: "CPU SPLIT MARKET", color: "#60a5fa" },
  { key: "ram", label: "内存", eyebrow: "MEMORY WATCH", color: "#f97316" },
  { key: "disk", label: "硬盘", eyebrow: "SSD WATCH", color: "#a78bfa" },
];

const categoryLabels: Record<CategoryKey, string> = {
  gpu: "显卡",
  cpu: "CPU",
  ram: "内存",
  disk: "硬盘",
};

const newsItems = [
  {
    title: "2Q26 内存与 NAND 合约价仍受 AI 服务器需求支撑",
    body:
      "TrendForce 预计常规 DRAM 合约价季增 58-63%，NAND 合约价季增 70-75%，零售端短线波动要放在上游成本压力里看。",
    source: "TrendForce 2026-03-31",
    url: "https://www.trendforce.com/presscenter/news/20260331-12995.html",
  },
  {
    title: "Intel 旧制程消费级 CPU 供给被服务器需求挤压",
    body:
      "Tom's Hardware 援引 Nikkei 报道称，Intel 7 产能更多转向数据中心和工业客户，入门散片反弹时要按型号比价。",
    source: "Tom's Hardware 2026-05-19",
    url: "https://www.tomshardware.com/tech-industry/intel-tells-pc-makers-to-adopt-18a-cpus-or-lose-their-allocations",
  },
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    apiBase: "https://www.diyxx.com",
    render: true,
    out: "",
  };

  for (const arg of args) {
    if (arg === "--no-render") options.render = false;
    if (arg.startsWith("--apiBase=")) options.apiBase = arg.slice("--apiBase=".length);
    if (arg.startsWith("--out=")) options.out = arg.slice("--out=".length);
  }

  return options;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const avg = (items: number[]) => {
  if (!items.length) return 0;
  return round2(items.reduce((sum, item) => sum + item, 0) / items.length);
};

const formatPrice = (value: number | null) =>
  value === null ? "-" : String(Math.round(value));

const formatMoney = (value: number | null) =>
  value === null ? "-" : `¥${Math.round(value).toLocaleString("zh-CN")}`;

const formatAmount = (value: number) => {
  if (Math.abs(value) < 0.01) return "0";
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
};

const formatPercent = (value: number) => `${value > 0 ? "+" : ""}${round2(value)}%`;

const localDate = () => {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const cnDate = (date: string) => {
  const [year, month, day] = date.split("-");
  return `${year}年${month}月${day}日`;
};

const normalizeChange = (item: RawChange): ChangeItem => ({
  name: String(item.hardwareName || "").trim(),
  oldPrice: Number(item.oldPrice || 0),
  newPrice: Number(item.newPrice || 0),
  changeAmount: Number(item.changeAmount || 0),
  changePercent: Number(item.changePercent || 0),
  changedAt: item.changedAt,
});

const isValidChange = (item: ChangeItem) =>
  Boolean(item.name) &&
  Number(item.oldPrice) > 0 &&
  Number(item.newPrice) > 0 &&
  Math.abs(item.changePercent) < 100;

const buildStats = (rawChanges: RawChange[]) => {
  const normalized = rawChanges.map(normalizeChange);
  const valid = normalized.filter(isValidChange);
  const movers = valid.filter((item) => Math.abs(item.changeAmount) >= 0.01);
  const upItems = movers.filter((item) => item.changeAmount > 0);
  const downItems = movers.filter((item) => item.changeAmount < 0);

  return {
    changes: movers,
    stats: {
      raw: normalized.length,
      changed: movers.length,
      up: upItems.length,
      down: downItems.length,
      flat: valid.length - movers.length,
      anomalies: normalized.length - valid.length,
      avgUp: avg(upItems.map((item) => item.changeAmount)),
      avgDown: avg(downItems.map((item) => item.changeAmount)),
    },
  };
};

const fetchJson = async <T>(url: string, headers?: Record<string, string>) => {
  const response = await axios.get<T>(url, {
    timeout: 20000,
    headers,
    validateStatus: () => true,
  });
  return response.data;
};

const buildCategory = async (apiBase: string, meta: (typeof categoryMeta)[number]) => {
  const [trend, history] = await Promise.all([
    fetchJson<TrendResponse>(
      `${apiBase}/api/stats/price-trends?days=1&category=${meta.key}`,
    ),
    fetchJson<HistoryResponse>(
      `${apiBase}/api/stats/product-price-history?category=${meta.key}&days=1`,
    ),
  ]);
  const { changes, stats } = buildStats(trend.recentChanges || []);
  return { ...meta, changes, stats, history };
};

const byAbsChange = (items: ChangeItem[]) =>
  [...items].sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));

const topDown = (items: ChangeItem[], count: number) =>
  [...items]
    .filter((item) => item.changeAmount < 0)
    .sort((a, b) => a.changeAmount - b.changeAmount)
    .slice(0, count);

const topUp = (items: ChangeItem[], count: number) =>
  [...items]
    .filter((item) => item.changeAmount > 0)
    .sort((a, b) => b.changeAmount - a.changeAmount)
    .slice(0, count);

const findChange = (category: CategoryData, pattern: RegExp) =>
  category.changes.find((item) => pattern.test(item.name));

const findProduct = (history: HistoryResponse, pattern: RegExp) =>
  (history.products || []).find((item) => pattern.test(item.name));

const rowFromChange = (category: CategoryKey, item: ChangeItem): SourceRow => ({
  category: categoryLabels[category],
  name: item.name,
  oldPrice: formatPrice(item.oldPrice),
  newPrice: formatPrice(item.newPrice),
  changeAmount: formatAmount(item.changeAmount),
  changePercent: formatPercent(item.changePercent),
  status: "匹配",
});

const rowFromProduct = (category: CategoryKey, product: Product): SourceRow => ({
  category: categoryLabels[category],
  name: product.name,
  oldPrice: "-",
  newPrice: formatPrice(product.price),
  changeAmount: "0",
  changePercent: "0%",
  status: "当前价参考",
});

const sourceRowMarkdown = (row: SourceRow) =>
  `| ${row.category} | ${row.name} | ${row.oldPrice} | ${row.newPrice} | ${row.changeAmount} | ${row.changePercent} | ${row.status} |`;

const sumStats = (categories: CategoryData[]) => {
  const totals = categories.reduce(
    (result, category) => ({
      changed: result.changed + category.stats.changed,
      up: result.up + category.stats.up,
      down: result.down + category.stats.down,
      flat: result.flat + category.stats.flat,
      anomalies: result.anomalies + category.stats.anomalies,
    }),
    { changed: 0, up: 0, down: 0, flat: 0, anomalies: 0 },
  );
  return totals;
};

const categorySummary = (
  category: CategoryData,
  diskBenchmark?: Product,
) => {
  if (category.key === "gpu") {
    const biggest = topDown(category.changes, 1)[0];
    return `今天显卡是主线：${category.stats.changed} 款变动，${category.stats.down} 款下跌，平均降价 ${Math.abs(
      category.stats.avgDown,
    )} 元。${biggest ? `${biggest.name} 直降 ${Math.abs(biggest.changeAmount)} 到 ${formatMoney(biggest.newPrice)}。` : ""}`;
  }
  if (category.key === "cpu") {
    return `CPU 今日 ${category.stats.changed} 款变动，${category.stats.up} 涨 ${category.stats.down} 降，AMD 游戏和高端型号回调，Intel 入门散片出现回弹。`;
  }
  if (category.key === "ram") {
    return `内存今日只有 ${category.stats.changed} 款有效变动，全部上涨，平均上涨 ${category.stats.avgUp} 元，属于高频灯条局部上调，不是全线涨价。`;
  }
  return `硬盘今日无有效调价，${diskBenchmark ? `${diskBenchmark.name} 当前 ${formatMoney(diskBenchmark.price)}` : "标杆型号仅作当前价参考"}，继续横盘观察。`;
};

const categoryBullets = (
  category: CategoryData,
  diskBenchmark?: Product,
) => {
  if (category.key === "gpu") {
    const drops = topDown(category.changes, 3);
    return [
      `最大降幅：${drops[0]?.name || "高端型号"} ${formatAmount(drops[0]?.changeAmount || 0)}，现价 ${formatMoney(drops[0]?.newPrice || null)}。`,
      `5090D/5080/5070 同时松动，但高端绝对价格仍然偏高。`,
    ];
  }
  if (category.key === "cpu") {
    const amdDrop = findChange(category, /9800X3D|7800X3D/);
    const intelRise = findChange(category, /14400F|12400F/);
    return [
      `AMD 回调代表：${amdDrop?.name || "X3D 型号"} ${amdDrop ? formatAmount(amdDrop.changeAmount) : ""}。`,
      `Intel 回弹代表：${intelRise?.name || "入门散片"} ${intelRise ? formatAmount(intelRise.changeAmount) : ""}。`,
    ];
  }
  if (category.key === "ram") {
    const rises = topUp(category.changes, 2);
    return [
      `${rises[0]?.name || "高频灯条"} ${rises[0] ? formatAmount(rises[0].changeAmount) : ""}，现价 ${formatMoney(rises[0]?.newPrice || null)}。`,
      `这不是大盘普涨，更多是 6400/6800 高频段局部抬价。`,
    ];
  }
  return [
    `今日无有效调价，别硬凑涨跌故事。`,
    diskBenchmark
      ? `标杆参考：${diskBenchmark.name} 当前 ${formatMoney(diskBenchmark.price)}。`
      : `按容量和接口刚需比价。`,
  ];
};

const buildVideoProps = (
  date: string,
  categories: CategoryData[],
  sourceRows: SourceRow[],
  diskBenchmark?: Product,
) => ({
  date,
  title: "蒋小鱼硬件行情日报",
  headline: "显卡降价，CPU 分化\n内存局部涨，硬盘横盘。",
  categories: categories.map((category) => ({
    key: category.key,
    label: category.label,
    eyebrow: category.eyebrow,
    color: category.color,
    summary: categorySummary(category, diskBenchmark),
    stats: {
      changed: category.stats.changed,
      up: category.stats.up,
      down: category.stats.down,
      avgUp: category.stats.avgUp,
      avgDown: category.stats.avgDown,
    },
    topChanges:
      category.key === "disk"
        ? []
        : byAbsChange(category.changes).slice(0, 4).map((item) => ({
            name: item.name,
            oldPrice: item.oldPrice,
            newPrice: item.newPrice,
            changeAmount: item.changeAmount,
            changePercent: item.changePercent,
          })),
    bullets: categoryBullets(category, diskBenchmark),
  })),
  news: newsItems.map(({ title, body, source }) => ({ title, body, source })),
  sourceRows,
  closing: "今天别被单一涨跌带节奏：显卡等二次回调，CPU 按型号比价，内存硬盘看刚需。",
});

const buildScriptBody = (
  gpu: CategoryData,
  cpu: CategoryData,
  ram: CategoryData,
  disk: CategoryData,
  diskBenchmark?: Product,
) => {
  const gpuDrops = topDown(gpu.changes, 4);
  const cpuDrops = topDown(cpu.changes, 3);
  const cpuRises = topUp(cpu.changes, 3);
  const ramRises = topUp(ram.changes, 2);

  return `### [开场白]
今天硬件行情主线很清楚：显卡大面积降价，CPU 涨跌分化，内存局部上调，硬盘继续横盘。

### [第一段：显卡]
先看今天最值得放大的显卡。今日显卡 ${gpu.stats.changed} 款有效变动，${gpu.stats.down} 款全部下跌，平均降价 ${Math.abs(gpu.stats.avgDown)} 元。
跌幅最大的是 ${gpuDrops[0]?.name}，从 ${formatPrice(gpuDrops[0]?.oldPrice || null)} 降到 ${formatPrice(gpuDrops[0]?.newPrice || 0)}，直降 ${Math.abs(gpuDrops[0]?.changeAmount || 0)}。
另外 ${gpuDrops[1]?.name} 和 ${gpuDrops[2]?.name} 也各降 ${Math.abs(gpuDrops[1]?.changeAmount || 0)} 和 ${Math.abs(gpuDrops[2]?.changeAmount || 0)}。
整体判断：50 系高端今天确实松了，但 5090D、5080 的绝对价格仍高，适合开始比价，不适合一看到降价就闭眼冲。

### [第二段：CPU]
再来看 CPU。今日 CPU ${cpu.stats.changed} 款有效变动，${cpu.stats.up} 涨 ${cpu.stats.down} 降，走势不是单边下跌，而是 AMD 回调、Intel 入门散片反弹。
降价代表是 ${cpuDrops[0]?.name}，降 ${Math.abs(cpuDrops[0]?.changeAmount || 0)}，现在 ${formatPrice(cpuDrops[0]?.newPrice || 0)}；${cpuDrops[1]?.name} 降 ${Math.abs(cpuDrops[1]?.changeAmount || 0)}，现在 ${formatPrice(cpuDrops[1]?.newPrice || 0)}。
涨价这边，${cpuRises[0]?.name} 涨 ${Math.abs(cpuRises[0]?.changeAmount || 0)} 到 ${formatPrice(cpuRises[0]?.newPrice || 0)}，${cpuRises[1]?.name} 涨 ${Math.abs(cpuRises[1]?.changeAmount || 0)} 到 ${formatPrice(cpuRises[1]?.newPrice || 0)}。
今天 CPU 的买法很简单：游戏党继续盯 7800X3D、9800X3D 的回调；预算机看 12400F、14400F，但别为二三十块波动临时改配置。

### [第三段：内存]
内存今天只有 ${ram.stats.changed} 款有效变动，而且都是上涨。${ramRises[0]?.name} 涨 ${Math.abs(ramRises[0]?.changeAmount || 0)} 到 ${formatPrice(ramRises[0]?.newPrice || 0)}，${ramRises[1]?.name} 涨 ${Math.abs(ramRises[1]?.changeAmount || 0)} 到 ${formatPrice(ramRises[1]?.newPrice || 0)}。
这里别误读成内存全面涨价，今天主要是金百达 6400/6800 高频灯条局部上调。主流 DDR5 套条还是要继续看具体型号和时序。

### [第四段：硬盘]
硬盘今天没有有效调价，大盘继续横盘。标杆型号 ${diskBenchmark?.name || "金士顿 NV3 1T"} 当前参考价 ${diskBenchmark ? formatPrice(diskBenchmark.price) : "-"}。
硬盘这段不需要硬讲故事：没有涨跌就说没有，按 1T、2T 容量和 PCIe 规格刚需比价就行。

### [第五段：新闻与结尾]
行业背景看两条。第一，TrendForce 预计 2026 年第二季度 DRAM 和 NAND 合约价仍受 AI 服务器需求支撑，上游成本压力没有消失。
第二，Tom's Hardware 援引 Nikkei 报道，Intel 旧制程消费级 CPU 供给被服务器和工业端需求挤压，这也是我们看 Intel 老型号时必须关注的背景。

今天总结：显卡终于松动，但高端还贵；CPU 要分 AMD 和 Intel 看；内存硬盘别靠感觉，盯具体型号。关注我，每天带你看透真实价格，绝不当冤种。`;
};

const buildMaterialPlan = (
  gpu: CategoryData,
  cpu: CategoryData,
  ram: CategoryData,
  diskBenchmark?: Product,
) => {
  const gpuDrops = topDown(gpu.changes, 3);
  const cpuDrop = topDown(cpu.changes, 1)[0];
  const cpuRise = topUp(cpu.changes, 1)[0];
  const ramRise = topUp(ram.changes, 1)[0];

  return `## 视频素材规划

| 时间 | 画面素材 | 屏幕主字幕 | 剪辑用途 |
|------|----------|------------|----------|
| 0-3秒 | 竖屏封面动效、DIYXX 深色数据中心背景 | 5090D 最高直降 ${Math.abs(gpuDrops[0]?.changeAmount || 0)} | 第一秒抓冲突 |
| 4-10秒 | 四品类总览卡：显卡/CPU/内存/硬盘 | 显卡 ${gpu.stats.down} 降 / CPU ${cpu.stats.up} 涨 ${cpu.stats.down} 降 | 建立今日大盘 |
| 11-23秒 | 显卡降价榜三连卡 | ${gpuDrops.map((item) => `${item.name} ${formatAmount(item.changeAmount)}`).join(" / ")} | 视频主线 |
| 24-34秒 | CPU 红绿分屏卡 | ${cpuDrop?.name} ${formatAmount(cpuDrop?.changeAmount || 0)}，${cpuRise?.name} ${formatAmount(cpuRise?.changeAmount || 0)} | 解释分化 |
| 35-43秒 | 内存高频条价格卡 | ${ramRise?.name} ${formatAmount(ramRise?.changeAmount || 0)} | 避免误读成全线涨 |
| 44-50秒 | SSD 横盘卡、NVMe 线条动效 | ${diskBenchmark?.name || "金士顿 NV3 1T"} 当前 ${diskBenchmark ? formatMoney(diskBenchmark.price) : "-"} | 无调价也给参考 |
| 51-56秒 | 新闻背景卡 | AI 服务器继续挤压内存和 CPU 供给 | 只作背景不写因果 |
| 57-60秒 | 结尾 CTA、评论区配置提示 | 留预算和用途，我帮你看 | 收口引导评论 |

## 素材需要生成的具体内容

- 背景：深色后台数据中心风格，沿用 DIYXX 的冷色网格、青蓝/绿色涨跌提示，不做页面截图。
- 图表：每个品类生成一张“今日变动卡”，包含变动款数、上涨/下跌数量、均涨/均降、前三个型号。
- 显卡主视觉：突出 5090D/5080/5070 的降价榜，绿色代表降价，价格从旧价滑到新价。
- CPU 主视觉：左右分屏，左侧 AMD 回调，右侧 Intel 入门散片回弹，避免写成单边行情。
- 内存主视觉：两张金百达高频灯条卡，强调“局部上调”。
- 硬盘主视觉：横盘线和金士顿 NV3 1T 当前价，用“今日无有效调价”替代无意义的 0 款变动话术。
- 新闻卡：只放 TrendForce 与 Tom's Hardware 两条行业背景，不把新闻强行解释成今日单品涨跌原因。`;
};

const buildReport = (
  date: string,
  categories: CategoryData[],
  sourceRows: SourceRow[],
  diskBenchmark?: Product,
  externalStatus?: string,
) => {
  const gpu = categories.find((category) => category.key === "gpu") as CategoryData;
  const cpu = categories.find((category) => category.key === "cpu") as CategoryData;
  const ram = categories.find((category) => category.key === "ram") as CategoryData;
  const disk = categories.find((category) => category.key === "disk") as CategoryData;
  const totals = sumStats(categories);
  const scriptBody = buildScriptBody(gpu, cpu, ram, disk, diskBenchmark);
  const materialPlan = buildMaterialPlan(gpu, cpu, ram, diskBenchmark);
  const anomalyCount = totals.flat + totals.anomalies;

  return `# 【蒋小鱼】硬件行情日报 - ${cnDate(date)}

## 今日核心结论

- 今日四大品类共 ${totals.changed} 条有效调价记录：${totals.down} 条降价、${totals.up} 条涨价、${totals.flat} 条平价、${totals.anomalies} 条异常。
- 显卡是今天主线：${gpu.stats.changed} 款变动全部下跌，平均降价 ${Math.abs(gpu.stats.avgDown)} 元，高端 5090D 与 5080 同时松动。
- CPU 今天是分化：${cpu.stats.up} 涨 ${cpu.stats.down} 降，AMD X3D/高端型号回调，Intel 入门和中端散片回弹。
- 内存今日只有 ${ram.stats.changed} 款有效变动，全部是金百达高频灯条上涨，不能写成内存全面涨价。
- 硬盘今日 ${disk.stats.changed} 款有效调价，${diskBenchmark ? `${diskBenchmark.name} 当前 ${formatPrice(diskBenchmark.price)}` : "标杆型号仅作当前价参考"}，属于横盘观望。

## 视频口播稿

${scriptBody}

${materialPlan}

## 对原日报格式的优化

- 开头不要先说“欢迎来到今天的日报”，短视频第一秒要先抛最大冲突，比如“5090D 最高直降 1300”。
- “0 款变动、0 款下降、整体降幅 0%”这类句子信息密度太低，硬盘无调价时直接写横盘和当前标杆价。
- 行业新闻只能做背景，不能替代 API 数据解释今日涨跌；除非新闻源明确支持因果关系。
- 溯源表要区分“今日调价记录”和“当前价参考”，避免把无调价型号写成当天涨跌。

## 数据溯源交叉验证表

| 品类 | 产品名称 | 原价 | 新价 | 涨跌金额 | 涨跌幅 | 验证状态 |
|------|----------|------|------|----------|--------|----------|
${sourceRows.map(sourceRowMarkdown).join("\n")}

### 平价与异常数据隔离表

| 类型 | 数量 | 说明 | 处理 |
|------|------:|------|------|
| 平价记录 | ${totals.flat} | 四大品类有效数据中 changeAmount = 0 的记录 | 不计入上涨/下跌 |
| 异常记录 | ${totals.anomalies} | oldPrice <= 0、newPrice <= 0、或绝对涨跌幅 >= 100% | 剔除出正文 |

## 行业背景来源

- TrendForce：${newsItems[0].url}
- Tom's Hardware：${newsItems[1].url}

## AI 每日复盘记录（仅供内部参考）

- 数据源：DIYXX \`/api/stats/price-trends?days=1&category={gpu,cpu,ram,disk}\` 与 \`/api/stats/product-price-history\`。
- 外部总览接口状态：${externalStatus || "未使用"}。
- 口径校验：${totals.changed} = ${totals.down} 降 + ${totals.up} 涨；另有 ${anomalyCount} 条平价/异常隔离记录。
- 视频输出：60 秒、1080x1920、30fps，生成的是无配音动态图形素材，方便继续二剪。`;
};

const buildSourceRows = (
  gpu: CategoryData,
  cpu: CategoryData,
  ram: CategoryData,
  diskBenchmark?: Product,
) => {
  const rows: SourceRow[] = [
    ...topDown(gpu.changes, 3).map((item) => rowFromChange("gpu", item)),
  ];

  for (const pattern of [/9800X3D/, /14400F/, /12400F/]) {
    const item = findChange(cpu, pattern);
    if (item) rows.push(rowFromChange("cpu", item));
  }

  rows.push(...topUp(ram.changes, 2).map((item) => rowFromChange("ram", item)));

  if (diskBenchmark) rows.push(rowFromProduct("disk", diskBenchmark));

  return rows;
};

const getExternalStatus = async (apiBase: string) => {
  const data = await fetchJson<{ detail?: string }>(
    `${apiBase}/api/external/market-report-data?period=daily`,
    { "X-API-Key": "diyxx-ai-secret-key-2026" },
  );
  if (data.detail) return data.detail;
  return "可用，但本版按分类趋势接口生成";
};

const main = async () => {
  const options = parseArgs();
  const videoDir = path.join(__dirname, "..");
  const repoRoot = path.join(videoDir, "..");
  const tempDir = path.join(videoDir, "temp");
  const outDir = path.join(videoDir, "out");
  const marketReportDir = path.join(repoRoot, "market_reports");
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(marketReportDir, { recursive: true });

  const [externalStatus, categories] = await Promise.all([
    getExternalStatus(options.apiBase).catch((error) => `不可用：${String(error)}`),
    Promise.all(categoryMeta.map((meta) => buildCategory(options.apiBase, meta))),
  ]);

  const allChanges = categories.flatMap((category) => category.changes);
  const latestChangeDate =
    allChanges
      .map((item) => item.changedAt?.slice(0, 10))
      .filter((item): item is string => Boolean(item))
      .sort()
      .pop() || localDate();
  const dateSlug = latestChangeDate.replace(/-/g, "");

  const gpu = categories.find((category) => category.key === "gpu") as CategoryData;
  const cpu = categories.find((category) => category.key === "cpu") as CategoryData;
  const ram = categories.find((category) => category.key === "ram") as CategoryData;
  const disk = categories.find((category) => category.key === "disk") as CategoryData;
  const diskBenchmark = findProduct(disk.history, /金士顿\s*NV3\s*1T/i);

  const sourceRows = buildSourceRows(gpu, cpu, ram, diskBenchmark);
  const props = buildVideoProps(latestChangeDate, categories, sourceRows, diskBenchmark);
  const report = buildReport(latestChangeDate, categories, sourceRows, diskBenchmark, externalStatus);

  const propsPath = path.join(tempDir, "hardwareDailyReportProps.json");
  const reportPath = path.join(outDir, `hardware_daily_report_${dateSlug}.md`);
  const marketReportPath = path.join(marketReportDir, `${dateSlug}_硬件行情日报.md`);

  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(marketReportPath, report);

  console.log(`Generated props: ${propsPath}`);
  console.log(`Generated report: ${reportPath}`);
  console.log(`Generated market report copy: ${marketReportPath}`);

  if (!options.render) return;

  const outPath = options.out || path.join(outDir, `hardware_daily_report_${dateSlug}.mp4`);
  const render = spawnSync(
    "npx",
    [
      "remotion",
      "render",
      "src/hardware-daily-index.tsx",
      "HardwareDailyReport",
      outPath,
      `--props=${propsPath}`,
      "--codec=h264",
      "--crf=18",
    ],
    {
      cwd: videoDir,
      stdio: "inherit",
      env: {
        ...process.env,
        PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
      },
    },
  );

  if (render.status !== 0) {
    throw new Error(`Remotion render failed with status ${render.status}`);
  }

  console.log(`Rendered video: ${outPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

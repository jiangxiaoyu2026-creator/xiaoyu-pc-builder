import axios from "axios";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

type ApiPoint = {
  date: string;
  price?: number;
  avgPrice?: number;
};

type ApiProductTrend = {
  hardwareId: string;
  name: string;
  points: Array<{ date: string; price: number }>;
};

type ApiProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type HistoryResponse = {
  productTrends?: ApiProductTrend[];
  categoryTotalAvgTrend?: ApiPoint[];
  products?: ApiProduct[];
};

type ReportItem = {
  id: string;
  name: string;
  currentPrice: number;
  startPrice: number;
  endPrice: number;
  changeAmount: number;
  changePercent: number;
  points: Array<{ date: string; price: number }>;
};

const categoryMeta = [
  { key: "cpu", label: "CPU", color: "#6366f1", accent: "#a5b4fc" },
  { key: "ram", label: "内存", color: "#06b6d4", accent: "#67e8f9" },
  { key: "disk", label: "硬盘", color: "#f59e0b", accent: "#fde68a" },
];

const categoryLabels: Record<string, string> = {
  cpu: "CPU",
  ram: "内存",
  disk: "硬盘",
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    apiBase: "http://127.0.0.1:8000",
    days: 30,
    render: true,
    out: "",
  };

  for (const arg of args) {
    if (arg.startsWith("--apiBase=")) options.apiBase = arg.slice("--apiBase=".length);
    if (arg.startsWith("--days=")) options.days = Number(arg.slice("--days=".length)) || 30;
    if (arg === "--no-render") options.render = false;
    if (arg.startsWith("--out=")) options.out = arg.slice("--out=".length);
  }

  return options;
};

const normalizePoints = (points: Array<{ date: string; price: number }>) =>
  points.map((point) => ({
    date: point.date,
    price: Math.round(Number(point.price) * 100) / 100,
  }));

const createFlatPoints = (dates: string[], price: number) =>
  dates.map((date) => ({
    date,
    price: Math.round(price * 100) / 100,
  }));

const changePercent = (start: number, end: number) =>
  start > 0 ? Math.round(((end - start) / start) * 10000) / 100 : 0;

const toReportItem = (trend: ApiProductTrend): ReportItem => {
  const points = normalizePoints(trend.points);
  const startPrice = points[0]?.price || 0;
  const endPrice = points[points.length - 1]?.price || startPrice;

  return {
    id: String(trend.hardwareId),
    name: trend.name,
    currentPrice: endPrice,
    startPrice,
    endPrice,
    changeAmount: Math.round((endPrice - startPrice) * 100) / 100,
    changePercent: changePercent(startPrice, endPrice),
    points,
  };
};

const uniqueProducts = (products: ApiProduct[]) => {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = product.name
      .replace(/散片|盒包|盒装|盒|散/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return product.price > 0;
  });
};

const scoreProduct = (category: string, name: string) => {
  const upper = name.toUpperCase();
  if (category === "cpu") {
    if (/12400F|13400F|14490F|14600K|7500F|7800X3D|9800X3D/.test(upper)) return 10;
    if (/I5|R5|R7/.test(upper)) return 7;
    return 1;
  }
  if (category === "ram") {
    if (/6000|6400|DDR5|16\*2|16G\*2|32G/.test(upper)) return 10;
    if (/3200|3600|DDR4/.test(upper)) return 7;
    return 1;
  }
  if (category === "disk") {
    if (/1T|1TB|2T|2TB|4T|4TB|990|9100|SN/.test(upper)) return 10;
    if (/SSD|NVME|固态/.test(upper)) return 7;
    return 1;
  }
  return 1;
};

const selectFallbackProducts = (category: string, products: ApiProduct[], dates: string[]) => {
  const ranked = uniqueProducts(products)
    .sort((a, b) => {
      const scoreDiff = scoreProduct(category, b.name) - scoreProduct(category, a.name);
      if (scoreDiff !== 0) return scoreDiff;
      return a.price - b.price;
    })
    .slice(0, 3);

  return ranked.map((product) => ({
    id: product.id,
    name: product.name,
    currentPrice: product.price,
    startPrice: product.price,
    endPrice: product.price,
    changeAmount: 0,
    changePercent: 0,
    points: createFlatPoints(dates, product.price),
  }));
};

const makeVerdict = (category: string, changeAmount: number, percent: number) => {
  const label = categoryLabels[category] || category;
  if (Math.abs(percent) < 0.3) {
    return `${label} 近 30 天整体横盘，适合按刚需比价，不需要因为短期波动急着下单。`;
  }
  if (percent < 0) {
    return `${label} 近 30 天均价回落 ${Math.abs(percent).toFixed(2)}%，可以优先关注已经接近低位的型号。`;
  }
  return `${label} 近 30 天均价上涨 ${percent.toFixed(2)}%，短期建议先比价观察，避免追在高点。`;
};

const buildCategory = async (apiBase: string, category: (typeof categoryMeta)[number], days: number) => {
  const url = `${apiBase}/api/stats/product-price-history?category=${category.key}&days=${days}`;
  const response = await axios.get<HistoryResponse>(url);
  const data = response.data;
  const avgTrend = data.categoryTotalAvgTrend || [];
  const dates = avgTrend.length
    ? avgTrend.map((point) => point.date)
    : Array.from({ length: days + 1 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - index));
        return date.toISOString().slice(0, 10);
      });

  const trendItems = (data.productTrends || [])
    .map(toReportItem)
    .filter((item) => item.points.length >= 2)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  const items =
    trendItems.length >= 3
      ? trendItems.slice(0, 3)
      : selectFallbackProducts(category.key, data.products || [], dates);

  const startAvg = Number(avgTrend[0]?.avgPrice || items[0]?.startPrice || 0);
  const endAvg = Number(avgTrend[avgTrend.length - 1]?.avgPrice || items[0]?.endPrice || startAvg);
  const changeAmount = Math.round((endAvg - startAvg) * 100) / 100;
  const percent = changePercent(startAvg, endAvg);

  return {
    ...category,
    summary: {
      startAvg,
      endAvg,
      changeAmount,
      changePercent: percent,
      verdict: makeVerdict(category.key, changeAmount, percent),
    },
    items,
  };
};

const main = async () => {
  const options = parseArgs();
  const tempDir = path.join(__dirname, "../temp");
  const outDir = path.join(__dirname, "../out");
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const categories = [];
  for (const category of categoryMeta) {
    categories.push(await buildCategory(options.apiBase, category, options.days));
  }

  const today = new Date().toISOString().slice(0, 10);
  const props = {
    date: today,
    days: options.days,
    title: "今日硬件行情",
    categories,
    closingNote:
      "这版样片按后台真实行情生成：CPU、内存、硬盘三大件整体偏稳，先看刚需型号和历史低位，不建议盲目追涨。",
  };

  const propsPath = path.join(tempDir, "dailyMarketReportProps.json");
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
  console.log(`Generated props: ${propsPath}`);

  if (!options.render) return;

  const outPath =
    options.out ||
    path.join(outDir, `daily_hardware_report_${today.replace(/-/g, "")}.mp4`);

  const render = spawnSync(
    "npx",
    [
      "remotion",
      "render",
      "src/daily-index.tsx",
      "DailyMarketReport",
      outPath,
      `--props=${propsPath}`,
      "--codec=h264",
      "--crf=18",
    ],
    {
      cwd: path.join(__dirname, ".."),
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

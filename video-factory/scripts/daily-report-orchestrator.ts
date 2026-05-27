import axios from "axios";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const TEMP_DIR = path.join(__dirname, "../temp");
const OUT_DIR = path.join(__dirname, "../out");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

interface ProductHistory {
  hardwareId: string;
  name: string;
  points: { date: string; price: number }[];
}

async function fetchProductHistory(
  hardwareId: string,
  days: number,
  category: string
): Promise<ProductHistory> {
  const url = `https://www.diyxx.com/api/stats/product-price-history?days=${days}&category=${category}&hardware_id=${hardwareId}`;
  const res = await axios.get(url);
  const trend = res.data.productTrends?.[0];
  if (!trend) throw new Error(`No data for hardwareId ${hardwareId}`);
  return {
    hardwareId: trend.hardwareId,
    name: trend.name,
    points: trend.points.map((p: any) => ({ date: p.date, price: p.price })),
  };
}

function makeSeries(
  hist: ProductHistory,
  label: string,
  color: string
) {
  const pts = hist.points;
  const start = pts[0].price;
  const end = pts[pts.length - 1].price;
  return {
    label,
    color,
    points: pts,
    startPrice: start,
    endPrice: end,
    change: end - start,
    changePct: start > 0 ? ((end - start) / start) * 100 : 0,
  };
}

async function main() {
  console.log("=> Building daily report video for 2026-05-26...\n");

  // ---- Fetch chart data ----
  console.log("=> Fetching price history data...");
  const [x3d9800, x3d7800, rtx5070, rtx5080] = await Promise.all([
    fetchProductHistory("c954ba64-e3bb-4282-8094-e040eef4428f", 60, "cpu"),
    fetchProductHistory("b69328c2-76e7-414d-9207-347a3cfa3caa", 60, "cpu"),
    fetchProductHistory("0db655d4-f9f9-4fdd-bed2-c55f8b02a1bb", 30, "gpu"),
    fetchProductHistory("a829aba2-a9c6-4bba-aa40-5f94a214d107", 30, "gpu"),
  ]);
  console.log("=> ✅ Data fetched\n");

  // ---- Assemble props ----
  const props = {
    date: "2026-05-26",

    ram: {
      directionLabel: "微涨",
      directionType: "up",
      totalChanged: 2,
      upCount: 2,
      downCount: 0,
      downProducts: [],
      upProducts: [
        { name: "金百达 白刃灯32G 6800 C32", change: 50, currentPrice: 2680 },
        { name: "金百达 黑刃灯16G 6400 C30", change: 30, currentPrice: 1400 },
      ],
      summary: "仅金百达高频灯条个别调整，主流DDR5-6000没有变动",
    },

    cpu: {
      directionLabel: "AMD降 / Intel涨",
      directionType: "mixed",
      totalChanged: 15,
      upCount: 9,
      downCount: 6,
      downProducts: [
        { name: "AMD 9800X3D 散片", change: -30, currentPrice: 2550, note: "游戏神U持续走低" },
        { name: "AMD 7800X3D 散片", change: -20, currentPrice: 1750, note: "上一代游戏天花板" },
        { name: "AMD 9850X3D 散片", change: -20, currentPrice: 2990 },
        { name: "AMD 9950X 散", change: -20, currentPrice: 2720 },
        { name: "AMD R5-9600X 散片", change: -15, currentPrice: 1035 },
        { name: "AMD R7-9700X 散", change: -10, currentPrice: 1390 },
      ],
      upProducts: [
        { name: "i5-14400F 散片", change: 25, currentPrice: 920 },
        { name: "i5-12400F 散片", change: 20, currentPrice: 820, note: "入门神U" },
        { name: "i7-12700KF 散片", change: 20, currentPrice: 1720 },
      ],
      compare: {
        title: "9800X3D vs 7800X3D 近60天对比",
        days: 60,
        series: [
          makeSeries(x3d9800, "9800X3D", "#6366f1"),
          makeSeries(x3d7800, "7800X3D", "#f59e0b"),
        ],
      },
      summary: "AMD X3D系列持续挤水分，Intel入门小幅修复，不影响配机选择",
    },

    disk: {
      directionLabel: "无变动",
      directionType: "flat",
      totalChanged: 0,
      upCount: 0,
      downCount: 0,
      downProducts: [],
      upProducts: [],
      summary: "按需购买即可",
    },

    gpu: {
      directionLabel: "技嘉全线降价",
      directionType: "down",
      totalChanged: 14,
      upCount: 0,
      downCount: 14,
      avgChange: -471,
      downProducts: [
        { name: "技嘉 RTX5090D 魔鹰 24G", change: -1300, currentPrice: 18300, note: "今日降幅王" },
        { name: "技嘉 RTX5090D 超级雕 24G", change: -1200, currentPrice: 20900 },
        { name: "技嘉 RTX5090D 超级雕白 24G", change: -1200, currentPrice: 21400 },
        { name: "技嘉 RTX5080 魔鹰 16G", change: -450, currentPrice: 9450 },
        { name: "技嘉 RTX5080 超级雕白 16G", change: -450, currentPrice: 10850 },
        { name: "技嘉 RTX5080 雪鹰 16G", change: -400, currentPrice: 9000 },
        { name: "技嘉 RTX5070 魔鹰 12G", change: -300, currentPrice: 5000 },
        { name: "技嘉 RTX5070 冰猎鹰 12G", change: -250, currentPrice: 4950 },
      ],
      upProducts: [],
      compare: {
        title: "RTX5070 vs RTX5080 魔鹰 近30天对比",
        days: 30,
        series: [
          makeSeries(rtx5070, "RTX5070 魔鹰", "#6366f1"),
          makeSeries(rtx5080, "RTX5080 魔鹰", "#f59e0b"),
        ],
      },
      summary: "技嘉从5090D到5070全线下调，5070猎鹰降到4850，5080风魔降到8850",
      warning: "目前只有技嘉一家在降，其他品牌暂未跟进，建议比价但先观望",
    },

    news: [
      {
        headline: "NVIDIA FY2027 Q1 财报",
        content:
          "季度营收816亿美元，数据中心营收752亿美元。消费级显卡被归入Edge Computing平台，行业主线是AI数据中心。",
        stat: "$816亿",
        statLabel: "季度营收",
      },
      {
        headline: "Intel 旧制程产能被挤压",
        content:
          "据Tom's Hardware援引日经报道，Intel旧制程消费级CPU产能正被服务器和工业端需求挤压，这是近期老型号散片价格波动的背景之一。",
      },
    ],
  };

  // ---- Write props ----
  const propsPath = path.join(TEMP_DIR, "dailyReportProps.json");
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
  console.log(`=> ✅ Props written to: ${propsPath}\n`);

  // ---- Render ----
  console.log("=> Starting Remotion render (DailyReport)...");
  const exportPath = path.join(OUT_DIR, "daily_report_20260526.mp4");
  const PATH_ENV = "/usr/local/bin:/opt/homebrew/bin:" + process.env.PATH;

  execSync(
    `npx remotion render src/index.ts DailyReport ${exportPath} --props=${propsPath}`,
    {
      stdio: "inherit",
      env: { ...process.env, PATH: PATH_ENV },
    }
  );

  console.log(`\n=> ✅ Daily report video generated at: ${exportPath}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

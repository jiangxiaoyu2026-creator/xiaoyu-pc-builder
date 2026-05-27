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

interface ProductConfig {
  hardwareId: string;
  label: string;
  color: string;
}

/**
 * 多产品对比视频 orchestrator
 *
 * Usage:
 *   npx ts-node scripts/compare-orchestrator.ts \
 *     --products='[{"hardwareId":"xxx","label":"9800X3D","color":"#6366f1"},{"hardwareId":"yyy","label":"7800X3D","color":"#f59e0b"}]' \
 *     --days=60 --category=cpu --title="9800X3D vs 7800X3D 60天价格对比"
 */
async function main() {
  const args = process.argv.slice(2);
  let productsJson = "";
  let days = 60;
  let category = "cpu";
  let titleOverride = "";

  for (const arg of args) {
    if (arg.startsWith("--products=")) productsJson = arg.slice("--products=".length);
    else if (arg.startsWith("--days=")) days = parseInt(arg.split("=")[1], 10) || 60;
    else if (arg.startsWith("--category=")) category = arg.split("=")[1];
    else if (arg.startsWith("--title=")) titleOverride = arg.slice("--title=".length);
  }

  const products: ProductConfig[] = JSON.parse(productsJson);
  console.log(`=> Compare orchestrator: ${products.length} products, ${days} days, category=${category}`);

  // Fetch data for each product
  const seriesData: any[] = [];

  for (const prod of products) {
    const url = `https://www.diyxx.com/api/stats/product-price-history?days=${days}&category=${category}&hardware_id=${prod.hardwareId}`;
    console.log(`=> Fetching: ${prod.label} (${url})`);
    const res = await axios.get(url);
    const trend = res.data.productTrends?.[0];
    if (!trend) {
      console.warn(`⚠️ No data for ${prod.label}, skipping`);
      continue;
    }

    const points = trend.points.map((p: any) => ({ date: p.date, price: p.price }));
    const startPrice = points[0]?.price || 0;
    const endPrice = points[points.length - 1]?.price || 0;
    const change = endPrice - startPrice;
    const changePct = startPrice > 0 ? (change / startPrice) * 100 : 0;

    seriesData.push({
      label: prod.label,
      color: prod.color,
      points,
      startPrice,
      endPrice,
      change,
      changePct,
    });
  }

  if (seriesData.length < 2) {
    throw new Error("Need at least 2 products with data for comparison");
  }

  const title = titleOverride || seriesData.map(s => s.label).join(" vs ") + ` ${days}天价格对比`;

  const inputProps = {
    compositionId: "CompareReport",
    title,
    subtitle: `近 ${days} 天价格走势对比 · DIYXX.COM`,
    days,
    series: seriesData,
  };

  const propsPath = path.join(TEMP_DIR, "compareProps.json");
  fs.writeFileSync(propsPath, JSON.stringify(inputProps, null, 2));
  console.log(`=> ✅ Generated props at: ${propsPath}`);

  console.log("=> Starting Remotion render...");
  const exportPath = path.join(OUT_DIR, "compare_video.mp4");
  const PATH_ENV = "/usr/local/bin:/opt/homebrew/bin:" + process.env.PATH;

  execSync(`npx remotion render src/index.ts CompareReport ${exportPath} --props=${propsPath}`, {
    stdio: "inherit",
    env: { ...process.env, PATH: PATH_ENV },
  });

  console.log(`=> ✅ Comparison video generated at: ${exportPath}`);
}

main().catch(err => { console.error("❌ Error:", err); process.exit(1); });

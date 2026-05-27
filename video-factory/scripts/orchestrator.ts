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

// Friendly display mapping for hardware categories
const categoryNames: Record<string, string> = {
  cpu: "CPU 处理器",
  gpu: "显卡",
  ram: "内存",
  disk: "硬盘",
  mainboard: "主板",
  psu: "电源",
  case: "机箱",
  cooler: "散热器",
  all: "全品类硬件",
};

async function main() {
  try {
    // 1. Parse command line arguments
    const args = process.argv.slice(2);
    let category = "gpu";
    let subcategory = "";
    let days = 30;
    let hardwareId = "";
    let titleOverride = "";

    for (const arg of args) {
      if (arg.startsWith("--category=")) {
        category = arg.split("=")[1];
      } else if (arg.startsWith("--subcategory=")) {
        subcategory = arg.split("=")[1];
      } else if (arg.startsWith("--days=")) {
        days = parseInt(arg.split("=")[1], 10) || 30;
      } else if (arg.startsWith("--hardwareId=")) {
        hardwareId = arg.split("=")[1];
      } else if (arg.startsWith("--title=")) {
        titleOverride = arg.split("=")[1];
      }
    }

    console.log(`=> Running orchestrator: category=${category}, subcategory=${subcategory || "none"}, days=${days}, hardwareId=${hardwareId || "none"}`);

    // 2. Fetch history and trends from backend APIs
    let historyUrl = `https://www.diyxx.com/api/stats/product-price-history?days=${days}`;
    if (category) historyUrl += `&category=${category}`;
    if (subcategory) historyUrl += `&subcategory=${encodeURIComponent(subcategory)}`;
    if (hardwareId) historyUrl += `&hardware_id=${hardwareId}`;

    let trendsUrl = `https://www.diyxx.com/api/stats/price-trends?days=${days}`;
    if (category) trendsUrl += `&category=${category}`;
    if (subcategory) trendsUrl += `&subcategory=${encodeURIComponent(subcategory)}`;

    console.log(`=> Fetching price history: ${historyUrl}`);
    const historyRes = await axios.get(historyUrl);
    const historyData = historyRes.data;

    console.log(`=> Fetching recent trends: ${trendsUrl}`);
    const trendsRes = await axios.get(trendsUrl);
    const trendsData = trendsRes.data;

    // 3. Assemble chart points and title info
    let chartData: { date: string; price: number }[] = [];
    let startPrice = 0;
    let endPrice = 0;
    let title = "";
    let subtitle = "";

    if (hardwareId && historyData.productTrends && historyData.productTrends.length > 0) {
      // Single product trend
      const trend = historyData.productTrends.find((t: any) => String(t.hardwareId) === String(hardwareId)) || historyData.productTrends[0];
      title = titleOverride || `${trend.name} 价格走势报告`;
      subtitle = `近 ${days} 天单品价格变动历史`;
      
      chartData = trend.points.map((p: any) => ({
        date: p.date,
        price: p.price,
      }));
    } else {
      // Category benchmark trend
      const catLabel = categoryNames[category] || category;
      const subLabel = subcategory ? ` (${subcategory})` : "";
      title = titleOverride || `DIYXX ${catLabel}${subLabel}价格走势报告`;
      subtitle = `近 ${days} 天类目基准均价走势`;

      if (historyData.categoryTotalAvgTrend && historyData.categoryTotalAvgTrend.length > 0) {
        chartData = historyData.categoryTotalAvgTrend.map((pt: any) => ({
          date: pt.date,
          price: pt.avgPrice,
        }));
      } else {
        console.warn("⚠️ Warning: No categoryTotalAvgTrend returned from server. Falling back to product averages.");
        // Fallback: aggregate product trends
        const dateMap: Record<string, { sum: number; count: number }> = {};
        if (historyData.productTrends) {
          for (const trend of historyData.productTrends) {
            for (const pt of trend.points) {
              if (!dateMap[pt.date]) dateMap[pt.date] = { sum: 0, count: 0 };
              dateMap[pt.date].sum += pt.price;
              dateMap[pt.date].count += 1;
            }
          }
        }
        chartData = Object.entries(dateMap).map(([date, val]) => ({
          date,
          price: Math.round((val.sum / val.count) * 100) / 100,
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    }

    if (chartData.length === 0) {
      throw new Error("No chart data points could be collected or fallback.");
    }

    // Compute stats
    startPrice = chartData[0].price;
    endPrice = chartData[chartData.length - 1].price;
    const priceChange = endPrice - startPrice;
    const priceChangePercent = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

    // Filter and map recent price adjustments
    const rawChanges = trendsData.recentChanges || [];
    const recentChanges = rawChanges
      .filter((c: any) => c.changeAmount !== 0)
      .slice(0, 3)
      .map((c: any) => ({
        hardwareName: c.hardwareName,
        category: c.category,
        oldPrice: c.oldPrice,
        newPrice: c.newPrice,
        changeAmount: c.changeAmount,
        changePercent: c.changePercent,
        changedAt: c.changedAt,
      }));

    // If API returned no recent changes, create dummy placeholders matching the category
    if (recentChanges.length === 0) {
      recentChanges.push({
        hardwareName: `基准产品价格核定调整`,
        category: category,
        oldPrice: Math.round(startPrice),
        newPrice: Math.round(endPrice),
        changeAmount: Math.round(priceChange),
        changePercent: parseFloat(priceChangePercent.toFixed(2)),
        changedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      });
    }

    // 4. Write inputProps.json
    const inputProps = {
      title,
      subtitle,
      chartData,
      recentChanges,
      category,
      days,
      priceChange,
      priceChangePercent,
      startPrice,
      endPrice,
    };

    const propsPath = path.join(TEMP_DIR, "inputProps.json");
    fs.writeFileSync(propsPath, JSON.stringify(inputProps, null, 2));
    console.log(`=> ✅ Generated props at: ${propsPath}`);

    // 5. Invoke Remotion render to build output video
    console.log("=> Starting Remotion render...");
    const exportPath = path.join(OUT_DIR, "final_video.mp4");
    const PATH_ENV = "/usr/local/bin:/opt/homebrew/bin:" + process.env.PATH;

    execSync(`npx remotion render src/index.ts MarketReport ${exportPath} --props=${propsPath}`, {
      stdio: "inherit",
      env: { ...process.env, PATH: PATH_ENV }
    });

    console.log(`=> ✅ Video successfully generated at: ${exportPath}`);

  } catch (error) {
    console.error("❌ Error running orchestrator:", error);
    process.exit(1);
  }
}

main();

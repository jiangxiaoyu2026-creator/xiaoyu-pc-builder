import axios from "axios";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const TEMP = path.join(__dirname, "../temp");
const OUT = path.join(__dirname, "../out");
const ASSEMBLY = path.join(TEMP, "assembly_v2");
const AUDIO = path.join(TEMP, "voiceover_v2.mp3");

fs.mkdirSync(ASSEMBLY, { recursive: true });

const PATH_ENV = "/usr/local/bin:/opt/homebrew/bin:" + process.env.PATH;

// ---- Helpers ----
async function fetchHistory(hardwareId: string, days: number, category: string) {
  const url = `https://www.diyxx.com/api/stats/product-price-history?days=${days}&category=${category}&hardware_id=${hardwareId}`;
  const res = await axios.get(url);
  const t = res.data.productTrends?.[0];
  if (!t) throw new Error(`No data for ${hardwareId}`);
  return { name: t.name, points: t.points.map((p: any) => ({ date: p.date, price: p.price })) };
}

function makeSeries(hist: any, label: string, color: string) {
  const pts = hist.points;
  const s = pts[0].price, e = pts[pts.length - 1].price;
  return { label, color, points: pts, startPrice: s, endPrice: e, change: e - s, changePct: s > 0 ? ((e - s) / s) * 100 : 0 };
}

function renderComp(compId: string, propsFile: string, outFile: string, extraArgs = "") {
  console.log(`  Rendering ${compId}...`);
  execSync(
    `npx remotion render src/index.ts ${compId} ${outFile} --props=${propsFile} ${extraArgs}`,
    { stdio: "pipe", env: { ...process.env, PATH: PATH_ENV } }
  );
  console.log(`  ✅ ${path.basename(outFile)}`);
}

async function main() {
  console.log("===== 日报视频 V2 — 全面升级 =====\n");

  // ---- Step 1: Fetch all needed data ----
  console.log("=> Fetching 7-day data...");
  const [
    ram_white, ram_black, // 金百达 白刃灯/黑刃灯 7天
    cpu_9800x3d_7d, cpu_7800x3d_7d, // X3D 7天
    cpu_14400f_7d, // i5-14400F 7天 (Intel代表)
  ] = await Promise.all([
    fetchHistory("4b06507c-e640-4533-aac4-910d2ca9cb99", 7, "ram"),  // 白刃灯32G 6800
    fetchHistory("872d9fb7-df67-4c38-87b5-c20d086317a1", 7, "ram"),  // 黑刃灯16G 6400
    fetchHistory("c954ba64-e3bb-4282-8094-e040eef4428f", 7, "cpu"),  // 9800X3D
    fetchHistory("b69328c2-76e7-414d-9207-347a3cfa3caa", 7, "cpu"),  // 7800X3D
    fetchHistory("5b398fb5-3310-4d0c-85ca-476d2be96822", 7, "cpu"),  // i5-14400F
  ]);
  console.log("=> ✅ All data fetched\n");

  // ---- Step 2: Render new video clips ----
  console.log("=> Rendering new video clips...\n");

  // 2a. Summary Table (5.5s = 330 frames)
  const summaryProps = {
    rows: [
      { icon: "💾", category: "内存", totalChanged: 2, downCount: 0, upCount: 2, label: "微涨", labelColor: "#e11d48" },
      { icon: "🔥", category: "CPU", totalChanged: 15, downCount: 6, upCount: 9, label: "分化", labelColor: "#6366f1" },
      { icon: "💿", category: "硬盘", totalChanged: 0, downCount: 0, upCount: 0, label: "无变动", labelColor: "#94a3b8" },
      { icon: "🎮", category: "显卡", totalChanged: 14, downCount: 14, upCount: 0, label: "全降", labelColor: "#059669" },
    ],
  };
  const summaryPropsFile = path.join(TEMP, "summaryProps.json");
  fs.writeFileSync(summaryPropsFile, JSON.stringify(summaryProps));
  renderComp("SummaryTable", summaryPropsFile, path.join(ASSEMBLY, "clip_summary.mp4"));

  // 2b. Memory: 金百达 两产品 7天对比
  const ramCompareProps = {
    title: "金百达 灯条 近7天价格对比",
    subtitle: "白刃灯 vs 黑刃灯",
    days: 7,
    series: [
      makeSeries(ram_white, "白刃灯32G 6800", "#6366f1"),
      makeSeries(ram_black, "黑刃灯16G 6400", "#f59e0b"),
    ],
  };
  const ramCompareFile = path.join(TEMP, "ramCompareProps.json");
  fs.writeFileSync(ramCompareFile, JSON.stringify(ramCompareProps));
  renderComp("CompareReport", ramCompareFile, path.join(ASSEMBLY, "clip_ram_compare.mp4"));

  // 2c. CPU: AMD(9800X3D) vs Intel(i5-14400F) 7天对比
  const cpuCategoryProps = {
    title: "AMD vs Intel 近7天走势",
    subtitle: "9800X3D vs i5-14400F 代表产品",
    days: 7,
    series: [
      makeSeries(cpu_9800x3d_7d, "AMD 9800X3D", "#e11d48"),
      makeSeries(cpu_14400f_7d, "Intel i5-14400F", "#3b82f6"),
    ],
  };
  const cpuCategoryFile = path.join(TEMP, "cpuCategoryProps.json");
  fs.writeFileSync(cpuCategoryFile, JSON.stringify(cpuCategoryProps));
  renderComp("CompareReport", cpuCategoryFile, path.join(ASSEMBLY, "clip_cpu_vs_intel.mp4"));

  // 2d. AMD Drop Table (8s = 480 frames)
  const amdDropProps = {
    products: [
      { name: "9800X3D 散片", change: -30, currentPrice: 2550 },
      { name: "7800X3D 散片", change: -20, currentPrice: 1750 },
      { name: "9850X3D 散片", change: -20, currentPrice: 2990 },
      { name: "9950X 散片", change: -20, currentPrice: 2720 },
      { name: "R5-9600X 散片", change: -15, currentPrice: 1035 },
      { name: "R7-9700X 散片", change: -10, currentPrice: 1390 },
    ],
  };
  const amdDropFile = path.join(TEMP, "amdDropProps.json");
  fs.writeFileSync(amdDropFile, JSON.stringify(amdDropProps));
  renderComp("AmdDropTable", amdDropFile, path.join(ASSEMBLY, "clip_amd_table.mp4"));

  // 2e. X3D 7天对比 (9800X3D vs 7800X3D)
  const x3dCompareProps = {
    title: "9800X3D vs 7800X3D 近7天对比",
    subtitle: "游戏级CPU价格走势",
    days: 7,
    series: [
      makeSeries(cpu_9800x3d_7d, "9800X3D", "#6366f1"),
      makeSeries(cpu_7800x3d_7d, "7800X3D", "#f59e0b"),
    ],
  };
  const x3dCompareFile = path.join(TEMP, "x3dCompare7dProps.json");
  fs.writeFileSync(x3dCompareFile, JSON.stringify(x3dCompareProps));
  renderComp("CompareReport", x3dCompareFile, path.join(ASSEMBLY, "clip_x3d_7d.mp4"));

  console.log("\n=> ✅ All clips rendered\n");

  // ---- Step 3: Build the final video ----
  console.log("=> Assembling final video...\n");

  // VTT-based timeline mapping (from voiceover_v2.vtt):
  // 0:00.0 - 0:02.7  "欢迎来到..." → existing opening (from daily_report)
  // 0:02.7 - 0:08.2  "今天内存微涨..." → Summary Table
  // 0:08.2 - 0:22.8  "先看内存...白刃灯...黑刃灯..." → RAM compare chart
  // 0:22.8 - 0:32.0  "主流DDR5...TrendForce..." → RAM compare (continued, freeze)
  // 0:32.0 - 0:37.8  "再看CPU...完全相反的方向" → AMD vs Intel chart
  // 0:37.8 - 0:54.0  "AMD全线回调...6款在降" → AMD drop table
  // 0:54.0 - 1:01.1  "Intel呢..." → existing i5 comparison
  // 1:01.1 - 1:04.3  "硬盘..." → existing disk slide
  // 1:04.3 - 1:31.8  GPU section → existing GPU clips (unchanged)
  // 1:31.8 - 1:46.3  News → existing news slides
  // 1:46.3 - 1:49.7  Closing → existing closing slide

  const DAILY = path.join(OUT, "daily_report_20260526.mp4");
  const segments: { file: string; duration: number }[] = [];

  function trim(src: string, out: string, start: number, duration: number) {
    execSync(`ffmpeg -y -ss ${start} -t ${duration} -i "${src}" -c:v libx264 -an -r 60 "${out}" 2>/dev/null`);
  }

  function trimFromStart(src: string, out: string, duration: number) {
    execSync(`ffmpeg -y -t ${duration} -i "${src}" -c:v libx264 -an -r 60 "${out}" 2>/dev/null`);
  }

  function freezeExtend(src: string, out: string, srcDur: number, totalDur: number) {
    // Use full source then freeze last frame for remaining time
    const freezeDur = totalDur - srcDur;
    if (freezeDur <= 0) {
      trimFromStart(src, out, totalDur);
      return;
    }
    const chartPart = path.join(ASSEMBLY, "tmp_chart.mp4");
    const stillPart = path.join(ASSEMBLY, "tmp_still.mp4");
    const framePng = path.join(ASSEMBLY, "tmp_frame.png");
    const concatFile = path.join(ASSEMBLY, "tmp_concat.txt");

    trimFromStart(src, chartPart, srcDur);
    execSync(`ffmpeg -y -sseof -0.1 -i "${src}" -frames:v 1 "${framePng}" 2>/dev/null`);
    execSync(`ffmpeg -y -loop 1 -i "${framePng}" -c:v libx264 -t ${freezeDur} -r 60 -pix_fmt yuv420p -vf "scale=1080:1920" "${stillPart}" 2>/dev/null`);
    fs.writeFileSync(concatFile, `file '${chartPart}'\nfile '${stillPart}'\n`);
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -r 60 "${out}" 2>/dev/null`);
  }

  // Segment 1: Opening (0 - 2.7s)
  const seg1 = path.join(ASSEMBLY, "seg01_opening.mp4");
  trim(DAILY, seg1, 0, 2.7);
  segments.push({ file: seg1, duration: 2.7 });
  console.log("  ✅ seg01 opening");

  // Segment 2: Summary table (2.7 - 8.2s = 5.5s)
  const seg2 = path.join(ASSEMBLY, "seg02_summary.mp4");
  trimFromStart(path.join(ASSEMBLY, "clip_summary.mp4"), seg2, 5.5);
  segments.push({ file: seg2, duration: 5.5 });
  console.log("  ✅ seg02 summary table");

  // Segment 3: Memory section (8.2 - 32.0s = 23.8s) → RAM compare chart (10s) + freeze
  const seg3 = path.join(ASSEMBLY, "seg03_ram.mp4");
  freezeExtend(path.join(ASSEMBLY, "clip_ram_compare.mp4"), seg3, 10, 23.8);
  segments.push({ file: seg3, duration: 23.8 });
  console.log("  ✅ seg03 memory");

  // Segment 4: CPU direction AMD vs Intel (32.0 - 37.8s = 5.8s)
  const seg4 = path.join(ASSEMBLY, "seg04_cpu_direction.mp4");
  trimFromStart(path.join(ASSEMBLY, "clip_cpu_vs_intel.mp4"), seg4, 5.8);
  segments.push({ file: seg4, duration: 5.8 });
  console.log("  ✅ seg04 AMD vs Intel");

  // Segment 5: AMD drop table (37.8 - 46.2s = 8.4s) → "AMD全线回调...9800X3D..."
  const seg5 = path.join(ASSEMBLY, "seg05_amd_table.mp4");
  trimFromStart(path.join(ASSEMBLY, "clip_amd_table.mp4"), seg5, 8.0);
  segments.push({ file: seg5, duration: 8.0 });
  console.log("  ✅ seg05 AMD table");

  // Segment 6: X3D 7-day comparison (46.2 - 54.0s = 7.8s) → "7800X3D也降到...6款在降"
  const seg6 = path.join(ASSEMBLY, "seg06_x3d.mp4");
  trimFromStart(path.join(ASSEMBLY, "clip_x3d_7d.mp4"), seg6, 8.2);
  segments.push({ file: seg6, duration: 8.2 });
  console.log("  ✅ seg06 X3D 7-day");

  // Segment 7: Intel (54.0 - 61.1s = 7.1s) → existing i5 comparison
  const seg7 = path.join(ASSEMBLY, "seg07_intel.mp4");
  trimFromStart(path.join(OUT, "08_i5-14400F_vs_i5-12400F_60天对比.mp4"), seg7, 7.2);
  segments.push({ file: seg7, duration: 7.2 });
  console.log("  ✅ seg07 Intel");

  // Segment 8: Disk (61.1 - 64.3s = 3.2s)
  const seg8 = path.join(ASSEMBLY, "seg08_disk.mp4");
  trim(DAILY, seg8, 47, 3.2);
  segments.push({ file: seg8, duration: 3.2 });
  console.log("  ✅ seg08 disk");

  // Segment 9: GPU intro + 5090D (64.3 - 77.7s = 13.4s)
  const seg9 = path.join(ASSEMBLY, "seg09_gpu1.mp4");
  freezeExtend(path.join(OUT, "04_RTX5090D_魔鹰_30天走势.mp4"), seg9, 10, 13.4);
  segments.push({ file: seg9, duration: 13.4 });
  console.log("  ✅ seg09 GPU 5090D");

  // Segment 10: GPU 5070 vs 5080 (77.7 - 83.9s = 6.2s)
  const seg10 = path.join(ASSEMBLY, "seg10_gpu2.mp4");
  trimFromStart(path.join(OUT, "06_RTX5070_vs_RTX5080_魔鹰_30天对比.mp4"), seg10, 6.2);
  segments.push({ file: seg10, duration: 6.2 });
  console.log("  ✅ seg10 GPU compare");

  // Segment 11: GPU warning (83.9 - 91.8s = 7.9s)
  const seg11 = path.join(ASSEMBLY, "seg11_gpu3.mp4");
  trimFromStart(path.join(OUT, "05_RTX5070_魔鹰_30天走势.mp4"), seg11, 7.9);
  segments.push({ file: seg11, duration: 7.9 });
  console.log("  ✅ seg11 GPU warning");

  // Segment 12: News (91.8 - 106.3s = 14.5s)
  const seg12 = path.join(ASSEMBLY, "seg12_news.mp4");
  trim(DAILY, seg12, 85, 14.5);
  segments.push({ file: seg12, duration: 14.5 });
  console.log("  ✅ seg12 news");

  // Segment 13: Closing (106.3 - 109.7s = 3.4s)
  const seg13 = path.join(ASSEMBLY, "seg13_closing.mp4");
  trim(DAILY, seg13, 98, 3.4);
  segments.push({ file: seg13, duration: 3.4 });
  console.log("  ✅ seg13 closing");

  // ---- Concatenate ----
  console.log("\n=> Concatenating...");
  const concatList = path.join(ASSEMBLY, "final_v2.txt");
  fs.writeFileSync(
    concatList,
    segments.map((s) => `file '${s.file}'`).join("\n") + "\n"
  );

  const videoNoAudio = path.join(ASSEMBLY, "video_no_audio_v2.mp4");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -r 60 "${videoNoAudio}" 2>/dev/null`
  );

  // ---- Merge audio ----
  console.log("=> Merging audio...");
  const finalPath = path.join(OUT, "daily_report_final_v2_20260526.mp4");
  execSync(
    `ffmpeg -y -i "${videoNoAudio}" -i "${AUDIO}" -c:v copy -c:a aac -b:a 192k -shortest "${finalPath}" 2>/dev/null`
  );

  // ---- Stats ----
  const probeOut = execSync(
    `ffprobe -v quiet -print_format json -show_format "${finalPath}"`,
    { encoding: "utf-8" }
  );
  const info = JSON.parse(probeOut).format;
  const dur = parseFloat(info.duration);
  const size = parseFloat(info.size) / 1024 / 1024;

  console.log(`\n===== ✅ DONE =====`);
  console.log(`Output: ${finalPath}`);
  console.log(`时长: ${Math.floor(dur / 60)}分${Math.round(dur % 60)}秒`);
  console.log(`大小: ${size.toFixed(1)}MB`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});

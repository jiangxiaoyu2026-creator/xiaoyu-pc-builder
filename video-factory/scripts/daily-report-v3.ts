import axios from "axios";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const TEMP = path.join(__dirname, "../temp");
const OUT = path.join(__dirname, "../out");
const ASM = path.join(TEMP, "assembly_v3");
const AUDIO = path.join(TEMP, "voiceover_v2.mp3");
const DAILY = path.join(OUT, "daily_report_20260526.mp4"); // existing Remotion render for title cards
const V2_CLIPS = path.join(TEMP, "assembly_v2"); // reuse V2's rendered clips

fs.mkdirSync(ASM, { recursive: true });

const PATH_ENV = "/usr/local/bin:/opt/homebrew/bin:" + process.env.PATH;

async function fetchHistory(hid: string, days: number, cat: string) {
  const url = `https://www.diyxx.com/api/stats/product-price-history?days=${days}&category=${cat}&hardware_id=${hid}`;
  const res = await axios.get(url);
  const t = res.data.productTrends?.[0];
  if (!t) throw new Error(`No data for ${hid}`);
  return { name: t.name, points: t.points.map((p: any) => ({ date: p.date, price: p.price })) };
}

function makeSeries(h: any, label: string, color: string) {
  const pts = h.points;
  const s = pts[0].price, e = pts[pts.length - 1].price;
  return { label, color, points: pts, startPrice: s, endPrice: e, change: e - s, changePct: s > 0 ? ((e - s) / s) * 100 : 0 };
}

function render(compId: string, propsFile: string, outFile: string) {
  console.log(`  Rendering ${compId}...`);
  execSync(`npx remotion render src/index.ts ${compId} ${outFile} --props=${propsFile}`, {
    stdio: "pipe", env: { ...process.env, PATH: PATH_ENV },
  });
  console.log(`  ✅ ${path.basename(outFile)}`);
}

function ff(cmd: string) { execSync(cmd, { stdio: "pipe" }); }

// Trim from beginning
function trimStart(src: string, out: string, dur: number) {
  ff(`ffmpeg -y -t ${dur} -i "${src}" -c:v libx264 -an -r 60 "${out}"`);
}
// Trim from offset
function trimAt(src: string, out: string, start: number, dur: number) {
  ff(`ffmpeg -y -ss ${start} -t ${dur} -i "${src}" -c:v libx264 -an -r 60 "${out}"`);
}
// Use full source video, then freeze last frame for remaining time
function freezeExtend(src: string, out: string, srcDur: number, totalDur: number) {
  if (totalDur <= srcDur) { trimStart(src, out, totalDur); return; }
  const extra = totalDur - srcDur;
  const a = path.join(ASM, "fe_a.mp4"), b = path.join(ASM, "fe_b.mp4"), f = path.join(ASM, "fe.png"), c = path.join(ASM, "fe.txt");
  trimStart(src, a, srcDur);
  ff(`ffmpeg -y -sseof -0.1 -i "${src}" -frames:v 1 "${f}"`);
  ff(`ffmpeg -y -loop 1 -i "${f}" -c:v libx264 -t ${extra} -r 60 -pix_fmt yuv420p -vf "scale=1080:1920" "${b}"`);
  fs.writeFileSync(c, `file '${a}'\nfile '${b}'\n`);
  ff(`ffmpeg -y -f concat -safe 0 -i "${c}" -c:v libx264 -r 60 "${out}"`);
}

async function main() {
  console.log("===== 日报视频 V3 — 音画精确对齐 =====\n");

  // ---- Fetch DDR5-6000 7-day data ----
  console.log("=> Fetching DDR5-6000 data...");
  const [ddr5_star, ddr5_silver] = await Promise.all([
    fetchHistory("65dc54f6-aa63-4d84-a214-cd7b6df44fe1", 7, "ram"), // 星刃黑 6000
    fetchHistory("e709b77c-649d-496c-a25c-ad7f39d15f81", 7, "ram"), // 银爵 6000
  ]);
  console.log("=> ✅ Data fetched\n");

  // ---- Render NEW clip: DDR5-6000 overall 7-day compare ----
  const ddr5Props = {
    title: "DDR5-6000 近7天走势",
    subtitle: "主流套条价格稳定",
    days: 7,
    series: [
      makeSeries(ddr5_star, "星刃黑 32G 6000", "#6366f1"),
      makeSeries(ddr5_silver, "银爵 32G 6000", "#f59e0b"),
    ],
  };
  const ddr5File = path.join(TEMP, "ddr5CompareProps.json");
  fs.writeFileSync(ddr5File, JSON.stringify(ddr5Props));
  render("CompareReport", ddr5File, path.join(ASM, "clip_ddr5.mp4"));

  // ---- Build all 16 segments based on VTT timestamps ----
  // VTT precise timestamps from voiceover_v2.vtt:
  //  1: 00:00.1-02.7  "欢迎来到..."
  //  2: 02.7-08.2     "今天内存微涨..."
  //  3: 08.2-09.6     "先看内存"
  //  4: 09.6-20.0     "金百达...白刃灯...黑刃灯..."
  //  5: 20.0-22.8     "主流DDR5没变动"
  //  6: 22.8-32.0     "TrendForce预测..."
  //  7: 32.0-33.7     "再看CPU"
  //  8: 33.7-37.8     "AMD和Intel完全相反"
  //  9: 37.8-46.2     "AMD全线回调...9800X3D..."
  // 10: 46.2-54.0     "7800X3D...6款在降"
  // 11: 54.0-61.1     "Intel呢..."
  // 12: 61.1-64.3     "硬盘零变动"
  // 13: 64.3-65.7     "重头戏来了"
  // 14: 65.7-71.9     "技嘉14款全降，平均471"
  // 15: 71.9-77.7     "5090D降1300到18300"
  // 16: 77.7-83.9     "5070降300，5080降450"
  // 17: 83.9-91.8     "只有技嘉在降...等等"
  // 18: 91.8-93.7     "最后两条行业背景"
  // 19: 93.7-99.9     "NVIDIA营收816亿"
  // 20: 99.9-106.3    "Intel旧制程..."
  // 21: 106.3-109.7   "关注我..."

  console.log("\n=> Building segments...");
  const segs: string[] = [];
  function addSeg(name: string, file: string) { segs.push(file); console.log(`  ✅ ${name} (${path.basename(file)})`); }

  // Reuse V2 clips where possible
  const V2 = V2_CLIPS;
  const ramCompare = path.join(V2, "clip_ram_compare.mp4");
  const cpuVsIntel = path.join(V2, "clip_cpu_vs_intel.mp4");
  const amdTable = path.join(V2, "clip_amd_table.mp4");
  const x3d7d = path.join(V2, "clip_x3d_7d.mp4");

  // SEG 1: Opening 0-2.7s (2.7s)
  const s1 = path.join(ASM, "s01_opening.mp4");
  trimAt(DAILY, s1, 0, 2.7);
  addSeg("Opening", s1);

  // SEG 2: Summary table 2.7-8.2s (5.5s)
  const s2 = path.join(ASM, "s02_summary.mp4");
  trimStart(path.join(V2, "clip_summary.mp4"), s2, 5.5);
  addSeg("Summary", s2);

  // SEG 3: Memory intro 8.2-9.6s (1.4s) — from daily_report RAM section intro (4-8s)
  const s3 = path.join(ASM, "s03_ram_intro.mp4");
  trimAt(DAILY, s3, 4, 1.4);
  addSeg("RAM intro", s3);

  // SEG 4: 金百达 compare 9.6-20.0s (10.4s)
  const s4 = path.join(ASM, "s04_ram_compare.mp4");
  freezeExtend(ramCompare, s4, 10, 10.4);
  addSeg("RAM compare", s4);

  // SEG 5: DDR5-6000 overall 20.0-32.0s (12.0s) ← NEW FIX
  const s5 = path.join(ASM, "s05_ddr5.mp4");
  freezeExtend(path.join(ASM, "clip_ddr5.mp4"), s5, 10, 12.0);
  addSeg("DDR5 overall", s5);

  // SEG 6: CPU AMD vs Intel 32.0-37.8s (5.8s)
  const s6 = path.join(ASM, "s06_cpu_vs.mp4");
  trimStart(cpuVsIntel, s6, 5.8);
  addSeg("CPU AMD vs Intel", s6);

  // SEG 7: AMD drop table 37.8-46.2s (8.4s)
  const s7 = path.join(ASM, "s07_amd_table.mp4");
  trimStart(amdTable, s7, 8.0);
  addSeg("AMD table", s7);

  // SEG 8: X3D 7-day compare 46.2-54.0s (7.8s)
  const s8 = path.join(ASM, "s08_x3d.mp4");
  trimStart(x3d7d, s8, 7.8);
  addSeg("X3D 7d", s8);

  // SEG 9: Intel i5 54.0-61.1s (7.1s)
  const s9 = path.join(ASM, "s09_intel.mp4");
  trimStart(path.join(OUT, "08_i5-14400F_vs_i5-12400F_60天对比.mp4"), s9, 7.1);
  addSeg("Intel", s9);

  // SEG 10: Disk 61.1-64.3s (3.2s)
  const s10 = path.join(ASM, "s10_disk.mp4");
  trimAt(DAILY, s10, 47, 3.2);
  addSeg("Disk", s10);

  // SEG 11: GPU intro "重头戏来了+技嘉14款" 64.3-71.9s (7.6s) ← FIX: use GPU section intro from daily_report
  const s11 = path.join(ASM, "s11_gpu_intro.mp4");
  trimAt(DAILY, s11, 53, 7.6);
  addSeg("GPU intro", s11);

  // SEG 12: 5090D chart 71.9-77.7s (5.8s)
  const s12 = path.join(ASM, "s12_5090d.mp4");
  trimStart(path.join(OUT, "04_RTX5090D_魔鹰_30天走势.mp4"), s12, 5.8);
  addSeg("5090D", s12);

  // SEG 13: 5070 vs 5080 77.7-83.9s (6.2s)
  const s13 = path.join(ASM, "s13_gpu_compare.mp4");
  trimStart(path.join(OUT, "06_RTX5070_vs_RTX5080_魔鹰_30天对比.mp4"), s13, 6.2);
  addSeg("5070vs5080", s13);

  // SEG 14: GPU warning 83.9-91.8s (7.9s)
  const s14 = path.join(ASM, "s14_gpu_warn.mp4");
  trimStart(path.join(OUT, "05_RTX5070_魔鹰_30天走势.mp4"), s14, 7.9);
  addSeg("GPU warning", s14);

  // SEG 15: News 91.8-106.3s (14.5s)
  const s15 = path.join(ASM, "s15_news.mp4");
  trimAt(DAILY, s15, 85, 14.5);
  addSeg("News", s15);

  // SEG 16: Closing 106.3-109.7s (3.4s)
  const s16 = path.join(ASM, "s16_closing.mp4");
  trimAt(DAILY, s16, 98, 3.4);
  addSeg("Closing", s16);

  // ---- Concatenate ----
  console.log("\n=> Concatenating 16 segments...");
  const concatFile = path.join(ASM, "concat_v3.txt");
  fs.writeFileSync(concatFile, segs.map(f => `file '${f}'`).join("\n") + "\n");
  const noAudio = path.join(ASM, "video_v3.mp4");
  ff(`ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -r 60 "${noAudio}"`);

  // ---- Merge audio ----
  console.log("=> Merging audio...");
  const final = path.join(OUT, "daily_report_final_v3_20260526.mp4");
  ff(`ffmpeg -y -i "${noAudio}" -i "${AUDIO}" -c:v copy -c:a aac -b:a 192k -shortest "${final}"`);

  // ---- Stats ----
  const info = JSON.parse(execSync(`ffprobe -v quiet -print_format json -show_format "${final}"`, { encoding: "utf-8" })).format;
  const dur = parseFloat(info.duration);
  const size = parseFloat(info.size) / 1024 / 1024;

  console.log(`\n===== ✅ V3 DONE =====`);
  console.log(`Output: ${final}`);
  console.log(`时长: ${Math.floor(dur / 60)}分${Math.round(dur % 60)}秒`);
  console.log(`大小: ${size.toFixed(1)}MB`);
  console.log(`\n音画对齐 16段:`);
  const labels = ["Opening","Summary","RAM intro","RAM 金百达","DDR5整体","CPU AMD/Intel","AMD降价表","X3D 7天","Intel i5","硬盘","GPU总览","5090D","5070vs5080","GPU观望","新闻","结尾"];
  let acc = 0;
  const durs = [2.7,5.5,1.4,10.4,12.0,5.8,8.0,7.8,7.1,3.2,7.6,5.8,6.2,7.9,14.5,3.4];
  labels.forEach((l, i) => {
    const m = Math.floor(acc/60), s2 = (acc%60).toFixed(1);
    console.log(`  ${String(i+1).padStart(2)}. ${m}:${s2.padStart(4,'0')} - ${l} (${durs[i]}s)`);
    acc += durs[i];
  });
}

main().catch(e => { console.error("❌", e.message || e); process.exit(1); });

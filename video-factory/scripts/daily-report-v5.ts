import axios from "axios";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const TEMP = path.join(__dirname, "../temp");
const OUT = path.join(__dirname, "../out");
const ASM = path.join(TEMP, "assembly_v5");
const AUDIO = path.join(TEMP, "voiceover_v2.mp3");
const DAILY = path.join(OUT, "daily_report_20260526.mp4");

fs.mkdirSync(ASM, { recursive: true });

const PATH_ENV = "/usr/local/bin:/opt/homebrew/bin:" + process.env.PATH;

async function fetchCat(days: number, cat: string) {
  const r = await axios.get(`https://www.diyxx.com/api/stats/product-price-history?days=${days}&category=${cat}`);
  return r.data.productTrends || [];
}

function render(compId: string, props: any, outFile: string) {
  const pf = path.join(ASM, `_props_${Date.now()}.json`);
  fs.writeFileSync(pf, JSON.stringify(props));
  console.log(`  Rendering ${compId}...`);
  execSync(`npx remotion render src/index.ts ${compId} ${outFile} --props=${pf}`, {
    stdio: "pipe", env: { ...process.env, PATH: PATH_ENV },
  });
  console.log(`  ✅ ${path.basename(outFile)}`);
}

function ff(cmd: string) { execSync(cmd, { stdio: "pipe" }); }
function trimS(src: string, out: string, dur: number) { ff(`ffmpeg -y -t ${dur} -i "${src}" -c:v libx264 -an -r 60 "${out}"`); }
function trimA(src: string, out: string, start: number, dur: number) { ff(`ffmpeg -y -ss ${start} -t ${dur} -i "${src}" -c:v libx264 -an -r 60 "${out}"`); }
function freeze(src: string, out: string, srcDur: number, totalDur: number) {
  if (totalDur <= srcDur) { trimS(src, out, totalDur); return; }
  const a = path.join(ASM, "_f_a.mp4"), b = path.join(ASM, "_f_b.mp4"), p = path.join(ASM, "_f.png"), c = path.join(ASM, "_f.txt");
  trimS(src, a, srcDur);
  ff(`ffmpeg -y -sseof -0.1 -i "${src}" -frames:v 1 "${p}"`);
  ff(`ffmpeg -y -loop 1 -i "${p}" -c:v libx264 -t ${totalDur - srcDur} -r 60 -pix_fmt yuv420p -vf "scale=1080:1920" "${b}"`);
  fs.writeFileSync(c, `file '${a}'\nfile '${b}'\n`);
  ff(`ffmpeg -y -f concat -safe 0 -i "${c}" -c:v libx264 -r 60 "${out}"`);
}

async function main() {
  console.log("===== 日报视频 V5.2 — 选框移动+统一列+居中修复 =====\n");

  // ---- Fetch ALL data ----
  console.log("=> Fetching data...");
  const [ram7d, ram30d, cpu7d, cpu30d, disk7d, disk30d, gpu7d, gpu30d] = await Promise.all([
    fetchCat(7, "ram"), fetchCat(30, "ram"),
    fetchCat(7, "cpu"), fetchCat(30, "cpu"),
    fetchCat(7, "disk"), fetchCat(30, "disk"),
    fetchCat(7, "gpu"), fetchCat(30, "gpu"),
  ]);

  // Count products & weekly changes for summary subtitle
  const allProducts = [...ram7d, ...cpu7d, ...disk7d, ...gpu7d];
  const weeklyChanged = allProducts.filter((t: any) => {
    const pts = t.points || [];
    return pts.length >= 2 && pts[pts.length - 1].price !== pts[0].price;
  });
  const subtitle = `本周监测 ${allProducts.length} 个产品 · ${weeklyChanged.length} 个价格波动`;
  console.log(`  ${subtitle}`);

  const find = (arr: any[], substr: string) => arr.find((t: any) => t.name.includes(substr));
  const lastP = (t: any) => t?.points?.slice(-1)[0]?.price || 0;
  const firstP = (t: any) => t?.points?.[0]?.price || 0;
  const chg = (t: any) => lastP(t) - firstP(t);
  const pctF = (t: any) => firstP(t) > 0 ? ((lastP(t) - firstP(t)) / firstP(t)) * 100 : 0;

  console.log("\n=> Rendering clips...\n");

  // CLIP 1: Summary table with product count
  render("SummaryTable", {
    subtitle,
    rows: [
      { icon: "🧠", category: "内存", totalChanged: 2, downCount: 0, upCount: 2, label: "微涨", labelColor: "#e11d48" },
      { icon: "💻", category: "CPU", totalChanged: 9, downCount: 6, upCount: 3, label: "分化", labelColor: "#6366f1" },
      { icon: "💾", category: "硬盘", totalChanged: 0, downCount: 0, upCount: 0, label: "平稳", labelColor: "#94a3b8" },
      { icon: "🎮", category: "显卡", totalChanged: 14, downCount: 14, upCount: 0, label: "全降", labelColor: "#059669" },
    ],
  }, path.join(ASM, "c_summary.mp4"));

  // CLIP 2: MemoryProductCards
  render("MemoryCards", {
    products: [
      { name: "金百达 白刃灯", spec: "32G(16G×2) DDR5-6800 C32", currentPrice: 2680, change: 50, badge: "高频灯条" },
      { name: "金百达 黑刃灯", spec: "16G DDR5-6400 C30", currentPrice: 1400, change: 30, badge: "高频灯条" },
    ],
  }, path.join(ASM, "c_mem_cards.mp4"));

  // CLIP 3: CombinedMemory (DDR5表格居中 + TrendForce下方)
  const ddr5Products = ["星刃黑32G（16G*2）6000", "银爵32G（16G*2）6000", "白刃灯32G（16G*2）6000", "星刃白32G（16G*2）6000", "黑刃灯32G（16G*2）6000"];
  const ddr5Rows = ddr5Products.map(name => {
    const t7 = find(ram7d, name.replace("（", "(").slice(0, 8)) || find(ram7d, name.slice(0, 6));
    const t30 = find(ram30d, name.replace("（", "(").slice(0, 8)) || find(ram30d, name.slice(0, 6));
    return {
      name: (t7?.name || t30?.name || name).replace("金百达 ", ""),
      price: lastP(t7) || lastP(t30),
      change7d: t7 ? chg(t7) : 0, pct7d: t7 ? +pctF(t7).toFixed(1) : 0,
      change30d: t30 ? chg(t30) : 0, pct30d: t30 ? +pctF(t30).toFixed(1) : 0,
    };
  }).filter(r => r.price > 0);

  render("CombinedMemory", {
    ddr5Rows,
    source: "TrendForce", prediction: "Q2 2026 常规 DRAM 合约价", changeRange: "+58%~63%",
    contextLines: ["上游成本压力没有消失", "零售端仍在消化前期降价红利", "短期内终端价格不会大幅波动"],
  }, path.join(ASM, "c_combined_mem.mp4"));

  // CLIP 4: CPU Split Grid (AMD vs Intel — 含价格+30天)
  const amdProducts = [
    { n: "9800X3D", sub: "9800X3D" }, { n: "7800X3D", sub: "7800X3D" },
    { n: "9850X3D", sub: "9850X3D" }, { n: "9950X", sub: "9950X散" },
    { n: "R5-9600X", sub: "9600X" }, { n: "R7-9700X", sub: "9700X" },
  ];
  const intelProducts = [
    { n: "i5-14400F", sub: "14400F" }, { n: "i5-12400F", sub: "12400F" },
    { n: "i5-12400", sub: "i5-12400散" },
  ];
  const todayAmd: Record<string, number> = { "9800X3D": -30, "7800X3D": -20, "9850X3D": -20, "9950X散": -20, "9600X": -15, "9700X": -10 };
  const todayIntel: Record<string, number> = { "14400F": 25, "12400F": 15, "i5-12400散": 10 };

  const splitAmd = amdProducts.map(p => {
    const t7 = find(cpu7d, p.sub), t30 = find(cpu30d, p.sub);
    return { name: p.n, price: lastP(t7), todayChange: todayAmd[p.sub] || -15, change7d: t7 ? chg(t7) : 0, price7d: t7 ? firstP(t7) : 0, change30d: t30 ? chg(t30) : 0, price30d: t30 ? firstP(t30) : 0 };
  }).filter(r => r.price > 0);
  const splitIntel = intelProducts.map(p => {
    const t7 = find(cpu7d, p.sub), t30 = find(cpu30d, p.sub);
    return { name: p.n, price: lastP(t7), todayChange: todayIntel[p.sub] || 10, change7d: t7 ? chg(t7) : 0, price7d: t7 ? firstP(t7) : 0, change30d: t30 ? chg(t30) : 0, price30d: t30 ? firstP(t30) : 0 };
  }).filter(r => r.price > 0);

  render("SplitGrid", {
    topSection: { title: "AMD · 全线回调 ↓", color: "#e11d48", rows: splitAmd },
    bottomSection: { title: "Intel · 小幅回弹 ↑", color: "#3b82f6", rows: splitIntel },
  }, path.join(ASM, "c_cpu_split.mp4"));

  // CLIP 5: AMD Flow Highlight (连续选框: row0→row1, 统一列)
  const amdFlowRows = amdProducts.map(p => {
    const t7 = find(cpu7d, p.sub), t30 = find(cpu30d, p.sub);
    return {
      name: p.n, price: lastP(t7), todayChange: todayAmd[p.sub] || -15,
      change7d: t7 ? chg(t7) : 0, price7d: t7 ? firstP(t7) : 0,
      change30d: t30 ? chg(t30) : 0, price30d: t30 ? firstP(t30) : 0,
    };
  }).filter(r => r.price > 0);

  render("AmdFlowHighlight", {
    title: "AMD 今日降价详情",
    titleBadge: { text: "6款全降", color: "#059669" },
    rows: amdFlowRows,
    switchFrame: 504, // 8.4s = 504f 时选框从9800X3D移到7800X3D
  }, path.join(ASM, "c_amd_flow.mp4"));

  // CLIP 6: Intel table (统一列: price, change, 7d, 30d)
  const intelDetailRows = intelProducts.map(p => {
    const t7 = find(cpu7d, p.sub), t30 = find(cpu30d, p.sub);
    return {
      name: p.n, price: lastP(t7), todayChange: todayIntel[p.sub] || 10,
      change7d: t7 ? chg(t7) : 0, pct7d: t7 ? +pctF(t7).toFixed(1) : 0,
      change30d: t30 ? chg(t30) : 0, pct30d: t30 ? +pctF(t30).toFixed(1) : 0,
    };
  }).filter(r => r.price > 0);

  render("PriceGrid", {
    title: "Intel 今日小幅回弹",
    titleBadge: { text: "正常修复", color: "#3b82f6" },
    rows: intelDetailRows,
    columns: ["price", "change", "7d", "30d"],
    note: "涨幅 5~25 元 · 属于正常波动 · 不影响配机",
  }, path.join(ASM, "c_intel.mp4"));

  // CLIP 7: Disk table (统一列: price, change, 7d, 30d)
  const diskNames = ["金士顿 NV3 1T", "金士顿 NV3 2T", "三星 990PRO 1TB", "三星 990PRO 4TB", "三星 990EVO", "宏碁 GM9000"];
  const diskRows = diskNames.map(n => {
    const t7 = find(disk7d, n.slice(0, 6)), t30 = find(disk30d, n.slice(0, 6));
    if (!t7 && !t30) return null;
    return {
      name: (t7?.name || t30?.name || n).replace(/\s+/g, " ").slice(0, 22),
      price: lastP(t7) || lastP(t30), todayChange: 0,
      change7d: t7 ? chg(t7) : 0, pct7d: t7 ? +pctF(t7).toFixed(1) : 0,
      change30d: t30 ? chg(t30) : 0, pct30d: t30 ? +pctF(t30).toFixed(1) : 0,
    };
  }).filter(Boolean);

  render("PriceGrid", {
    title: "硬盘 · 今日价格",
    titleBadge: { text: "零变动", color: "#94a3b8" },
    rows: diskRows,
    columns: ["price", "change", "7d", "30d"],
    note: "今日无变动 · 按需购买",
  }, path.join(ASM, "c_disk.mp4"));

  // CLIP 8: GPU overview table (统一列: price, change, 7d, 30d)
  const gpuSearch = [
    { n: "5090D GAMING", today: -1300 }, { n: "5090D AORUS 24G超级雕白", today: -500 },
    { n: "5080 GAMING", today: -450 }, { n: "5080 AERO", today: -300 },
    { n: "5070 GAMING", today: -300 }, { n: "5070 EAGLE OC", today: -200 }, { n: "5070 EAGLE ICE", today: -200 },
  ];
  const gpuRows = gpuSearch.map(g => {
    const key = g.n.replace("5090D", "RTX5090D").replace("5080", "RTX5080").replace("5070", "RTX5070");
    const t7 = find(gpu7d, key), t30 = find(gpu30d, key);
    if (!t7 && !t30) return null;
    return {
      name: "技嘉 " + ((t7?.name || t30?.name || g.n).replace("技嘉 ", "").slice(0, 24)),
      price: lastP(t7) || lastP(t30), todayChange: g.today,
      change7d: t7 ? chg(t7) : 0, pct7d: t7 ? +pctF(t7).toFixed(1) : 0,
      change30d: t30 ? chg(t30) : 0, pct30d: t30 ? +pctF(t30).toFixed(1) : 0,
    };
  }).filter(Boolean);

  render("PriceGrid", {
    title: "技嘉显卡 · 今日全线降价",
    titleBadge: { text: "14款降价", color: "#059669" },
    rows: gpuRows,
    columns: ["price", "change", "7d", "30d"],
    note: "平均降幅 ¥471",
  }, path.join(ASM, "c_gpu_table.mp4"));

  // CLIP 9: GPU 5090D (统一列)
  const g5090_7 = find(gpu7d, "5090D GAMING"), g5090_30 = find(gpu30d, "5090D GAMING");
  render("PriceGrid", {
    title: "RTX 5090D 魔鹰",
    titleBadge: { text: "降 ¥1,300", color: "#059669" },
    rows: [{
      name: "RTX5090D 魔鹰", price: 18300, todayChange: -1300,
      change7d: g5090_7 ? chg(g5090_7) : -1300, pct7d: g5090_7 ? +pctF(g5090_7).toFixed(1) : -6.6,
      change30d: g5090_30 ? chg(g5090_30) : 0, pct30d: g5090_30 ? +pctF(g5090_30).toFixed(1) : 0,
    }],
    columns: ["price", "change", "7d", "30d"],
    highlightRow: 0, highlightField: "price",
  }, path.join(ASM, "c_gpu_5090d.mp4"));

  // CLIP 10: GPU 5070 vs 5080 (统一列)
  const g70_7 = find(gpu7d, "5070 GAMING"), g70_30 = find(gpu30d, "5070 GAMING");
  const g80_7 = find(gpu7d, "5080 GAMING"), g80_30 = find(gpu30d, "5080 GAMING");
  render("PriceGrid", {
    title: "RTX 5070 & 5080 魔鹰",
    rows: [
      { name: "RTX5070 魔鹰", price: 5000, todayChange: -300, change7d: g70_7 ? chg(g70_7) : -300, change30d: g70_30 ? chg(g70_30) : 0 },
      { name: "RTX5080 魔鹰", price: 9450, todayChange: -450, change7d: g80_7 ? chg(g80_7) : -450, change30d: g80_30 ? chg(g80_30) : 0 },
    ],
    columns: ["price", "change", "7d", "30d"],
  }, path.join(ASM, "c_gpu_5070_5080.mp4"));

  // CLIP 11: GPU warning
  render("InfoWarning", {
    title: "显卡购买建议", icon: "⚠️",
    points: ["目前仅技嘉一家全线降价", "其他品牌（微星、华硕等）暂未跟进", "预计后续其他品牌可能会跟进降价"],
    advice: "可以开始比价，但建议等等其他品牌动作",
  }, path.join(ASM, "c_gpu_warn.mp4"));

  console.log("\n=> ✅ All clips rendered\n");

  // ---- Build segments ----
  console.log("=> Building segments...\n");
  const segs: { name: string; file: string; dur: number }[] = [];
  const add = (name: string, file: string, dur: number) => { segs.push({ name, file, dur }); console.log(`  ✅ ${name} (${dur}s)`); };

  // S1: Opening (2.7s)
  const s1 = path.join(ASM, "s01.mp4"); trimA(DAILY, s1, 0, 2.7); add("开场", s1, 2.7);

  // S2: Summary with product count (5.5s)
  const s2 = path.join(ASM, "s02.mp4"); trimS(path.join(ASM, "c_summary.mp4"), s2, 5.5); add("总览表", s2, 5.5);

  // S3: RAM intro (1.4s)
  const s3 = path.join(ASM, "s03.mp4"); trimA(DAILY, s3, 4, 1.4); add("内存intro", s3, 1.4);

  // S4: Memory cards (10.4s)
  const s4 = path.join(ASM, "s04.mp4"); freeze(path.join(ASM, "c_mem_cards.mp4"), s4, 10.5, 10.4); add("内存产品卡片", s4, 10.4);

  // S5: DDR5表格+TrendForce合一 (12.0s)
  const s5 = path.join(ASM, "s05.mp4"); trimS(path.join(ASM, "c_combined_mem.mp4"), s5, 12.0); add("DDR5+上游", s5, 12.0);

  // S6: CPU Split (5.8s)
  const s6 = path.join(ASM, "s06.mp4"); trimS(path.join(ASM, "c_cpu_split.mp4"), s6, 5.8); add("CPU分化对比", s6, 5.8);

  // S7: ★ AMD Flow Highlight (16.2s = 8.4+7.8, 选框从9800X3D移到7800X3D)
  const s7 = path.join(ASM, "s07.mp4"); trimS(path.join(ASM, "c_amd_flow.mp4"), s7, 16.2); add("AMD连续高亮", s7, 16.2);

  // S8: Intel table (7.1s)
  const s8 = path.join(ASM, "s08.mp4"); freeze(path.join(ASM, "c_intel.mp4"), s8, 8, 7.1); add("Intel回弹", s8, 7.1);

  // S9: Disk table (3.2s)
  const s9 = path.join(ASM, "s09.mp4"); trimS(path.join(ASM, "c_disk.mp4"), s9, 3.2); add("硬盘价格表", s9, 3.2);

  // S10: GPU overview table (7.6s)
  const s10 = path.join(ASM, "s10.mp4"); freeze(path.join(ASM, "c_gpu_table.mp4"), s10, 8, 7.6); add("GPU降价总览", s10, 7.6);

  // S11: GPU 5090D (5.8s)
  const s11 = path.join(ASM, "s11.mp4"); freeze(path.join(ASM, "c_gpu_5090d.mp4"), s11, 8, 5.8); add("5090D详情", s11, 5.8);

  // S12: GPU 5070/5080 (6.2s)
  const s12 = path.join(ASM, "s12.mp4"); freeze(path.join(ASM, "c_gpu_5070_5080.mp4"), s12, 8, 6.2); add("5070vs5080", s12, 6.2);

  // S13: GPU warning (7.9s)
  const s13 = path.join(ASM, "s13.mp4"); freeze(path.join(ASM, "c_gpu_warn.mp4"), s13, 8, 7.9); add("GPU购买建议", s13, 7.9);

  // S14: News (14.5s)
  const s14 = path.join(ASM, "s14.mp4"); trimA(DAILY, s14, 85, 14.5); add("新闻", s14, 14.5);

  // S15: Closing (3.4s)
  const s15 = path.join(ASM, "s15.mp4"); trimA(DAILY, s15, 98, 3.4); add("结尾", s15, 3.4);

  // ---- Concatenate ----
  console.log("\n=> Concatenating...");
  const cf = path.join(ASM, "concat.txt");
  fs.writeFileSync(cf, segs.map(s => `file '${s.file}'`).join("\n") + "\n");
  const noa = path.join(ASM, "v5_no_audio.mp4");
  ff(`ffmpeg -y -f concat -safe 0 -i "${cf}" -c:v libx264 -r 60 "${noa}"`);

  console.log("=> Merging audio...");
  const withAudio = path.join(ASM, "v5_with_audio.mp4");
  ff(`ffmpeg -y -i "${noa}" -i "${AUDIO}" -c:v copy -c:a aac -b:a 192k -shortest "${withAudio}"`);

  // ---- Burn subtitles ----
  console.log("=> Generating subtitles...");
  const VTT = path.join(TEMP, "voiceover_v2.vtt");
  const ASS = path.join(ASM, "subtitles.ass");

  const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,PingFang SC,52,&H00FFFFFF,&H000000FF,&H00333333,&H00000000,-1,0,0,0,100,100,0,0,1,2.5,0,2,80,80,240,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  function highlightText(text: string): string {
    const hlStart = `{\\1c&H00CCFF&}`;
    const hlEnd = `{\\r}`;
    let result = text;
    // Highlight numbers optionally followed by "块" or "元" or "%", and up/down terms
    result = result.replace(/([降涨]了?)(\d+(?:\.\d+)?(?:块|元|%)?)/g, `$1${hlStart}$2${hlEnd}`);
    result = result.replace(/(¥\d+)/g, `${hlStart}$1${hlEnd}`);
    // Highlight CPU models and special terms
    const keywords = ['9800X3D', 'DDR5', '5090D', 'TrendForce'];
    for (const kw of keywords) {
      const regex = new RegExp(`(${kw})`, 'gi');
      result = result.replace(regex, `${hlStart}$1${hlEnd}`);
    }
    return result;
  }

  // Parse VTT and convert to ASS events
  const vttContent = fs.readFileSync(VTT, "utf-8");
  const blocks = vttContent.split("\n\n").filter(b => b.includes("-->"));
  let assEvents = "";
  let totalSegmentsGenerated = 0;

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeLine = lines.find(l => l.includes("-->"));
    if (!timeLine) continue;
    const textLines = lines.filter(l => !l.includes("-->") && !/^\d+$/.test(l.trim()));
    let rawText = textLines.join("").replace(/\n/g, "").replace(/"/g, "");
    if (!rawText) continue;

    // Parse VTT time: 00:00:02,650 --> 00:00:08,182
    const [startStr, endStr] = timeLine.split("-->").map(s => s.trim());
    const parseTime = (t: string) => {
      const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
      if (!m) return 0;
      return parseInt(m[1])*3600 + parseInt(m[2])*60 + parseInt(m[3]) + parseInt(m[4].padEnd(3, '0').slice(0,3))/1000;
    };
    const toASS = (t: number) => {
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const s = Math.floor(t % 60);
      const cs = Math.floor((t - Math.floor(t)) * 100);
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    };

    const tStart = parseTime(startStr);
    const tEnd = parseTime(endStr);
    const tDuration = tEnd - tStart;

    // Split text by sentence-ending or pausing punctuations
    const parts = rawText.split(/([，。！？、；])/).filter(Boolean);
    const subSegments: {text: string, charCount: number}[] = [];
    let currentSeg = "";
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (/^[。！？；]$/.test(part)) {
        // drop ending punctuation
        if (currentSeg.length > 0) {
          subSegments.push({text: currentSeg, charCount: currentSeg.length});
          currentSeg = "";
        }
      } else if (/^[，、]$/.test(part)) {
        // drop comma but act as split
        if (currentSeg.length > 0) {
          subSegments.push({text: currentSeg, charCount: currentSeg.length});
          currentSeg = "";
        }
      } else {
        currentSeg += part;
      }
    }
    if (currentSeg.length > 0) {
      subSegments.push({text: currentSeg, charCount: currentSeg.length});
    }

    const totalChars = subSegments.reduce((sum, seg) => sum + seg.charCount, 0);
    let currentStartTime = tStart;

    for (const seg of subSegments) {
       if (!seg.text.trim()) continue;
       
       let displayDuration = tDuration * (seg.charCount / totalChars);
       let currentEndTime = currentStartTime + displayDuration;
       
       const st = toASS(currentStartTime);
       const et = toASS(currentEndTime);
       
       let finalText = highlightText(seg.text.trim());
       const fx = `{\\fad(150,100)\\blur0.8}`;
       
       assEvents += `Dialogue: 0,${st},${et},Default,,0,0,0,,${fx}${finalText}\n`;
       currentStartTime = currentEndTime;
       totalSegmentsGenerated++;
    }
  }

  fs.writeFileSync(ASS, assHeader + assEvents);
  console.log(`  Generated ${totalSegmentsGenerated} subtitle entries (smart split)`);

  console.log("=> Burning subtitles...");
  const final = path.join(OUT, "daily_report_final_v5_20260526.mp4");
  // Copy ASS to a simple path to avoid ffmpeg filter escaping issues
  const assSimple = "/tmp/_subs.ass";
  fs.copyFileSync(ASS, assSimple);
  ff(`ffmpeg -y -i "${withAudio}" -vf "ass=${assSimple}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -c:a copy "${final}"`);

  const info = JSON.parse(execSync(`ffprobe -v quiet -print_format json -show_format "${final}"`, { encoding: "utf-8" })).format;
  const dur = parseFloat(info.duration), size = parseFloat(info.size) / 1024 / 1024;

  console.log(`\n===== ✅ V5.4 DONE =====`);
  console.log(`Output: ${final}`);
  console.log(`时长: ${Math.floor(dur / 60)}分${Math.round(dur % 60)}秒 | 大小: ${size.toFixed(1)}MB`);
  console.log(`字幕: ${blocks.length}条 | 安全区: 底部220px`);
  console.log(`\n音画对齐 ${segs.length}段:`);
  let acc = 0;
  segs.forEach((s, i) => {
    const m = Math.floor(acc / 60), sc = (acc % 60).toFixed(1);
    console.log(`  ${String(i + 1).padStart(2)}. ${m}:${sc.padStart(4, "0")} | ${s.name} (${s.dur}s)`);
    acc += s.dur;
  });
}

main().catch(e => { console.error("❌", e.message || e); process.exit(1); });

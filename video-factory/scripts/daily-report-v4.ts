import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const TEMP = path.join(__dirname, "../temp");
const OUT = path.join(__dirname, "../out");
const ASM = path.join(TEMP, "assembly_v4");
const AUDIO = path.join(TEMP, "voiceover_v2.mp3");
const DAILY = path.join(OUT, "daily_report_20260526.mp4");

fs.mkdirSync(ASM, { recursive: true });

const PATH_ENV = "/usr/local/bin:/opt/homebrew/bin:" + process.env.PATH;

function render(compId: string, propsFile: string, outFile: string) {
  console.log(`  Rendering ${compId}...`);
  execSync(`npx remotion render src/index.ts ${compId} ${outFile} --props=${propsFile}`, {
    stdio: "pipe", env: { ...process.env, PATH: PATH_ENV },
  });
  console.log(`  ✅ ${path.basename(outFile)}`);
}

function ff(cmd: string) { execSync(cmd, { stdio: "pipe" }); }
function trimStart(src: string, out: string, dur: number) {
  ff(`ffmpeg -y -t ${dur} -i "${src}" -c:v libx264 -an -r 60 "${out}"`);
}
function trimAt(src: string, out: string, start: number, dur: number) {
  ff(`ffmpeg -y -ss ${start} -t ${dur} -i "${src}" -c:v libx264 -an -r 60 "${out}"`);
}
function freezeExtend(src: string, out: string, srcDur: number, totalDur: number) {
  if (totalDur <= srcDur) { trimStart(src, out, totalDur); return; }
  const extra = totalDur - srcDur;
  const a = path.join(ASM, "_fe_a.mp4"), b = path.join(ASM, "_fe_b.mp4"), f = path.join(ASM, "_fe.png"), c = path.join(ASM, "_fe.txt");
  trimStart(src, a, srcDur);
  ff(`ffmpeg -y -sseof -0.1 -i "${src}" -frames:v 1 "${f}"`);
  ff(`ffmpeg -y -loop 1 -i "${f}" -c:v libx264 -t ${extra} -r 60 -pix_fmt yuv420p -vf "scale=1080:1920" "${b}"`);
  fs.writeFileSync(c, `file '${a}'\nfile '${b}'\n`);
  ff(`ffmpeg -y -f concat -safe 0 -i "${c}" -c:v libx264 -r 60 "${out}"`);
}

async function main() {
  console.log("===== 日报视频 V4 — 内存段画面修复 =====\n");

  // ---- Step 1: Render two NEW memory clips ----
  console.log("=> Rendering new memory clips...\n");

  // 1a. MemoryProductCards (for 0:09.6-0:20.0 = 10.4s = 624 frames)
  const memCardsProps = {
    products: [
      {
        name: "金百达 白刃灯",
        spec: "32G (16G×2) DDR5-6800 C32",
        currentPrice: 2680,
        change: 50,
        badge: "高频灯条",
      },
      {
        name: "金百达 黑刃灯",
        spec: "16G DDR5-6400 C30",
        currentPrice: 1400,
        change: 30,
        badge: "高频灯条",
      },
    ],
  };
  const memCardsFile = path.join(TEMP, "memCardsProps.json");
  fs.writeFileSync(memCardsFile, JSON.stringify(memCardsProps));
  render("MemoryCards", memCardsFile, path.join(ASM, "clip_mem_cards.mp4"));

  // 1b. UpstreamNewsCard (for 0:20.0-0:32.0 = 12.0s = 720 frames)
  const upstreamProps = {
    stableLabel: "DDR5-6000 主流套条",
    stableNote: "本周零变动 · 价格稳定",
    source: "TrendForce",
    prediction: "Q2 2026 常规 DRAM 合约价",
    changeRange: "+58%~63%",
    contextLines: [
      "上游成本压力没有消失",
      "零售端仍在消化前期降价红利",
      "短期内终端价格不会大幅波动",
    ],
  };
  const upstreamFile = path.join(TEMP, "upstreamProps.json");
  fs.writeFileSync(upstreamFile, JSON.stringify(upstreamProps));
  render("UpstreamNews", upstreamFile, path.join(ASM, "clip_upstream.mp4"));

  // ---- Step 2: Build 16 segments (replacing memory segments 4 & 5) ----
  console.log("\n=> Building segments...\n");

  // VTT timestamps (voiceover_v2.vtt):
  //  0:00.0-02.7  开场
  //  0:02.7-08.2  总览
  //  0:08.2-09.6  "先看内存"
  //  0:09.6-20.0  "金百达两款...白刃灯...黑刃灯..."      ← FIX: MemoryProductCards
  //  0:20.0-32.0  "DDR5没变动...TrendForce预测..."        ← FIX: UpstreamNewsCard
  //  0:32.0-37.8  AMD vs Intel
  //  0:37.8-46.2  AMD降价表
  //  0:46.2-54.0  X3D 7天
  //  0:54.0-61.1  Intel
  //  1:01.1-64.3  硬盘
  //  1:04.3-71.9  GPU总览
  //  1:11.9-77.7  5090D
  //  1:17.7-83.9  5070vs5080
  //  1:23.9-91.8  GPU观望
  //  1:31.8-106.3 新闻
  //  1:46.3-109.7 结尾

  const segs: { name: string; file: string; dur: number }[] = [];
  function add(name: string, file: string, dur: number) { segs.push({ name, file, dur }); console.log(`  ✅ ${name} (${dur}s)`); }

  // Reuse V3 segments where unchanged
  const cpuVsIntel = path.join(TEMP, "assembly_v2/clip_cpu_vs_intel.mp4");
  const amdTable = path.join(TEMP, "assembly_v2/clip_amd_table.mp4");
  const x3d7d = path.join(TEMP, "assembly_v2/clip_x3d_7d.mp4");

  // SEG 1: Opening (2.7s)
  const s1 = path.join(ASM, "s01.mp4"); trimAt(DAILY, s1, 0, 2.7); add("开场", s1, 2.7);

  // SEG 2: Summary table (5.5s)
  const s2 = path.join(ASM, "s02.mp4"); trimStart(path.join(TEMP, "assembly_v2/clip_summary.mp4"), s2, 5.5); add("总览表", s2, 5.5);

  // SEG 3: Memory intro (1.4s)
  const s3 = path.join(ASM, "s03.mp4"); trimAt(DAILY, s3, 4, 1.4); add("内存intro", s3, 1.4);

  // SEG 4: ★ NEW ★ Memory product cards (10.4s)
  const s4 = path.join(ASM, "s04.mp4"); freezeExtend(path.join(ASM, "clip_mem_cards.mp4"), s4, 10.5, 10.4); add("★ 内存产品卡片", s4, 10.4);

  // SEG 5: ★ NEW ★ DDR5稳定+TrendForce预测 (12.0s)
  const s5 = path.join(ASM, "s05.mp4"); trimStart(path.join(ASM, "clip_upstream.mp4"), s5, 12.0); add("★ 上游信息图", s5, 12.0);

  // SEG 6: AMD vs Intel (5.8s)
  const s6 = path.join(ASM, "s06.mp4"); trimStart(cpuVsIntel, s6, 5.8); add("AMD vs Intel", s6, 5.8);

  // SEG 7: AMD table (8.0s)
  const s7 = path.join(ASM, "s07.mp4"); trimStart(amdTable, s7, 8.0); add("AMD降价表", s7, 8.0);

  // SEG 8: X3D 7d (7.8s)
  const s8 = path.join(ASM, "s08.mp4"); trimStart(x3d7d, s8, 7.8); add("X3D 7天", s8, 7.8);

  // SEG 9: Intel (7.1s)
  const s9 = path.join(ASM, "s09.mp4"); trimStart(path.join(OUT, "08_i5-14400F_vs_i5-12400F_60天对比.mp4"), s9, 7.1); add("Intel i5", s9, 7.1);

  // SEG 10: Disk (3.2s)
  const s10 = path.join(ASM, "s10.mp4"); trimAt(DAILY, s10, 47, 3.2); add("硬盘", s10, 3.2);

  // SEG 11: GPU intro (7.6s)
  const s11 = path.join(ASM, "s11.mp4"); trimAt(DAILY, s11, 53, 7.6); add("GPU总览", s11, 7.6);

  // SEG 12: 5090D (5.8s)
  const s12 = path.join(ASM, "s12.mp4"); trimStart(path.join(OUT, "04_RTX5090D_魔鹰_30天走势.mp4"), s12, 5.8); add("5090D", s12, 5.8);

  // SEG 13: 5070vs5080 (6.2s)
  const s13 = path.join(ASM, "s13.mp4"); trimStart(path.join(OUT, "06_RTX5070_vs_RTX5080_魔鹰_30天对比.mp4"), s13, 6.2); add("5070vs5080", s13, 6.2);

  // SEG 14: GPU warning (7.9s)
  const s14 = path.join(ASM, "s14.mp4"); trimStart(path.join(OUT, "05_RTX5070_魔鹰_30天走势.mp4"), s14, 7.9); add("GPU观望", s14, 7.9);

  // SEG 15: News (14.5s)
  const s15 = path.join(ASM, "s15.mp4"); trimAt(DAILY, s15, 85, 14.5); add("新闻", s15, 14.5);

  // SEG 16: Closing (3.4s)
  const s16 = path.join(ASM, "s16.mp4"); trimAt(DAILY, s16, 98, 3.4); add("结尾", s16, 3.4);

  // ---- Concatenate ----
  console.log("\n=> Concatenating 16 segments...");
  const concatFile = path.join(ASM, "concat.txt");
  fs.writeFileSync(concatFile, segs.map(s => `file '${s.file}'`).join("\n") + "\n");
  const noAudio = path.join(ASM, "video_v4.mp4");
  ff(`ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -r 60 "${noAudio}"`);

  // ---- Merge audio ----
  console.log("=> Merging audio...");
  const final = path.join(OUT, "daily_report_final_v4_20260526.mp4");
  ff(`ffmpeg -y -i "${noAudio}" -i "${AUDIO}" -c:v copy -c:a aac -b:a 192k -shortest "${final}"`);

  // ---- Stats ----
  const info = JSON.parse(execSync(`ffprobe -v quiet -print_format json -show_format "${final}"`, { encoding: "utf-8" })).format;
  const dur = parseFloat(info.duration); const size = parseFloat(info.size) / 1024 / 1024;

  console.log(`\n===== ✅ V4 DONE =====`);
  console.log(`Output: ${final}`);
  console.log(`时长: ${Math.floor(dur / 60)}分${Math.round(dur % 60)}秒 | 大小: ${size.toFixed(1)}MB`);
  console.log(`\n音画对齐表:`);
  let acc = 0;
  segs.forEach((s, i) => {
    const m = Math.floor(acc / 60), sc = (acc % 60).toFixed(1);
    console.log(`  ${String(i + 1).padStart(2)}. ${m}:${sc.padStart(4, "0")} | ${s.name} (${s.dur}s)`);
    acc += s.dur;
  });
}

main().catch(e => { console.error("❌", e.message || e); process.exit(1); });

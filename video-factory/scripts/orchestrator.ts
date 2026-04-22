// @ts-nocheck
import axios from "axios";
import OpenAI from "openai";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const API_KEY = process.env.EXTERNAL_API_KEY || "diyxx-ai-secret-key-2026";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TEMP_DIR = path.join(__dirname, "../temp");
const PUBLIC_DIR = path.join(__dirname, "../public");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

async function getMarketData() {
  console.log("=> 调用行情 API 获取数据...");
  const res = await axios.get("https://www.diyxx.com/api/external/market-report-data?period=daily", {
    headers: { "X-API-Key": API_KEY }
  });
  
  if (res.data.data.summary.totalItemChanged === 0) {
    console.log("=> 今日无数据，切换为 weekly 数据...");
    const weeklyRes = await axios.get("https://www.diyxx.com/api/external/market-report-data?period=weekly", {
      headers: { "X-API-Key": API_KEY }
    });
    return weeklyRes.data.data;
  }
  return res.data.data;
}

async function generateScript(topDrops: any[], topRises: any[]) {
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ 警告: OPENAI_API_KEY 未找到，使用默认回退文案...");
    return "完了完了，兄弟们，现在的行情太魔幻了。AMD 疯狂跳水，Intel 却在疯狂涨价，这谁懂啊？现在的配电脑，简直就像在买理财。我的建议是，游戏党直接冲超高性价比的X3D，早买早享受！";
  }

  console.log("=> 正在请求 LLM 生成赛博朋克风/毒舌口播文案...");
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const prompt = `
  你是“小鱼”，一个精通电脑硬件、自带毒舌和赛博朋克情绪的硬件博主。
  这里有一些最近的价格极值：
  大幅跌价: ${JSON.stringify(topDrops)}
  大幅涨价: ${JSON.stringify(topRises)}
  
  请为我写一段连续的口播配音文案（控制在100字左右，适合做短视频），不需要写动作指导，只需要纯念出来的文字。
  风格：情绪化，专业黑话，干脆利落。
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content || "";
}

function runTTS(text: string): { srtPath: string } {
  console.log("=> 调用 Edge-TTS 中...");
  const baseName = "audio";
  const audioPath = path.join(PUBLIC_DIR, `${baseName}.mp3`);
  const vttPath = path.join(TEMP_DIR, `${baseName}.vtt`);

  // Force bash execution environment
  const edgeTtsCmd = `/Users/mac/Library/Python/3.9/bin/edge-tts --voice zh-CN-YunxiNeural --text "${text}" --write-media ${audioPath} --write-subtitles ${vttPath}`;
  execSync(edgeTtsCmd, { stdio: "inherit" });
  
  return { srtPath: vttPath };
}

function parseVTT(vttStr: string) {
  const blocks = vttStr.split(/\r?\n\r?\n/).filter(b => b.includes('-->'));
  return blocks.map(block => {
    const lines = block.split(/\r?\n/);
    const timeLine = lines.find(l => l.includes('-->'));
    const textLines = lines.filter(l => !l.includes('-->') && !l.startsWith('WEBVTT') && l.trim().length > 0);
    
    if (!timeLine) return null;
    
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    
    const parseTime = (t: string) => {
      const parts = t.split(':');
      const secParts = parts[parts.length - 1].split('.');
      let seconds = parseFloat(secParts[0]) + parseFloat(secParts[1]) / 1000;
      if (parts.length > 2) seconds += parseInt(parts[parts.length - 2]) * 60;
      if (parts.length > 3) seconds += parseInt(parts[parts.length - 3]) * 3600;
      return seconds;
    };
    
    return {
      start: parseTime(startStr),
      end: parseTime(endStr),
      text: textLines.join(' ').replace(/<[^>]+>/g, '') 
    };
  }).filter(Boolean);
}

async function renderVideo(inputProps: any) {
  const propsPath = path.join(TEMP_DIR, "inputProps.json");
  fs.writeFileSync(propsPath, JSON.stringify(inputProps, null, 2));

  console.log("=> 调用 Remotion 重渲染...");
  const exportPath = path.join(__dirname, "../out/final_video.mp4");
  if (!fs.existsSync(path.join(__dirname, "../out"))) fs.mkdirSync(path.join(__dirname, "../out"), { recursive: true });
  
  const PATH_ENV = "/usr/local/bin:/opt/homebrew/bin:" + process.env.PATH;
  
  // Calculate frames length directly
  const totalFrames = Math.ceil(inputProps.audioDurationInSeconds * 60);

  execSync(`npx remotion render src/index.ts MarketReport ${exportPath} --props=${propsPath} --frames=0-${totalFrames}`, {
    stdio: "inherit",
    env: { ...process.env, PATH: PATH_ENV }
  });
  
  console.log(`=> ✅ 视频已成功生成: ${exportPath}`);
}

async function main() {
  try {
    const data = await getMarketData();
    const extremeChanges = data.extremeChanges;
    
    const topDrops = extremeChanges.biggestDrops.slice(0, 3);
    const topRises = extremeChanges.biggestIncreases.slice(0, 3);
    
    const script = await generateScript(topDrops, topRises);
    console.log("==> 剧本内容:", script);
    
    const { srtPath } = runTTS(script);
    
    const vttContent = fs.readFileSync(srtPath, "utf-8");
    const subtitles = parseVTT(vttContent);
    
    const finalSubtitles = subtitles.length > 0 ? subtitles : [{start: 0, end: 10, text: script}];
    
    // Add 1s padding to the end of the audio
    const audioDurationInSeconds = finalSubtitles[finalSubtitles.length - 1]?.end + 1 || 15;

    const inputProps = {
      topDrops,
      topRises,
      subtitles: finalSubtitles,
      audioDurationInSeconds
    };
    
    await renderVideo(inputProps);

  } catch (error) {
    console.error("执行流水线时出错:", error);
  }
}

main();

import axios from "axios";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

type CategoryKey = "gpu" | "cpu" | "ram" | "disk";

type RawChange = {
  hardwareId?: string;
  hardwareName?: string;
  category?: string;
  oldPrice?: number;
  newPrice?: number;
  changeAmount?: number;
  changePercent?: number;
  changedAt?: string;
};

type TrendResponse = {
  recentChanges?: RawChange[];
};

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type ProductTrend = {
  hardwareId: string;
  name: string;
  points: Array<{ date: string; price: number }>;
};

type HistoryResponse = {
  productTrends?: ProductTrend[];
  categoryTotalAvgTrend?: Array<{ date: string; avgPrice: number }>;
  products?: Product[];
};

type ChangeItem = {
  hardwareId: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
  changedAt: string;
};

type CategoryData = {
  key: CategoryKey;
  label: string;
  color: string;
  changes: ChangeItem[];
  history: HistoryResponse;
};

const meta: Record<CategoryKey, { label: string; color: string }> = {
  gpu: { label: "显卡", color: "#22c55e" },
  cpu: { label: "CPU", color: "#60a5fa" },
  ram: { label: "内存", color: "#f97316" },
  disk: { label: "硬盘", color: "#a78bfa" },
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    apiBase: "https://www.diyxx.com",
    render: true,
    synthVoice: true,
    voiceProvider: "say",
    voice: "Eddy (中文（中国大陆）)",
    voiceRate: "205",
    offlineCache: false,
  };

  for (const arg of args) {
    if (arg === "--no-render") options.render = false;
    if (arg === "--no-voice") options.synthVoice = false;
    if (arg === "--offline-cache") options.offlineCache = true;
    if (arg.startsWith("--apiBase=")) options.apiBase = arg.slice("--apiBase=".length);
    if (arg.startsWith("--voiceProvider=")) options.voiceProvider = arg.slice("--voiceProvider=".length);
    if (arg.startsWith("--voice=")) options.voice = arg.slice("--voice=".length);
    if (arg.startsWith("--voiceRate=")) options.voiceRate = arg.slice("--voiceRate=".length);
  }

  return options;
};

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

const fetchJson = async <T>(url: string) => {
  const response = await axios.get<T>(url, { timeout: 20000 });
  return response.data;
};

const readCachedJson = <T>(tempDir: string, prefix: string) => {
  const file = fs
    .readdirSync(tempDir)
    .filter((item) => item.startsWith(prefix) && item.endsWith(".json"))
    .sort()
    .pop();
  if (!file) throw new Error(`缺少离线缓存文件：${prefix}*.json`);
  return JSON.parse(fs.readFileSync(path.join(tempDir, file), "utf8")) as T;
};

const normalizeChange = (item: RawChange): ChangeItem | null => {
  const oldPrice = Number(item.oldPrice || 0);
  const newPrice = Number(item.newPrice || 0);
  const changePercent = Number(item.changePercent || 0);
  const name = String(item.hardwareName || "").trim();
  if (!name || oldPrice <= 0 || newPrice <= 0 || Math.abs(changePercent) >= 100) return null;

  return {
    hardwareId: String(item.hardwareId || ""),
    name,
    oldPrice,
    newPrice,
    changeAmount: Number(item.changeAmount || 0),
    changePercent,
    changedAt: String(item.changedAt || ""),
  };
};

const normalizeChanges = (trend: TrendResponse) =>
  (trend.recentChanges || [])
    .map(normalizeChange)
    .filter((item): item is ChangeItem => Boolean(item))
    .filter((item) => Math.abs(item.changeAmount) > 0.01);

const buildCategory = async (apiBase: string, key: CategoryKey): Promise<CategoryData> => {
  const [trend, history] = await Promise.all([
    fetchJson<TrendResponse>(`${apiBase}/api/stats/price-trends?days=1&category=${key}`),
    fetchJson<HistoryResponse>(`${apiBase}/api/stats/product-price-history?category=${key}&days=30`),
  ]);
  const changes = normalizeChanges(trend);

  return {
    key,
    label: meta[key].label,
    color: meta[key].color,
    changes,
    history,
  };
};

const buildCategoryFromCache = (tempDir: string, key: CategoryKey): CategoryData => {
  const trend = readCachedJson<TrendResponse>(tempDir, `trends_${key}_1d_`);
  const history = readCachedJson<HistoryResponse>(tempDir, `history_${key}_30d_`);
  return {
    key,
    label: meta[key].label,
    color: meta[key].color,
    changes: normalizeChanges(trend),
    history,
  };
};

const fetchChanges = async (apiBase: string, key: CategoryKey, days: number) => {
  const trend = await fetchJson<TrendResponse>(`${apiBase}/api/stats/price-trends?days=${days}&category=${key}`);
  return normalizeChanges(trend);
};

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
  (history.products || []).find((product) => pattern.test(product.name));

const findProductTrend = (history: HistoryResponse, change?: ChangeItem, pattern?: RegExp) => {
  const trends = history.productTrends || [];
  if (change?.hardwareId) {
    const byId = trends.find((trend) => trend.hardwareId === change.hardwareId);
    if (byId) return byId;
  }
  if (change?.name) {
    const normalized = change.name.replace(/\s+/g, "").toLowerCase();
    const byName = trends.find((trend) => trend.name.replace(/\s+/g, "").toLowerCase() === normalized);
    if (byName) return byName;
  }
  if (pattern) return trends.find((trend) => pattern.test(trend.name));
  return undefined;
};

const cleanPoints = (trend?: ProductTrend) =>
  (trend?.points || [])
    .map((point) => ({ date: point.date, price: Math.round(Number(point.price || 0) * 100) / 100 }))
    .filter((point) => point.price > 0);

const categoryAvgPoints = (history: HistoryResponse) =>
  (history.categoryTotalAvgTrend || [])
    .map((point) => ({ date: point.date, price: Math.round(Number(point.avgPrice || 0) * 100) / 100 }))
    .filter((point) => point.price > 0);

const flatPoints = (dates: string[], price: number) =>
  dates.map((date) => ({ date, price: Math.round(price * 100) / 100 }));

const shortName = (name: string) =>
  name
    .replace(/技嘉\s*/g, "")
    .replace(/金百达\s*/g, "")
    .replace(/散片/g, "")
    .replace(/NVMe PCIe 4.0/gi, "")
    .trim();

const makeFeature = ({
  key,
  category,
  change,
  history,
  color,
  fallbackPattern,
  fallbackProduct,
  insight,
}: {
  key: string;
  category: string;
  change?: ChangeItem;
  history: HistoryResponse;
  color: string;
  fallbackPattern?: RegExp;
  fallbackProduct?: Product;
  insight: string;
}) => {
  const trend = findProductTrend(history, change, fallbackPattern);
  const avgPoints = categoryAvgPoints(history);
  const currentPrice = change?.newPrice || fallbackProduct?.price || avgPoints[avgPoints.length - 1]?.price || 0;
  const dates =
    avgPoints.length > 1
      ? avgPoints.map((point) => point.date)
      : Array.from({ length: 31 }, (_, index) => {
          const date = new Date();
          date.setDate(date.getDate() - (30 - index));
          return date.toISOString().slice(0, 10);
        });
  const points = cleanPoints(trend);
  const usablePoints = points.length >= 2 ? points : fallbackProduct ? flatPoints(dates, fallbackProduct.price) : avgPoints;
  const name = change?.name || trend?.name || fallbackProduct?.name || `${category}类目均价`;

  return {
    key,
    category,
    name,
    shortName: shortName(name),
    color,
    oldPrice: change?.oldPrice ?? null,
    newPrice: currentPrice,
    changeAmount: change?.changeAmount || 0,
    changePercent: change?.changePercent || 0,
    points: usablePoints,
    insight,
  };
};

const avg = (items: number[]) => {
  if (!items.length) return 0;
  return Math.round((items.reduce((sum, item) => sum + item, 0) / items.length) * 100) / 100;
};

type VoiceSegment = {
  key: string;
  title: string;
  text: string;
};

type NewsItem = {
  title: string;
  source: string;
  summary: string;
};

const countByDirection = (items: ChangeItem[]) => ({
  up: items.filter((item) => item.changeAmount > 0).length,
  down: items.filter((item) => item.changeAmount < 0).length,
});

const money = (value: number) => Math.round(value).toLocaleString("zh-CN");

const buildVoiceSegments = ({
  gpuDrop,
  cpuDrop,
  cpuRise,
  ramRise,
  diskProduct,
  daily,
  weekly,
}: {
  gpuDrop: ChangeItem;
  cpuDrop: ChangeItem;
  cpuRise: ChangeItem;
  ramRise: ChangeItem;
  diskProduct: Product;
  daily: Record<CategoryKey, ChangeItem[]>;
  weekly: Record<CategoryKey, ChangeItem[]>;
}): VoiceSegment[] => {
  const ramWeek = countByDirection(weekly.ram);
  const diskWeek = countByDirection(weekly.disk);
  const cpuToday = countByDirection(daily.cpu);
  const gpuWeek = countByDirection(weekly.gpu);
  const ramWeekDrop = topDown(weekly.ram, 1)[0];
  const diskWeekDrop = topDown(weekly.disk, 1)[0];
  const gpuSecond = topDown(daily.gpu, 2)[1];

  return [
    {
      key: "intro",
      title: "开场白",
      text: `今天这期先别只盯单日涨跌，后台三十天曲线更关键。按顺序来，先看内存，再看硬盘，然后 CPU 和显卡，最后补两条行业新闻。`,
    },
    {
      key: "ram",
      title: "第一段：内存",
      text: `先来看内存。今天内存只有 ${daily.ram.length} 款变动，而且都是涨价，平均上涨 ${money(avg(daily.ram.map((item) => item.changeAmount)))} 块。${ramRise.name} 涨了 ${money(ramRise.changeAmount)} 块，目前 ${money(ramRise.newPrice)}。但别急着说内存全面起飞，近一周内存一共有 ${weekly.ram.length} 条变化，${ramWeek.down} 条降价，${ramWeek.up} 条上涨。${ramWeekDrop ? `${ramWeekDrop.name} 一周内降了 ${money(Math.abs(ramWeekDrop.changeAmount))} 块，目前 ${money(ramWeekDrop.newPrice)}。` : ""}所以内存现在是分化行情，刚需可以比价，不建议看到单日小涨就追。`,
    },
    {
      key: "disk",
      title: "第二段：硬盘",
      text: `再来看硬盘。今天固态硬盘没有有效调价，大盘是横盘。但近一周不是完全没动，7 天内有 ${weekly.disk.length} 条变化，${diskWeek.down} 条下跌，${diskWeek.up} 条上涨。${diskWeekDrop ? `${diskWeekDrop.name} 降了 ${money(Math.abs(diskWeekDrop.changeAmount))} 块，目前 ${money(diskWeekDrop.newPrice)}。` : ""}参考价位上，${diskProduct.name} 当前 ${money(diskProduct.price)}。硬盘这段不用追涨杀跌，预算紧就盯 800 到 1000 的主流 1T，追高端盘就等活动价。`,
    },
    {
      key: "cpu",
      title: "第三段：CPU",
      text: `再来看 CPU。今天 CPU 有 ${daily.cpu.length} 款变动，${cpuToday.up} 款上涨，${cpuToday.down} 款下跌，是典型分化。跌价主要看 AMD，${cpuDrop.name} 降了 ${money(Math.abs(cpuDrop.changeAmount))} 块，目前 ${money(cpuDrop.newPrice)}；涨价主要看 Intel 入门散片，${cpuRise.name} 涨了 ${money(cpuRise.changeAmount)} 块，目前 ${money(cpuRise.newPrice)}。这不是 CPU 整体涨跌，而是 AMD 游戏 U 小幅回落，Intel 入门散片短线反弹。`,
    },
    {
      key: "gpu",
      title: "第四段：显卡",
      text: `最后重点看显卡。今天显卡一共 ${daily.gpu.length} 款变动，全部降价，平均降价 ${money(Math.abs(avg(daily.gpu.map((item) => item.changeAmount))))} 块。${gpuDrop.name} 降了 ${money(Math.abs(gpuDrop.changeAmount))} 块，目前 ${money(gpuDrop.newPrice)}。${gpuSecond ? `${gpuSecond.name} 也降了 ${money(Math.abs(gpuSecond.changeAmount))} 块，目前 ${money(gpuSecond.newPrice)}。` : ""}但把近一周拉开看，显卡有 ${weekly.gpu.length} 条变化，其中 ${gpuWeek.up} 条上涨，${gpuWeek.down} 条下跌。所以今天这波更像前期上涨后的回吐，5090D 先比价，5080 继续盯二次回调，5070 档位看具体型号。`,
    },
    {
      key: "news",
      title: "第五段：新闻",
      text: `最后聊两条行业新闻。第一，TrendForce 集邦咨询提到，AI 服务器需求继续支撑 DRAM 和 NAND 合约价上行，这解释了为什么内存和固态即使短期回调，也很难说彻底见顶。第二，AMD 在 5 月 21 日宣布，将在台湾生态链投入超过 100 亿美元，扩展 AI 基础设施相关的先进封装和制造能力。高端算力、封装和显存资源，后面仍然会被 AI 需求牵引。`,
    },
    {
      key: "outro",
      title: "结尾",
      text: `总结一下：内存小涨但周线分化，硬盘当天横盘但一周有松动，CPU 是 AMD 小跌、Intel 入门反弹，显卡全线回调但还没到闭眼冲。预算和用途留评论区，我帮你看配置。`,
    },
  ];
};

const synthesizeVoice = (
  segments: VoiceSegment[],
  tempDir: string,
  publicDir: string,
  dateSlug: string,
  provider: string,
  voice: string,
  voiceRate: string,
) => {
  const textPath = path.join(tempDir, `horizontal_voice_${dateSlug}.txt`);
  const concatPath = path.join(tempDir, `horizontal_voice_${dateSlug}_concat.txt`);
  const segmentDir = path.join(tempDir, `horizontal_voice_${dateSlug}_segments`);
  fs.mkdirSync(segmentDir, { recursive: true });
  const audioName = `horizontal_voice_${dateSlug}.m4a`;
  const m4aPath = path.join(publicDir, audioName);
  fs.writeFileSync(textPath, segments.map((segment) => `【${segment.title}】\n${segment.text}`).join("\n\n"));

  const segmentPaths = segments.map((segment, index) => {
    const segmentTextPath = path.join(segmentDir, `${String(index + 1).padStart(2, "0")}_${segment.key}.txt`);
    const segmentAudioPath = path.join(
      segmentDir,
      `${String(index + 1).padStart(2, "0")}_${segment.key}.${provider === "edge" ? "mp3" : "aiff"}`,
    );
    fs.writeFileSync(segmentTextPath, segment.text);
    const tts =
      provider === "edge"
        ? spawnSync(
            "python3",
            [
              "-m",
              "edge_tts",
              "-f",
              segmentTextPath,
              "-v",
              voice,
              "--rate",
              voiceRate,
              "--write-media",
              segmentAudioPath,
            ],
            { stdio: "inherit" },
          )
        : spawnSync("say", ["-v", voice, "-r", voiceRate, "-o", segmentAudioPath, "-f", segmentTextPath], {
            stdio: "inherit",
          });
    if (tts.status !== 0) throw new Error(`${provider} TTS failed for ${segment.key} with status ${tts.status}`);
    return segmentAudioPath;
  });

  fs.writeFileSync(concatPath, segmentPaths.join("\n"));

  const inputArgs = segmentPaths.flatMap((item) => ["-i", item]);
  const inputLabels = segmentPaths.map((_, index) => `[${index}:a]`).join("");
  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-y",
      ...inputArgs,
      "-filter_complex",
      `${inputLabels}concat=n=${segmentPaths.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000`,
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      m4aPath,
    ],
    { stdio: "inherit" },
  );
  if (ffmpeg.status !== 0) throw new Error(`ffmpeg audio conversion failed with status ${ffmpeg.status}`);

  return { audioName, textPath, m4aPath, segmentPaths };
};

const audioDuration = (audioPath: string) => {
  const ffprobe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", audioPath],
    { encoding: "utf8" },
  );
  return Number(ffprobe.stdout.trim() || 0);
};

const main = async () => {
  const options = parseArgs();
  const videoDir = path.join(__dirname, "..");
  const tempDir = path.join(videoDir, "temp");
  const outDir = path.join(videoDir, "out");
  const publicDir = path.join(videoDir, "public");
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  const categoryKeys = ["gpu", "cpu", "ram", "disk"] as CategoryKey[];
  const categories = options.offlineCache
    ? categoryKeys.map((key) => buildCategoryFromCache(tempDir, key))
    : await Promise.all(categoryKeys.map((key) => buildCategory(options.apiBase, key)));
  const categoryByKey = Object.fromEntries(categories.map((category) => [category.key, category])) as Record<CategoryKey, CategoryData>;
  const weeklyEntries = options.offlineCache
    ? categoryKeys.map((key) => [key, normalizeChanges(readCachedJson<TrendResponse>(tempDir, `trends_${key}_7d_`))] as const)
    : await Promise.all(categoryKeys.map(async (key) => [key, await fetchChanges(options.apiBase, key, 7)] as const));
  const weeklyByKey = Object.fromEntries(weeklyEntries) as Record<CategoryKey, ChangeItem[]>;

  const gpuDrop = topDown(categoryByKey.gpu.changes, 1)[0];
  const cpuDrop = findChange(categoryByKey.cpu, /9800X3D/) || topDown(categoryByKey.cpu.changes, 1)[0];
  const cpuRise = findChange(categoryByKey.cpu, /14400F/) || topUp(categoryByKey.cpu.changes, 1)[0];
  const ramRise = topUp(categoryByKey.ram.changes, 1)[0];
  const diskProduct =
    findProduct(categoryByKey.disk.history, /金士顿\s*NV3\s*1T/i) ||
    categoryByKey.disk.history.products?.find((product) => product.price > 0);

  if (!gpuDrop || !cpuDrop || !cpuRise || !ramRise || !diskProduct) {
    throw new Error("缺少生成横屏视频所需的代表型号数据");
  }

  const latestChangeDate =
    [gpuDrop, cpuDrop, cpuRise, ramRise]
      .map((item) => item.changedAt.slice(0, 10))
      .filter(Boolean)
      .sort()
      .pop() || localDate();
  const dateSlug = latestChangeDate.replace(/-/g, "");
  const voiceSegments = buildVoiceSegments({
    gpuDrop,
    cpuDrop,
    cpuRise,
    ramRise,
    diskProduct,
    daily: {
      gpu: categoryByKey.gpu.changes,
      cpu: categoryByKey.cpu.changes,
      ram: categoryByKey.ram.changes,
      disk: categoryByKey.disk.changes,
    },
    weekly: weeklyByKey,
  });
  const voiceScript = voiceSegments.map((segment) => segment.text).join("\n");
  const voice = options.synthVoice
    ? synthesizeVoice(voiceSegments, tempDir, publicDir, dateSlug, options.voiceProvider, options.voice, options.voiceRate)
    : { audioName: "", textPath: "", m4aPath: "", segmentPaths: [] };
  const duration = voice.m4aPath ? audioDuration(voice.m4aPath) : 0;
  const news: NewsItem[] = [
    {
      source: "TrendForce · 2026-03-31",
      title: "AI 服务器继续支撑存储合约价",
      summary: "DRAM 与 NAND 合约价仍受 AI 服务器和数据中心需求牵引，零售端短线回调不能直接等同于周期见顶。",
    },
    {
      source: "AMD Newsroom · 2026-05-21",
      title: "AMD 加码台湾 AI 基础设施生态",
      summary: "超过 100 亿美元投入先进封装和制造能力，高端算力、封装和显存资源仍会被 AI 需求长期牵引。",
    },
  ];

  const featured = [
    makeFeature({
      key: "ram-main",
      category: "内存",
      change: ramRise,
      history: categoryByKey.ram.history,
      color: meta.ram.color,
      insight: `今天只有 ${categoryByKey.ram.changes.length} 款上涨，近一周却是 ${countByDirection(weeklyByKey.ram).down} 降 ${countByDirection(weeklyByKey.ram).up} 涨，不能按单日小涨追。`,
    }),
    makeFeature({
      key: "disk-main",
      category: "硬盘",
      history: categoryByKey.disk.history,
      color: meta.disk.color,
      fallbackPattern: /金士顿\s*NV3\s*1T/i,
      fallbackProduct: diskProduct,
      insight: `今天无有效调价，近一周 ${weeklyByKey.disk.length} 条变化，主流 1T 先盯 800 到 1000 的价位。`,
    }),
    makeFeature({
      key: "cpu-amd",
      category: "CPU",
      change: cpuDrop,
      history: categoryByKey.cpu.history,
      color: "#38bdf8",
      insight: "AMD 游戏 U 小幅回落，适合继续观察，不必为几十块波动纠结。",
    }),
    makeFeature({
      key: "cpu-intel",
      category: "CPU",
      change: cpuRise,
      history: categoryByKey.cpu.history,
      color: "#f43f5e",
      insight: "Intel 入门散片今天回弹，刚需按整机预算判断，不要只盯 CPU 单价。",
    }),
    makeFeature({
      key: "gpu-main",
      category: "显卡",
      change: gpuDrop,
      history: categoryByKey.gpu.history,
      color: meta.gpu.color,
      insight: `今天 ${categoryByKey.gpu.changes.length} 款全降，但近一周 ${countByDirection(weeklyByKey.gpu).up} 涨 ${countByDirection(weeklyByKey.gpu).down} 降，更像前期上涨后的回吐。`,
    }),
  ];

  const props = {
    date: latestChangeDate,
    title: "蒋小鱼硬件行情日报",
    headline: "今天显卡回调，但别只看最后一个点",
    audioSrc: voice.audioName,
    categories: categories.map((category) => {
      const upItems = category.changes.filter((item) => item.changeAmount > 0);
      const downItems = category.changes.filter((item) => item.changeAmount < 0);
      return {
        key: category.key,
        label: category.label,
        changed: category.changes.length,
        up: upItems.length,
        down: downItems.length,
        avgUp: avg(upItems.map((item) => item.changeAmount)),
        avgDown: avg(downItems.map((item) => item.changeAmount)),
        color: category.color,
      };
    }),
    featured,
    news,
    script: voiceScript,
  };

  const propsPath = path.join(tempDir, `horizontalHardwareTrendProps_${dateSlug}.json`);
  const reportPath = path.join(outDir, `horizontal_hardware_trend_${dateSlug}.md`);
  const outPath = path.join(outDir, `horizontal_hardware_trend_${dateSlug}.mp4`);
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
  fs.writeFileSync(
    reportPath,
    `# 横屏硬件行情视频素材 - ${latestChangeDate}

## 口播稿

${voiceSegments.map((segment) => `### ${segment.title}\n${segment.text}`).join("\n\n")}

## 代表型号曲线

${featured
  .map(
    (item) =>
      `- ${item.category}｜${item.name}｜当前 ${Math.round(item.newPrice)}｜今日 ${item.changeAmount > 0 ? "+" : ""}${Math.round(item.changeAmount)}｜曲线点 ${item.points.length} 个`,
  )
  .join("\n")}

## 输出配置

- 画幅：1920x1080 横屏
- 时长：190 秒
- 音频：${options.voiceProvider === "edge" ? "Edge 神经网络中文 TTS" : "macOS 本地中文声音"}（${options.voice}，${options.voiceRate}），分段生成后拼接，约 ${duration.toFixed(1)} 秒
- 数据：DIYXX price-trends 当日/近 7 天变动 + product-price-history 近 30 天曲线
- 新闻背景：TrendForce 2026-03-31、AMD Newsroom 2026-05-21
`,
  );

  console.log(`Generated props: ${propsPath}`);
  console.log(`Generated report: ${reportPath}`);
  if (voice.m4aPath) console.log(`Generated voice: ${voice.m4aPath} (${duration.toFixed(1)}s)`);

  if (!options.render) return;

  const render = spawnSync(
    "npx",
    [
      "remotion",
      "render",
      "src/horizontal-hardware-index.tsx",
      "HorizontalHardwareTrend",
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
  if (render.status !== 0) throw new Error(`Remotion render failed with status ${render.status}`);
  console.log(`Rendered video: ${outPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ReactNode } from "react";

type TrendPoint = {
  date: string;
  price: number;
};

type ProductTrend = {
  key: string;
  category: string;
  name: string;
  shortName: string;
  color: string;
  oldPrice: number | null;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
  points: TrendPoint[];
  insight: string;
};

type CategorySummary = {
  key: string;
  label: string;
  changed: number;
  up: number;
  down: number;
  avgUp: number;
  avgDown: number;
  color: string;
};

type NewsItem = {
  title: string;
  source: string;
  summary: string;
};

export type HorizontalHardwareTrendProps = {
  date: string;
  title: string;
  headline: string;
  audioSrc: string;
  categories: CategorySummary[];
  featured: ProductTrend[];
  news: NewsItem[];
  script: string;
};

export const horizontalHardwareDurationFrames = 5520;

export const defaultHorizontalHardwareTrendProps: HorizontalHardwareTrendProps = {
  date: "2026-05-26",
  title: "蒋小鱼硬件行情日报",
  headline: "用 30 天曲线看今天的真实价格",
  audioSrc: "",
  categories: [],
  featured: [],
  news: [],
  script: "",
};

const sceneDurations = [360, 1020, 840, 840, 1140, 840, 480];

const sceneAtFrame = (frame: number) => {
  let cursor = 0;
  for (let index = 0; index < sceneDurations.length; index += 1) {
    const duration = sceneDurations[index];
    if (frame < cursor + duration) return { index, localFrame: frame - cursor, duration };
    cursor += duration;
  }
  return {
    index: sceneDurations.length - 1,
    localFrame: sceneDurations[sceneDurations.length - 1] - 1,
    duration: sceneDurations[sceneDurations.length - 1],
  };
};

const formatMoney = (value: number | null) =>
  value === null ? "-" : `¥${Math.round(value).toLocaleString("zh-CN")}`;

const formatChange = (value: number) => {
  if (Math.abs(value) < 0.01) return "0";
  return `${value > 0 ? "+" : ""}${Math.round(value).toLocaleString("zh-CN")}`;
};

const changeColor = (value: number) => {
  if (value > 0) return "#ef4444";
  if (value < 0) return "#10b981";
  return "#d6d3d1";
};

const trimText = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const Background = () => {
  const frame = useCurrentFrame();
  const shift = frame * 0.35;

  return (
    <AbsoluteFill style={{ background: "#11110f", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(214,211,209,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(214,211,209,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          transform: `translateX(${shift % 64}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(6,182,212,0.12) 0%, rgba(17,17,15,0) 22%, rgba(16,185,129,0.08) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "linear-gradient(90deg, #06b6d4, #10b981, #f97316, #ef4444)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 98 + (frame * 1.6) % 820,
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(103,232,249,0.18)",
        }}
      />
    </AbsoluteFill>
  );
};

const Shell = ({ children }: { children: ReactNode }) => (
  <AbsoluteFill
    style={{
      padding: "48px 58px 42px",
      color: "#fafaf9",
      fontFamily: "Inter, Arial, 'PingFang SC', sans-serif",
    }}
  >
    {children}
    <div
      style={{
        position: "absolute",
        left: 58,
        right: 58,
        bottom: 30,
        display: "flex",
        justifyContent: "space-between",
        color: "rgba(214,211,209,0.46)",
        fontSize: 20,
        fontWeight: 800,
      }}
    >
      <span>DIYXX.COM DATA CENTER</span>
      <span>30-DAY PRICE CURVES · API SOURCE</span>
    </div>
  </AbsoluteFill>
);

const Scene = ({
  children,
  localFrame,
  duration,
}: {
  children: ReactNode;
  localFrame: number;
  duration: number;
}) => {
  const { fps } = useVideoConfig();
  const s = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 80 },
  });
  const opacity = interpolate(localFrame, [0, 8, duration - 8, duration], [0.94, 1, 1, 0.94], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(s, [0, 1], [18, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

const Header = ({ props }: { props: HorizontalHardwareTrendProps }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div>
      <div style={{ color: "#67e8f9", fontSize: 20, fontWeight: 900, marginBottom: 12 }}>
        JIANG XIAOYU MARKET BRIEF · {props.date}
      </div>
      <div style={{ fontSize: 46, fontWeight: 950 }}>{props.title}</div>
    </div>
    <div
      style={{
        border: "1px solid rgba(214,211,209,0.16)",
        borderRadius: 8,
        padding: "13px 18px",
        color: "#d6d3d1",
        fontSize: 22,
        fontWeight: 850,
        background: "rgba(28,25,23,0.72)",
      }}
    >
      横屏数据版 · 1920x1080
    </div>
  </div>
);

const CategoryStrip = ({ categories }: { categories: CategorySummary[] }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
    {categories.map((category) => (
      <div
        key={category.key}
        style={{
          border: "1px solid rgba(214,211,209,0.14)",
          borderRadius: 8,
          background: "rgba(28,25,23,0.7)",
          padding: "18px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 30, borderRadius: 4, background: category.color }} />
          <div style={{ fontSize: 27, fontWeight: 950 }}>{category.label}</div>
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#a8a29e", fontSize: 16, fontWeight: 850 }}>变动</div>
            <div style={{ fontSize: 34, fontWeight: 950 }}>{category.changed}</div>
          </div>
          <div>
            <div style={{ color: "#a8a29e", fontSize: 16, fontWeight: 850 }}>涨 / 降</div>
            <div style={{ fontSize: 34, fontWeight: 950, color: category.color }}>
              {category.up} / {category.down}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const pointsFor = (trend: ProductTrend) => trend.points.filter((point) => point.price > 0);

const TrendChart = ({
  trend,
  localFrame,
  duration,
  compact = false,
}: {
  trend: ProductTrend;
  localFrame: number;
  duration: number;
  compact?: boolean;
}) => {
  const points = pointsFor(trend);
  const width = compact ? 760 : 1040;
  const height = compact ? 330 : 515;
  const pad = { top: 30, right: 50, bottom: 48, left: 86 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const yMin = min - range * 0.22;
  const yMax = max + range * 0.22;
  const toX = (index: number) => pad.left + (index / Math.max(1, points.length - 1)) * plotW;
  const toY = (price: number) => pad.top + (1 - (price - yMin) / (yMax - yMin)) * plotH;
  const plotted = points.map((point, index) => ({
    ...point,
    x: toX(index),
    y: toY(point.price),
  }));
  const path = plotted.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${plotted[plotted.length - 1]?.x || pad.left} ${pad.top + plotH} L ${pad.left} ${pad.top + plotH} Z`;
  const drawEndFrame = Math.min(duration - 24, compact ? 112 : 148);
  const drawProgress = interpolate(localFrame, [8, drawEndFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanStart = Math.min(duration - 72, drawEndFrame + 18);
  const scanProgress = interpolate(localFrame, [scanStart, Math.max(scanStart + 1, duration - 48)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursor = scanProgress * Math.max(1, plotted.length - 1);
  const floor = Math.floor(cursor);
  const ceil = Math.min(plotted.length - 1, floor + 1);
  const t = cursor - floor;
  const a = plotted[floor] || plotted[0];
  const b = plotted[ceil] || a;
  const cursorX = a.x + (b.x - a.x) * t;
  const cursorY = a.y + (b.y - a.y) * t;
  const cursorPrice = a.price + (b.price - a.price) * t;
  const start = points[0]?.price || 0;
  const end = points[points.length - 1]?.price || start;
  const delta = end - start;
  const displayPrice =
    trend.oldPrice === null
      ? trend.newPrice
      : interpolate(localFrame, [0, 54], [trend.oldPrice, trend.newPrice], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const latest = plotted[plotted.length - 1] || plotted[0];
  const badgeOpacity = interpolate(localFrame, [drawEndFrame - 16, drawEndFrame + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = (Math.sin(localFrame / 5) + 1) / 2;
  const badgeW = compact ? 152 : 188;
  const badgeH = compact ? 46 : 54;
  const badgeX = Math.max(pad.left, Math.min(pad.left + plotW - badgeW, latest.x - badgeW + 18));
  const badgeY = Math.max(12, Math.min(pad.top + plotH - badgeH - 8, latest.y - badgeH - 30));
  const revealId = `reveal-${trend.key.replace(/[^a-zA-Z0-9]/g, "")}-${compact ? "c" : "f"}`;

  return (
    <div
      style={{
        position: "relative",
        border: "1px solid rgba(214,211,209,0.14)",
        borderRadius: 8,
        background: "rgba(17,17,15,0.76)",
        padding: compact ? 16 : 22,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: trend.color, fontSize: compact ? 16 : 20, fontWeight: 900 }}>
            {trend.category} · 近 30 天价格曲线
          </div>
          <div style={{ marginTop: 8, fontSize: compact ? 24 : 34, fontWeight: 950 }}>
            {trimText(trend.shortName, compact ? 24 : 34)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#a8a29e", fontSize: compact ? 15 : 18, fontWeight: 850 }}>
            当前价
          </div>
          <div style={{ color: changeColor(trend.changeAmount), fontSize: compact ? 31 : 42, fontWeight: 950 }}>
            {formatMoney(displayPrice)}
          </div>
        </div>
      </div>

      <svg width={width} height={height} style={{ marginTop: compact ? 4 : 12 }}>
        <defs>
          <clipPath id={revealId}>
            <rect x={0} y={0} width={pad.left + drawProgress * plotW} height={height} />
          </clipPath>
          <linearGradient id={`${revealId}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trend.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={trend.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((item) => {
          const y = pad.top + (item / 3) * plotH;
          const value = yMax - (item / 3) * (yMax - yMin);
          return (
            <g key={item}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + plotW}
                y2={y}
                stroke="rgba(214,211,209,0.14)"
                strokeDasharray="5 7"
              />
              <text x={pad.left - 16} y={y + 6} fill="#a8a29e" fontSize={compact ? 16 : 18} fontWeight={800} textAnchor="end">
                {Math.round(value)}
              </text>
            </g>
          );
        })}
        {plotted
          .filter((_, index) => index === 0 || index === plotted.length - 1 || index % Math.ceil(plotted.length / 4) === 0)
          .map((point) => (
            <text
              key={`${trend.key}-${point.date}`}
              x={point.x}
              y={pad.top + plotH + 34}
              fill="#a8a29e"
              fontSize={compact ? 15 : 17}
              fontWeight={800}
              textAnchor="middle"
            >
              {point.date.slice(5)}
            </text>
          ))}
        <g clipPath={`url(#${revealId})`}>
          <path d={area} fill={`url(#${revealId}-area)`} />
          <path d={path} fill="none" stroke={trend.color} strokeWidth={compact ? 4 : 5} strokeLinecap="round" strokeLinejoin="round" />
          {plotted.map((point, index) => (
            <circle key={`${point.date}-${index}`} cx={point.x} cy={point.y} r={compact ? 3 : 4} fill="#fafaf9" stroke={trend.color} strokeWidth={2} />
          ))}
        </g>
        {drawProgress > 0.96 && latest && (
          <g opacity={badgeOpacity}>
            <circle cx={latest.x} cy={latest.y} r={(compact ? 13 : 18) + pulse * 10} fill={trend.color} opacity={0.18 + pulse * 0.14} />
            <circle cx={latest.x} cy={latest.y} r={compact ? 7 : 9} fill={trend.color} stroke="#fafaf9" strokeWidth={2} />
            <rect
              x={badgeX}
              y={badgeY}
              width={badgeW}
              height={badgeH}
              rx={8}
              fill="rgba(17,17,15,0.94)"
              stroke={trend.color}
              strokeWidth={1.5}
            />
            <text
              x={badgeX + badgeW / 2}
              y={badgeY + (compact ? 29 : 34)}
              fill={changeColor(trend.changeAmount)}
              fontSize={compact ? 18 : 22}
              fontWeight={950}
              textAnchor="middle"
            >
              最新 {formatChange(trend.changeAmount)}
            </text>
          </g>
        )}
        {localFrame > scanStart && (
          <g>
            <line x1={cursorX} y1={pad.top} x2={cursorX} y2={pad.top + plotH} stroke="rgba(250,250,249,0.35)" strokeDasharray="4 6" />
            <circle cx={cursorX} cy={cursorY} r={compact ? 12 : 16} fill={trend.color} opacity={0.22} />
            <circle cx={cursorX} cy={cursorY} r={compact ? 6 : 8} fill={trend.color} stroke="#fafaf9" strokeWidth={2} />
            <rect
              x={Math.max(pad.left, Math.min(pad.left + plotW - 170, cursorX - 85))}
              y={Math.max(14, cursorY - 78)}
              width={170}
              height={52}
              rx={8}
              fill="rgba(28,25,23,0.92)"
              stroke="rgba(214,211,209,0.2)"
            />
            <text
              x={Math.max(pad.left + 85, Math.min(pad.left + plotW - 85, cursorX))}
              y={Math.max(36, cursorY - 45)}
              fill="#fafaf9"
              fontSize={compact ? 18 : 21}
              fontWeight={900}
              textAnchor="middle"
            >
              {formatMoney(cursorPrice)}
            </text>
          </g>
        )}
      </svg>

      <div style={{ display: "flex", gap: 10, marginTop: compact ? 0 : 8 }}>
        <Metric label="30天起点" value={formatMoney(start)} />
        <Metric label="当前变化" value={`${formatChange(delta)} / ${start > 0 ? ((delta / start) * 100).toFixed(2) : "0"}%`} color={changeColor(delta)} />
        <Metric label="今日变动" value={`${formatChange(trend.changeAmount)} / ${trend.changePercent.toFixed(2)}%`} color={changeColor(trend.changeAmount)} />
      </div>
    </div>
  );
};

const Metric = ({ label, value, color = "#fafaf9" }: { label: string; value: string; color?: string }) => (
  <div
    style={{
      flex: 1,
      border: "1px solid rgba(214,211,209,0.12)",
      borderRadius: 8,
      padding: "10px 12px",
      background: "rgba(41,37,36,0.62)",
    }}
  >
    <div style={{ color: "#a8a29e", fontSize: 15, fontWeight: 850 }}>{label}</div>
    <div style={{ color, fontSize: 22, fontWeight: 950, marginTop: 4 }}>{value}</div>
  </div>
);

const ImpactPanel = ({ trend, localFrame }: { trend: ProductTrend; localFrame: number }) => {
  const tone = changeColor(trend.changeAmount);
  const label = trend.changeAmount > 0 ? "今日上涨" : trend.changeAmount < 0 ? "今日下跌" : "今日横盘";
  const scale = interpolate(Math.sin(localFrame / 6), [-1, 1], [0.985, 1.015]);

  return (
    <div
      style={{
        marginTop: 22,
        border: `1px solid ${tone}`,
        borderRadius: 8,
        background: "rgba(17,17,15,0.78)",
        padding: "20px 24px",
      }}
    >
      <div style={{ color: "#a8a29e", fontSize: 18, fontWeight: 850 }}>{label}</div>
      <div
        style={{
          marginTop: 8,
          color: tone,
          fontSize: 58,
          lineHeight: 1,
          fontWeight: 950,
          transform: `scale(${scale})`,
          transformOrigin: "left center",
        }}
      >
        {formatChange(trend.changeAmount)} 元
      </div>
      <div style={{ marginTop: 14, color: "#d6d3d1", fontSize: 23, fontWeight: 850 }}>
        {formatMoney(trend.oldPrice)} → {formatMoney(trend.newPrice)}
      </div>
    </div>
  );
};

const IntroScene = ({ props, localFrame, duration }: { props: HorizontalHardwareTrendProps; localFrame: number; duration: number }) => {
  const pulse = interpolate(localFrame, [0, duration], [0, 1], { extrapolateRight: "clamp" });
  return (
    <Shell>
      <Header props={props} />
      <div style={{ marginTop: 82, display: "grid", gridTemplateColumns: "1.02fr 0.98fr", gap: 28 }}>
        <div>
          <div style={{ color: "#67e8f9", fontSize: 22, fontWeight: 900, marginBottom: 18 }}>
            今日先看曲线，不看单点情绪
          </div>
          <div style={{ fontSize: 70, lineHeight: 1.06, fontWeight: 950 }}>
            {props.headline}
          </div>
          <div style={{ marginTop: 34, color: "#d6d3d1", fontSize: 28, lineHeight: 1.42, fontWeight: 800 }}>
            先讲内存，再看硬盘，然后 CPU 和显卡，最后用行业新闻做背景。
          </div>
        </div>
        <div style={{ alignSelf: "end" }}>
          <CategoryStrip categories={props.categories} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 58,
          right: 58,
          bottom: 98,
          height: 10,
          borderRadius: 8,
          background: "rgba(214,211,209,0.11)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(pulse * 100)}%`,
            background: "linear-gradient(90deg, #06b6d4, #10b981, #f97316)",
          }}
        />
      </div>
    </Shell>
  );
};

const SingleProductScene = ({
  props,
  trend,
  localFrame,
  duration,
  title,
}: {
  props: HorizontalHardwareTrendProps;
  trend: ProductTrend;
  localFrame: number;
  duration: number;
  title: string;
}) => (
  <Shell>
    <Header props={props} />
    <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "0.42fr 0.58fr", gap: 28 }}>
      <div
        style={{
          border: "1px solid rgba(214,211,209,0.14)",
          borderRadius: 8,
          background: "rgba(28,25,23,0.72)",
          padding: 28,
          minHeight: 720,
        }}
      >
        <div style={{ color: trend.color, fontSize: 21, fontWeight: 900 }}>{title}</div>
        <div style={{ marginTop: 18, fontSize: 45, lineHeight: 1.12, fontWeight: 950 }}>
          {trimText(trend.name, 33)}
        </div>
        <ImpactPanel trend={trend} localFrame={localFrame} />
        <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Metric label="今日原价" value={formatMoney(trend.oldPrice)} />
          <Metric label="今日新价" value={formatMoney(trend.newPrice)} color={changeColor(trend.changeAmount)} />
        </div>
        <div
          style={{
            marginTop: 24,
            padding: "22px 24px",
            borderRadius: 8,
            background: "rgba(17,17,15,0.72)",
            border: "1px solid rgba(214,211,209,0.12)",
          }}
        >
          <div style={{ color: "#a8a29e", fontSize: 19, fontWeight: 850 }}>口播判断</div>
          <div style={{ marginTop: 12, color: "#fafaf9", fontSize: 30, lineHeight: 1.35, fontWeight: 900 }}>
            {trend.insight}
          </div>
        </div>
      </div>
      <TrendChart trend={trend} localFrame={localFrame} duration={duration} />
    </div>
  </Shell>
);

const CpuScene = ({
  props,
  localFrame,
  duration,
}: {
  props: HorizontalHardwareTrendProps;
  localFrame: number;
  duration: number;
}) => {
  const cpuItems = props.featured.filter((item) => item.key.startsWith("cpu")).slice(0, 2);
  return (
    <Shell>
      <Header props={props} />
      <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {cpuItems.map((item) => (
          <TrendChart key={item.key} trend={item} localFrame={localFrame} duration={duration} compact />
        ))}
      </div>
      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        {cpuItems.map((item) => (
          <div
            key={`${item.key}-insight`}
            style={{
              border: "1px solid rgba(214,211,209,0.14)",
              borderRadius: 8,
              background: "rgba(28,25,23,0.72)",
              padding: 24,
              fontSize: 30,
              lineHeight: 1.34,
              fontWeight: 900,
            }}
          >
            <span style={{ color: item.color }}>{item.shortName}</span>
            <span style={{ color: "#d6d3d1" }}>：{item.insight}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
};

const MiniSparkline = ({
  item,
  localFrame,
  duration,
}: {
  item: ProductTrend;
  localFrame: number;
  duration: number;
}) => {
  const points = pointsFor(item);
  const width = 490;
  const height = 160;
  const pad = 18;
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const toX = (index: number) => pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2);
  const toY = (price: number) => pad + (1 - (price - min) / range) * (height - pad * 2);
  const progress = interpolate(localFrame, [12, Math.min(duration - 20, 118)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const plotted = points.map((point, index) => ({ ...point, x: toX(index), y: toY(point.price) }));
  const path = plotted.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const revealId = `mini-${item.key.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div
      style={{
        border: "1px solid rgba(214,211,209,0.14)",
        borderRadius: 8,
        background: "rgba(28,25,23,0.72)",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: item.color, fontSize: 16, fontWeight: 900 }}>{item.category}</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 950 }}>{trimText(item.shortName, 22)}</div>
        </div>
        <div style={{ color: changeColor(item.changeAmount), fontSize: 28, fontWeight: 950 }}>
          {formatChange(item.changeAmount)}
        </div>
      </div>
      <svg width={width} height={height} style={{ marginTop: 10 }}>
        <defs>
          <clipPath id={revealId}>
            <rect x={0} y={0} width={pad + progress * (width - pad * 2)} height={height} />
          </clipPath>
        </defs>
        {[0, 1, 2].map((line) => (
          <line
            key={line}
            x1={pad}
            y1={pad + (line / 2) * (height - pad * 2)}
            x2={width - pad}
            y2={pad + (line / 2) * (height - pad * 2)}
            stroke="rgba(214,211,209,0.12)"
            strokeDasharray="4 7"
          />
        ))}
        <g clipPath={`url(#${revealId})`}>
          <path d={path} fill="none" stroke={item.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          {plotted.map((point, index) => (
            <circle key={`${item.key}-${index}`} cx={point.x} cy={point.y} r={3.5} fill="#fafaf9" stroke={item.color} strokeWidth={2} />
          ))}
        </g>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#a8a29e", fontSize: 16, fontWeight: 850 }}>
        <span>{points[0]?.date.slice(5)}</span>
        <span>{formatMoney(points[0]?.price || null)} → {formatMoney(points[points.length - 1]?.price || null)}</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
};

const NewsScene = ({ props, localFrame }: { props: HorizontalHardwareTrendProps; localFrame: number }) => (
  <Shell>
    <Header props={props} />
    <div style={{ marginTop: 54 }}>
      <div style={{ color: "#67e8f9", fontSize: 22, fontWeight: 900 }}>行业新闻背景</div>
      <div style={{ marginTop: 12, fontSize: 56, fontWeight: 950 }}>新闻只做解释框架，不替后台价格背锅</div>
    </div>
    <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
      {props.news.slice(0, 2).map((item, index) => {
        const cardIn = interpolate(localFrame, [index * 18, index * 18 + 34], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={`${item.source}-${index}`}
            style={{
              minHeight: 420,
              border: "1px solid rgba(214,211,209,0.14)",
              borderRadius: 8,
              background: "rgba(28,25,23,0.72)",
              padding: 34,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              opacity: cardIn,
              transform: `translateY(${(1 - cardIn) * 24}px)`,
            }}
          >
            <div>
              <div style={{ color: index === 0 ? "#f97316" : "#60a5fa", fontSize: 20, fontWeight: 900 }}>
                {item.source}
              </div>
              <div style={{ marginTop: 18, fontSize: 42, lineHeight: 1.16, fontWeight: 950 }}>
                {item.title}
              </div>
            </div>
            <div style={{ color: "#d6d3d1", fontSize: 31, lineHeight: 1.36, fontWeight: 850 }}>
              {item.summary}
            </div>
          </div>
        );
      })}
    </div>
  </Shell>
);

const CurveWallScene = ({
  props,
  localFrame,
  duration,
}: {
  props: HorizontalHardwareTrendProps;
  localFrame: number;
  duration: number;
}) => (
  <Shell>
    <Header props={props} />
    <div style={{ marginTop: 44 }}>
      <div style={{ color: "#67e8f9", fontSize: 22, fontWeight: 900 }}>全品类曲线墙</div>
      <div style={{ marginTop: 12, fontSize: 52, fontWeight: 950 }}>给二剪用：五个代表型号的 30 天走势同屏对比</div>
    </div>
    <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      {props.featured.slice(0, 5).map((item) => (
        <MiniSparkline key={item.key} item={item} localFrame={localFrame} duration={duration} />
      ))}
    </div>
  </Shell>
);

const OutroScene = ({
  props,
  localFrame,
  duration,
}: {
  props: HorizontalHardwareTrendProps;
  localFrame: number;
  duration: number;
}) => (
  <Shell>
    <Header props={props} />
    <div style={{ marginTop: 64, display: "grid", gridTemplateColumns: "0.56fr 0.44fr", gap: 28 }}>
      <div>
        <div style={{ color: "#67e8f9", fontSize: 22, fontWeight: 900 }}>收口判断</div>
        <div style={{ marginTop: 18, fontSize: 64, lineHeight: 1.16, fontWeight: 950 }}>
          显卡看二次回调，CPU 分型号比价，内存硬盘按曲线别靠感觉。
        </div>
        <div style={{ marginTop: 34, color: "#d6d3d1", fontSize: 34, lineHeight: 1.36, fontWeight: 850 }}>
          评论区留预算和用途，我帮你把配置里的水分挤出来。
        </div>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {props.featured.slice(0, 3).map((item) => (
          <MiniSparkline key={`${item.key}-outro`} item={item} localFrame={localFrame} duration={duration} />
        ))}
      </div>
    </div>
  </Shell>
);

export const HorizontalHardwareTrendVideo = (props: HorizontalHardwareTrendProps) => {
  const frame = useCurrentFrame();
  const scene = sceneAtFrame(frame);
  const gpu = props.featured.find((item) => item.key.startsWith("gpu"));
  const ram = props.featured.find((item) => item.key.startsWith("ram"));
  const disk = props.featured.find((item) => item.key.startsWith("disk"));

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#11110f" }}>
      <Background />
      {props.audioSrc ? <Audio src={staticFile(props.audioSrc)} volume={1} /> : null}
      <Scene localFrame={scene.localFrame} duration={scene.duration}>
        {scene.index === 0 && <IntroScene props={props} localFrame={scene.localFrame} duration={scene.duration} />}
        {scene.index === 1 && ram && (
          <SingleProductScene
            props={props}
            trend={ram}
            localFrame={scene.localFrame}
            duration={scene.duration}
            title="第一段：内存局部上涨，周线仍分化"
          />
        )}
        {scene.index === 2 && disk && (
          <SingleProductScene
            props={props}
            trend={disk}
            localFrame={scene.localFrame}
            duration={scene.duration}
            title="第二段：硬盘今日横盘，回看近一周"
          />
        )}
        {scene.index === 3 && <CpuScene props={props} localFrame={scene.localFrame} duration={scene.duration} />}
        {scene.index === 4 && gpu && (
          <SingleProductScene
            props={props}
            trend={gpu}
            localFrame={scene.localFrame}
            duration={scene.duration}
            title="第四段：显卡全线回调，但先看周线"
          />
        )}
        {scene.index === 5 && <NewsScene props={props} localFrame={scene.localFrame} />}
        {scene.index === 6 && <OutroScene props={props} localFrame={scene.localFrame} duration={scene.duration} />}
        {scene.index === 7 && <CurveWallScene props={props} localFrame={scene.localFrame} duration={scene.duration} />}
      </Scene>
    </AbsoluteFill>
  );
};

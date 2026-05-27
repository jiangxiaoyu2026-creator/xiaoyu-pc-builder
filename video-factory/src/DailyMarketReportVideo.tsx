import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type PricePoint = {
  date: string;
  price: number;
};

type ReportItem = {
  id: string;
  name: string;
  currentPrice: number;
  startPrice: number;
  endPrice: number;
  changeAmount: number;
  changePercent: number;
  points: PricePoint[];
};

type ReportCategory = {
  key: string;
  label: string;
  color: string;
  accent: string;
  summary: {
    startAvg: number;
    endAvg: number;
    changeAmount: number;
    changePercent: number;
    verdict: string;
  };
  items: ReportItem[];
};

export type DailyMarketReportProps = {
  date: string;
  days: number;
  title: string;
  categories: ReportCategory[];
  closingNote: string;
};

const defaultPoints = [
  { date: "2026-04-26", price: 1000 },
  { date: "2026-05-06", price: 990 },
  { date: "2026-05-16", price: 995 },
  { date: "2026-05-26", price: 985 },
];

export const defaultDailyMarketReportProps: DailyMarketReportProps = {
  date: "2026-05-26",
  days: 30,
  title: "今日硬件行情",
  closingNote: "三大件整体偏稳，适合按需比价，不建议盲目追涨。",
  categories: [
    {
      key: "cpu",
      label: "CPU",
      color: "#6366f1",
      accent: "#a5b4fc",
      summary: {
        startAvg: 1594,
        endAvg: 1594,
        changeAmount: 0,
        changePercent: 0,
        verdict: "CPU 近 30 天整体稳定，刚需装机可以重点盯主流 i5/R5。",
      },
      items: [
        {
          id: "cpu-1",
          name: "Intel i5-12400F",
          currentPrice: 900,
          startPrice: 900,
          endPrice: 900,
          changeAmount: 0,
          changePercent: 0,
          points: defaultPoints.map((point) => ({ ...point, price: 900 })),
        },
        {
          id: "cpu-2",
          name: "AMD R5 7500F",
          currentPrice: 710,
          startPrice: 710,
          endPrice: 710,
          changeAmount: 0,
          changePercent: 0,
          points: defaultPoints.map((point) => ({ ...point, price: 710 })),
        },
        {
          id: "cpu-3",
          name: "AMD R7 7800X3D",
          currentPrice: 1810,
          startPrice: 1810,
          endPrice: 1810,
          changeAmount: 0,
          changePercent: 0,
          points: defaultPoints.map((point) => ({ ...point, price: 1810 })),
        },
      ],
    },
  ],
};

const segmentFrames = {
  intro: 120,
  category: 480,
  outro: 240,
};

const formatPrice = (price: number) => `¥${Math.round(price).toLocaleString("zh-CN")}`;

const formatChange = (amount: number, percent: number) => {
  if (Math.abs(amount) < 0.5 && Math.abs(percent) < 0.05) return "持平";
  const sign = amount > 0 ? "+" : "";
  return `${sign}${Math.round(amount).toLocaleString("zh-CN")} / ${sign}${percent.toFixed(2)}%`;
};

const clampText = (text: string, max = 20) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const changeColor = (amount: number) => {
  if (amount > 0) return "#ef4444";
  if (amount < 0) return "#10b981";
  return "#cbd5e1";
};

const getSection = (frame: number, categoryCount: number) => {
  if (frame < segmentFrames.intro) {
    return { type: "intro" as const, index: -1, localFrame: frame };
  }

  const categoryStart = segmentFrames.intro;
  const categoryTotal = categoryCount * segmentFrames.category;
  if (frame < categoryStart + categoryTotal) {
    const offset = frame - categoryStart;
    return {
      type: "category" as const,
      index: Math.floor(offset / segmentFrames.category),
      localFrame: offset % segmentFrames.category,
    };
  }

  return {
    type: "outro" as const,
    index: -1,
    localFrame: frame - categoryStart - categoryTotal,
  };
};

const Background = () => {
  const frame = useCurrentFrame();
  const drift = frame * 0.45;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% -20%, rgba(79,70,229,0.28), transparent 36%), linear-gradient(180deg, #101827 0%, #0b1120 54%, #090d18 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.22,
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          transform: `translateY(${drift % 72}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 8,
          background:
            "linear-gradient(90deg, #6366f1 0%, #10b981 48%, #f59e0b 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(15,23,42,0.9), transparent 18%, transparent 82%, rgba(15,23,42,0.9))",
        }}
      />
    </AbsoluteFill>
  );
};

const MultiLineChart = ({
  category,
  localFrame,
}: {
  category: ReportCategory;
  localFrame: number;
}) => {
  const width = 940;
  const height = 600;
  const pad = { top: 70, right: 48, bottom: 72, left: 94 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const colors = ["#60a5fa", "#34d399", "#f59e0b"];

  const allPoints = category.items.flatMap((item) => item.points);
  const allPrices = allPoints.map((point) => point.price);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = Math.max(max - min, max * 0.08, 1);
  const yMin = Math.max(0, min - range * 0.2);
  const yMax = max + range * 0.2;
  const yRange = yMax - yMin || 1;
  const maxPointCount = Math.max(...category.items.map((item) => item.points.length), 2);

  const reveal = interpolate(localFrame, [50, 250], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const getX = (index: number, count: number) =>
    pad.left + (index / Math.max(count - 1, 1)) * plotWidth;
  const getY = (price: number) =>
    height - pad.bottom - ((price - yMin) / yRange) * plotHeight;

  const gridValues = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return {
      y: height - pad.bottom - ratio * plotHeight,
      price: yMin + ratio * yRange,
    };
  });

  const xLabels = category.items[0]?.points || [];
  const xStep = Math.max(1, Math.ceil(xLabels.length / 4));

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 22,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(15,23,42,0.62)",
        boxShadow: "0 26px 60px rgba(0,0,0,0.28)",
        overflow: "hidden",
      }}
    >
      <svg width={width} height={height}>
        <defs>
          <clipPath id={`chart-clip-${category.key}`}>
            <rect x={0} y={0} width={pad.left + plotWidth * reveal} height={height} />
          </clipPath>
          <filter id={`line-glow-${category.key}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {gridValues.map((grid, index) => (
          <g key={index}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={grid.y}
              y2={grid.y}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth={1}
              strokeDasharray="8 10"
            />
            <text
              x={pad.left - 18}
              y={grid.y + 7}
              fill="rgba(226,232,240,0.56)"
              fontSize={20}
              fontFamily="monospace"
              textAnchor="end"
            >
              {formatPrice(grid.price)}
            </text>
          </g>
        ))}

        {xLabels
          .filter((_, index) => index % xStep === 0 || index === xLabels.length - 1)
          .map((point, index) => (
            <text
              key={`${point.date}-${index}`}
              x={getX(xLabels.indexOf(point), xLabels.length)}
              y={height - 28}
              fill="rgba(226,232,240,0.48)"
              fontSize={19}
              fontWeight={700}
              textAnchor="middle"
            >
              {point.date.slice(5)}
            </text>
          ))}

        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={height - pad.bottom}
          y2={height - pad.bottom}
          stroke="rgba(226,232,240,0.24)"
          strokeWidth={2}
        />
        <line
          x1={pad.left}
          x2={pad.left}
          y1={pad.top}
          y2={height - pad.bottom}
          stroke="rgba(226,232,240,0.24)"
          strokeWidth={2}
        />

        <g clipPath={`url(#chart-clip-${category.key})`}>
          {category.items.map((item, itemIndex) => {
            const coords = item.points.map((point, pointIndex) => ({
              x: getX(pointIndex, item.points.length),
              y: getY(point.price),
            }));
            const path = coords
              .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
              .join(" ");
            const color = colors[itemIndex % colors.length];

            return (
              <g key={item.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={10}
                  opacity={0.2}
                  filter={`url(#line-glow-${category.key})`}
                />
                <path d={path} fill="none" stroke={color} strokeWidth={5} />
                {coords.map((point, pointIndex) => {
                  const dotVisible = reveal >= pointIndex / Math.max(maxPointCount - 1, 1);
                  return (
                    <circle
                      key={pointIndex}
                      cx={point.x}
                      cy={point.y}
                      r={dotVisible ? 6 : 0}
                      fill="#ffffff"
                      stroke={color}
                      strokeWidth={3}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>

        <line
          x1={pad.left + plotWidth * reveal}
          x2={pad.left + plotWidth * reveal}
          y1={pad.top - 18}
          y2={height - pad.bottom}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={2}
          strokeDasharray="6 8"
        />
      </svg>
    </div>
  );
};

const Intro = ({ date, title, days }: { date: string; title: string; days: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const opacity = interpolate(frame, [0, 34, 100, 120], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity,
        padding: 72,
      }}
    >
      <div
        style={{
          fontSize: 26,
          color: "#a5b4fc",
          fontWeight: 900,
          letterSpacing: 6,
          marginBottom: 26,
        }}
      >
        DIYXX MARKET DATA CENTER
      </div>
      <div
        style={{
          fontSize: 96,
          lineHeight: 1.02,
          color: "#ffffff",
          fontWeight: 950,
          textAlign: "center",
          transform: `translateY(${interpolate(titleIn, [0, 1], [36, 0])}px)`,
          textShadow: "0 18px 50px rgba(0,0,0,0.42)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 34,
          display: "flex",
          gap: 18,
          color: "#e2e8f0",
          fontSize: 30,
          fontWeight: 800,
        }}
      >
        <span>{date}</span>
        <span style={{ color: "rgba(226,232,240,0.32)" }}>/</span>
        <span>近 {days} 天价格走势</span>
      </div>
    </AbsoluteFill>
  );
};

const CategoryScene = ({
  category,
  date,
  days,
  localFrame,
}: {
  category: ReportCategory;
  date: string;
  days: number;
  localFrame: number;
}) => {
  const { fps } = useVideoConfig();
  const inSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 95 },
  });
  const sceneOpacity = interpolate(localFrame, [0, 24, 440, 480], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(inSpring, [0, 1], [38, 0], {
    extrapolateRight: "clamp",
  });
  const summaryColor = changeColor(category.summary.changeAmount);
  const colors = ["#60a5fa", "#34d399", "#f59e0b"];

  return (
    <AbsoluteFill
      style={{
        padding: "66px 70px 54px",
        opacity: sceneOpacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              color: category.accent,
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 4,
              marginBottom: 14,
            }}
          >
            {category.label} PRICE RADAR
          </div>
          <div style={{ color: "#ffffff", fontSize: 66, fontWeight: 950, lineHeight: 1 }}>
            {category.label} 近 {days} 天走势
          </div>
        </div>
        <div
          style={{
            color: "#cbd5e1",
            fontSize: 24,
            fontWeight: 800,
            border: "1px solid rgba(226,232,240,0.18)",
            borderRadius: 14,
            padding: "14px 18px",
            background: "rgba(15,23,42,0.5)",
          }}
        >
          {date}
        </div>
      </div>

      <div style={{ marginTop: 46 }}>
        <MultiLineChart category={category} localFrame={localFrame} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginTop: 22,
        }}
      >
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(15,23,42,0.66)",
            padding: 18,
            minHeight: 138,
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
            分类均价
          </div>
          <div style={{ color: "#ffffff", fontSize: 31, fontWeight: 950, fontFamily: "monospace" }}>
            {formatPrice(category.summary.endAvg)}
          </div>
          <div style={{ color: summaryColor, fontSize: 19, fontWeight: 950, marginTop: 10 }}>
            {formatChange(category.summary.changeAmount, category.summary.changePercent)}
          </div>
        </div>

        {category.items.map((item, index) => (
          <div
            key={item.id}
            style={{
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(255,255,255,0.045)",
              padding: "18px 16px 16px",
              minHeight: 138,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 20,
                  background: colors[index % colors.length],
                  boxShadow: `0 0 16px ${colors[index % colors.length]}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 900 }}>
                {clampText(item.name, 12)}
              </div>
            </div>
            <div style={{ color: "#ffffff", fontSize: 28, fontWeight: 950, fontFamily: "monospace" }}>
              {formatPrice(item.endPrice)}
            </div>
            <div style={{ color: changeColor(item.changeAmount), fontSize: 19, fontWeight: 900, marginTop: 8 }}>
              {formatChange(item.changeAmount, item.changePercent)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 32,
          borderRadius: 24,
          background: "linear-gradient(90deg, rgba(99,102,241,0.18), rgba(16,185,129,0.11))",
          border: "1px solid rgba(226,232,240,0.14)",
          padding: "26px 30px",
          color: "#ffffff",
          fontSize: 33,
          lineHeight: 1.32,
          fontWeight: 900,
        }}
      >
        {category.summary.verdict}
      </div>
    </AbsoluteFill>
  );
};

const Outro = ({
  categories,
  closingNote,
  localFrame,
}: Pick<DailyMarketReportProps, "categories" | "closingNote"> & { localFrame: number }) => {
  const opacity = interpolate(localFrame, [0, 30, 210, 240], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ padding: 76, justifyContent: "center", opacity }}>
      <div style={{ color: "#a5b4fc", fontSize: 28, fontWeight: 950, letterSpacing: 5 }}>
        TODAY SUMMARY
      </div>
      <div style={{ color: "#ffffff", fontSize: 76, fontWeight: 950, marginTop: 18 }}>
        今日三大件结论
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 46 }}>
        {categories.map((category) => (
          <div
            key={category.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderRadius: 22,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(15,23,42,0.62)",
              padding: "26px 30px",
            }}
          >
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <div
                style={{
                  width: 15,
                  height: 46,
                  borderRadius: 20,
                  background: category.color,
                }}
              />
              <span style={{ color: "#ffffff", fontSize: 34, fontWeight: 950 }}>
                {category.label}
              </span>
            </div>
            <div
              style={{
                color: changeColor(category.summary.changeAmount),
                fontSize: 32,
                fontWeight: 950,
                fontFamily: "monospace",
              }}
            >
              {formatChange(category.summary.changeAmount, category.summary.changePercent)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 50,
          color: "#e2e8f0",
          fontSize: 38,
          lineHeight: 1.36,
          fontWeight: 900,
        }}
      >
        {closingNote}
      </div>
    </AbsoluteFill>
  );
};

export const DailyMarketReportVideo = ({
  date,
  days,
  title,
  categories,
  closingNote,
}: DailyMarketReportProps) => {
  const frame = useCurrentFrame();
  const section = getSection(frame, categories.length);

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, Arial, sans-serif", overflow: "hidden" }}>
      <Background />
      {section.type === "intro" && <Intro date={date} title={title} days={days} />}
      {section.type === "category" && categories[section.index] && (
        <CategoryScene
          category={categories[section.index]}
          date={date}
          days={days}
          localFrame={section.localFrame}
        />
      )}
      {section.type === "outro" && (
        <Outro categories={categories} closingNote={closingNote} localFrame={section.localFrame} />
      )}

      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          bottom: 28,
          height: 1,
          background: "rgba(226,232,240,0.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 42,
          color: "rgba(226,232,240,0.42)",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: 2,
        }}
      >
        DATA FROM DIYXX BACKEND API
      </div>
      <div
        style={{
          position: "absolute",
          right: 70,
          bottom: 42,
          color: "rgba(226,232,240,0.42)",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: 2,
        }}
      >
        CPU / MEMORY / SSD
      </div>
    </AbsoluteFill>
  );
};

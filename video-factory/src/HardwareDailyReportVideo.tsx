import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ReactNode } from "react";

type DailyStats = {
  changed: number;
  up: number;
  down: number;
  avgUp: number;
  avgDown: number;
};

type ChangeItem = {
  name: string;
  oldPrice: number | null;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
};

type CategorySection = {
  key: string;
  label: string;
  eyebrow: string;
  color: string;
  summary: string;
  stats: DailyStats;
  topChanges: ChangeItem[];
  bullets: string[];
};

type NewsItem = {
  title: string;
  body: string;
  source: string;
};

type SourceRow = {
  category: string;
  name: string;
  oldPrice: string;
  newPrice: string;
  changeAmount: string;
  changePercent: string;
  status: string;
};

export type HardwareDailyReportProps = {
  date: string;
  title: string;
  headline: string;
  categories: CategorySection[];
  news: NewsItem[];
  sourceRows: SourceRow[];
  closing: string;
};

export const defaultHardwareDailyReportProps: HardwareDailyReportProps = {
  date: "2026-05-26",
  title: "蒋小鱼硬件行情日报",
  headline: "显卡降价，CPU 分化\n内存局部涨，硬盘横盘。",
  categories: [],
  news: [],
  sourceRows: [],
  closing: "关注我，每天带你看透真实价格，绝不当冤种。",
};

const formatMoney = (value: number | null) =>
  value === null ? "-" : `¥${Math.round(value).toLocaleString("zh-CN")}`;

const formatChange = (value: number) => {
  if (Math.abs(value) < 0.01) return "0";
  return `${value > 0 ? "+" : ""}${Math.round(value).toLocaleString("zh-CN")}`;
};

const colorForChange = (value: number) => {
  if (value > 0) return "#ef4444";
  if (value < 0) return "#10b981";
  return "#cbd5e1";
};

const trimText = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const sceneDurations = [90, 150, 210, 180, 240, 270, 210, 240, 210];

const sceneAtFrame = (frame: number) => {
  let cursor = 0;
  for (let index = 0; index < sceneDurations.length; index += 1) {
    const duration = sceneDurations[index];
    if (frame < cursor + duration) {
      return { index, localFrame: frame - cursor, duration };
    }
    cursor += duration;
  }
  return {
    index: sceneDurations.length - 1,
    localFrame: sceneDurations[sceneDurations.length - 1] - 1,
    duration: sceneDurations[sceneDurations.length - 1],
  };
};

export const hardwareDailyDurationFrames = sceneDurations.reduce(
  (sum, item) => sum + item,
  0,
);

const Background = () => {
  const frame = useCurrentFrame();
  const drift = frame * 0.28;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% -12%, rgba(99,102,241,0.32), transparent 34%), linear-gradient(180deg, #111827 0%, #0b1120 58%, #060914 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.1) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          transform: `translateY(${drift % 72}px)`,
          opacity: 0.42,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background:
            "linear-gradient(90deg, #6366f1, #06b6d4 35%, #10b981 68%, #f59e0b)",
        }}
      />
    </AbsoluteFill>
  );
};

const Shell = ({ children }: { children: ReactNode }) => (
  <AbsoluteFill style={{ padding: "70px 70px 54px", color: "#f8fafc" }}>
    {children}
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 34,
        height: 1,
        background: "rgba(226,232,240,0.12)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 70,
        bottom: 48,
        color: "rgba(226,232,240,0.42)",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 2,
      }}
    >
      DIYXX.COM MARKET DATA
    </div>
    <div
      style={{
        position: "absolute",
        right: 70,
        bottom: 48,
        color: "rgba(226,232,240,0.42)",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 2,
      }}
    >
      HARDWARE DAILY REPORT
    </div>
  </AbsoluteFill>
);

const AnimatedScene = ({
  children,
  localFrame,
  duration,
}: {
  children: ReactNode;
  localFrame: number;
  duration: number;
}) => {
  const { fps } = useVideoConfig();
  const intro = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const opacity = interpolate(
    localFrame,
    [0, 24, duration - 30, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const y = interpolate(intro, [0, 1], [36, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

const IntroScene = ({ props }: { props: HardwareDailyReportProps }) => (
  <Shell>
    <div style={{ marginTop: 460 }}>
      <div
        style={{
          color: "#a5b4fc",
          fontSize: 30,
          fontWeight: 950,
          letterSpacing: 7,
          marginBottom: 24,
        }}
      >
        JIANG XIAOYU MARKET BRIEF
      </div>
      <div style={{ fontSize: 86, fontWeight: 950, lineHeight: 1.05 }}>
        {props.title}
      </div>
      <div
        style={{
          marginTop: 34,
          display: "inline-flex",
          border: "1px solid rgba(226,232,240,0.18)",
          borderRadius: 18,
          padding: "14px 20px",
          color: "#cbd5e1",
          fontSize: 28,
          fontWeight: 850,
          background: "rgba(15,23,42,0.56)",
        }}
      >
        {props.date}
      </div>
    </div>
  </Shell>
);

const OverviewScene = ({ props }: { props: HardwareDailyReportProps }) => (
  <Shell>
    <div style={{ marginTop: 220 }}>
      <div style={{ color: "#67e8f9", fontSize: 28, fontWeight: 950, letterSpacing: 5 }}>
        今日一句话
      </div>
      <div
        style={{
          marginTop: 26,
          fontSize: 70,
          lineHeight: 1.22,
          fontWeight: 950,
          whiteSpace: "pre-line",
        }}
      >
        {props.headline}
      </div>
      <div
        style={{
          marginTop: 56,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 18,
        }}
      >
        {props.categories.map((category) => (
          <div
            key={category.key}
            style={{
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(15,23,42,0.62)",
              borderRadius: 22,
              padding: 24,
              minHeight: 170,
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div
                style={{
                  width: 12,
                  height: 42,
                  borderRadius: 999,
                  background: category.color,
                }}
              />
              <div style={{ fontSize: 34, fontWeight: 950 }}>{category.label}</div>
            </div>
            <div style={{ marginTop: 24, fontSize: 24, color: "#cbd5e1", fontWeight: 850 }}>
              变动 {category.stats.changed} 款 / 涨 {category.stats.up} / 降 {category.stats.down}
            </div>
          </div>
        ))}
      </div>
    </div>
  </Shell>
);

const StatPill = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div
    style={{
      borderRadius: 18,
      border: "1px solid rgba(148,163,184,0.18)",
      background: "rgba(15,23,42,0.62)",
      padding: "18px 20px",
    }}
  >
    <div style={{ color: "#94a3b8", fontSize: 18, fontWeight: 900 }}>{label}</div>
    <div style={{ color, fontSize: 34, fontWeight: 950, marginTop: 8 }}>{value}</div>
  </div>
);

const CategoryScene = ({ category }: { category: CategorySection }) => (
  <Shell>
    <div style={{ color: category.color, fontSize: 27, fontWeight: 950, letterSpacing: 5 }}>
      {category.eyebrow}
    </div>
    <div style={{ marginTop: 14, fontSize: 68, fontWeight: 950 }}>{category.label}</div>
    <div style={{ marginTop: 22, fontSize: 34, lineHeight: 1.32, fontWeight: 900 }}>
      {category.summary}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 34 }}>
      <StatPill label="变动产品" value={`${category.stats.changed} 款`} color="#f8fafc" />
      <StatPill label="上涨 / 下跌" value={`${category.stats.up} / ${category.stats.down}`} color={category.color} />
      <StatPill
        label="均涨 / 均降"
        value={`${formatChange(category.stats.avgUp)} / ${formatChange(category.stats.avgDown)}`}
        color={category.stats.avgDown < 0 ? "#10b981" : "#f8fafc"}
      />
    </div>

    <div style={{ marginTop: 34 }}>
      <div style={{ fontSize: 25, color: "#94a3b8", fontWeight: 950, marginBottom: 16 }}>
        重点变动
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(category.topChanges.length ? category.topChanges : []).slice(0, 4).map((item) => (
          <div
            key={`${category.key}-${item.name}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 190px 180px",
              gap: 16,
              alignItems: "center",
              borderRadius: 20,
              border: "1px solid rgba(148,163,184,0.16)",
              background: "rgba(255,255,255,0.045)",
              padding: "18px 20px",
            }}
          >
            <div style={{ fontSize: 27, fontWeight: 900 }}>{trimText(item.name, 22)}</div>
            <div style={{ fontSize: 26, fontWeight: 950, fontFamily: "monospace" }}>
              {formatMoney(item.newPrice)}
            </div>
            <div
              style={{
                color: colorForChange(item.changeAmount),
                fontSize: 27,
                fontWeight: 950,
                textAlign: "right",
              }}
            >
              {formatChange(item.changeAmount)}
            </div>
          </div>
        ))}
        {!category.topChanges.length && (
          <div
            style={{
              borderRadius: 20,
              border: "1px solid rgba(148,163,184,0.16)",
              background: "rgba(255,255,255,0.045)",
              padding: "28px 24px",
              color: "#cbd5e1",
              fontSize: 31,
              fontWeight: 900,
            }}
          >
            今日无变动型号，适合横盘观察。
          </div>
        )}
      </div>
    </div>

    <div
      style={{
        marginTop: 32,
        borderRadius: 24,
        background: "linear-gradient(90deg, rgba(99,102,241,0.18), rgba(16,185,129,0.11))",
        border: "1px solid rgba(226,232,240,0.14)",
        padding: "24px 28px",
      }}
    >
      {category.bullets.map((bullet) => (
        <div key={bullet} style={{ fontSize: 30, lineHeight: 1.34, fontWeight: 900 }}>
          {bullet}
        </div>
      ))}
    </div>
  </Shell>
);

const NewsScene = ({ news }: { news: NewsItem[] }) => (
  <Shell>
    <div style={{ marginTop: 130 }}>
      <div style={{ color: "#fbbf24", fontSize: 28, fontWeight: 950, letterSpacing: 5 }}>
        行业新闻素材
      </div>
      <div style={{ marginTop: 18, fontSize: 66, fontWeight: 950 }}>AI 需求仍在挤压供给</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 50 }}>
        {news.map((item, index) => (
          <div
            key={item.title}
            style={{
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: 24,
              background: "rgba(15,23,42,0.64)",
              padding: "28px 30px",
            }}
          >
            <div style={{ color: index === 0 ? "#67e8f9" : "#a5b4fc", fontSize: 25, fontWeight: 950 }}>
              {item.source}
            </div>
            <div style={{ marginTop: 12, fontSize: 34, fontWeight: 950 }}>{item.title}</div>
            <div style={{ marginTop: 14, color: "#cbd5e1", fontSize: 27, lineHeight: 1.35, fontWeight: 800 }}>
              {item.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  </Shell>
);

const SourceScene = ({ rows }: { rows: SourceRow[] }) => (
  <Shell>
    <div style={{ color: "#a5b4fc", fontSize: 28, fontWeight: 950, letterSpacing: 5 }}>
      数据溯源表
    </div>
    <div style={{ marginTop: 16, fontSize: 62, fontWeight: 950 }}>剪辑校对用</div>
    <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.slice(0, 9).map((row) => (
        <div
          key={`${row.category}-${row.name}`}
          style={{
            display: "grid",
            gridTemplateColumns: "90px 1fr 130px 130px 130px",
            gap: 10,
            alignItems: "center",
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.14)",
            background: "rgba(255,255,255,0.045)",
            padding: "14px 16px",
            fontSize: 20,
            fontWeight: 850,
          }}
        >
          <div style={{ color: "#a5b4fc" }}>{row.category}</div>
          <div>{trimText(row.name, 20)}</div>
          <div>{row.oldPrice}</div>
          <div>{row.newPrice}</div>
          <div style={{ color: row.changeAmount.startsWith("-") ? "#10b981" : row.changeAmount === "0" ? "#cbd5e1" : "#ef4444" }}>
            {row.changeAmount}
          </div>
        </div>
      ))}
    </div>
  </Shell>
);

const OutroScene = ({ closing }: { closing: string }) => (
  <Shell>
    <div style={{ marginTop: 470 }}>
      <div style={{ color: "#67e8f9", fontSize: 28, fontWeight: 950, letterSpacing: 5 }}>
        今日结论
      </div>
      <div style={{ marginTop: 24, fontSize: 72, lineHeight: 1.22, fontWeight: 950 }}>
        {closing}
      </div>
    </div>
  </Shell>
);

export const HardwareDailyReportVideo = (props: HardwareDailyReportProps) => {
  const frame = useCurrentFrame();
  const scene = sceneAtFrame(frame);
  const categoryScenes = props.categories.slice(0, 4);

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, Arial, sans-serif", overflow: "hidden" }}>
      <Background />
      <AnimatedScene localFrame={scene.localFrame} duration={scene.duration}>
        {scene.index === 0 && <IntroScene props={props} />}
        {scene.index === 1 && <OverviewScene props={props} />}
        {scene.index >= 2 && scene.index <= 5 && categoryScenes[scene.index - 2] && (
          <CategoryScene category={categoryScenes[scene.index - 2]} />
        )}
        {scene.index === 6 && <NewsScene news={props.news} />}
        {scene.index === 7 && <SourceScene rows={props.sourceRows} />}
        {scene.index === 8 && <OutroScene closing={props.closing} />}
      </AnimatedScene>
    </AbsoluteFill>
  );
};

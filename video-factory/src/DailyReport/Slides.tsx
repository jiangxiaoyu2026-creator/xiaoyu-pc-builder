import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { TrendChart } from "../components/TrendChart";
import { CompareChart } from "../components/CompareChart";
import { ProductItem, NewsItem, SeriesItem } from "./types";

const FONT = "system-ui, -apple-system, 'PingFang SC', sans-serif";

// ---- Shared entrance spring ----
const useSpring_ = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 20, stiffness: 50, mass: 1.2 },
  });
};

// ---- Shared slide wrapper ----
const Slide: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const s = useSpring_();
  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        padding: "170px 50px 120px",
        display: "flex",
        flexDirection: "column",
        opacity: interpolate(s, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ================================================================
//  1. Opening
// ================================================================
export const OpeningSlide: React.FC<{ date: string }> = ({ date }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, month, day] = date.split("-");
  const dateS = spring({ frame, fps, config: { damping: 18, stiffness: 40, mass: 1.5 } });
  const titleS = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 40, mass: 1.5 } });
  const brandS = spring({ frame: frame - 30, fps, config: { damping: 18, stiffness: 40, mass: 1.5 } });

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: interpolate(dateS, [0, 1], [0, 200]),
          height: 4,
          background: "linear-gradient(90deg, #6366f1, #818cf8)",
          borderRadius: 2,
          marginBottom: 40,
        }}
      />
      <div
        style={{
          opacity: interpolate(dateS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(dateS, [0, 1], [50, 0])}px)`,
        }}
      >
        <span style={{ fontSize: 130, fontWeight: 900, color: "#6366f1", lineHeight: 1, letterSpacing: -4 }}>
          {month}.{day}
        </span>
      </div>
      <div
        style={{
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [40, 0])}px)`,
          marginTop: 28,
        }}
      >
        <span style={{ fontSize: 68, fontWeight: 900, color: "#1e293b" }}>硬件行情日报</span>
      </div>
      <div
        style={{
          opacity: interpolate(brandS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(brandS, [0, 1], [30, 0])}px)`,
          marginTop: 20,
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 700, color: "#94a3b8", letterSpacing: 6 }}>
          DIYXX.COM
        </span>
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 60 }}>
        {["💻", "🎮", "💾", "💿"].map((icon, i) => {
          const iconS = spring({ frame: frame - 45 - i * 8, fps, config: { damping: 15, stiffness: 80 } });
          return (
            <div
              key={i}
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                background: "#fff",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                opacity: interpolate(iconS, [0, 1], [0, 1]),
                transform: `scale(${interpolate(iconS, [0, 1], [0.5, 1])})`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {icon}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
//  2. Section Intro
// ================================================================
const ICONS: Record<string, string> = { 内存: "💾", CPU: "🔥", 硬盘: "💿", 显卡: "🎮" };
const DIR_COLORS: Record<string, string> = {
  up: "#e11d48",
  down: "#059669",
  mixed: "#6366f1",
  flat: "#94a3b8",
};

export const SectionIntroSlide: React.FC<{
  category: string;
  directionLabel: string;
  directionType: string;
  totalChanged: number;
  upCount: number;
  downCount: number;
  avgChange?: number;
}> = ({ category, directionLabel, directionType, totalChanged, upCount, downCount, avgChange }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const iconS = spring({ frame, fps, config: { damping: 15, stiffness: 50, mass: 1.5 } });
  const nameS = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  const statsS = spring({ frame: frame - 25, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  const dirColor = DIR_COLORS[directionType] || "#94a3b8";
  const icon = ICONS[category] || "📦";

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 80,
          opacity: interpolate(iconS, [0, 1], [0, 1]),
          transform: `scale(${interpolate(iconS, [0, 1], [0.3, 1])})`,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          opacity: interpolate(nameS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(nameS, [0, 1], [30, 0])}px)`,
          marginTop: 20,
        }}
      >
        <span style={{ fontSize: 72, fontWeight: 900, color: "#1e293b" }}>{category}</span>
      </div>
      <div
        style={{
          opacity: interpolate(nameS, [0, 1], [0, 1]),
          marginTop: 16,
          background: `${dirColor}15`,
          border: `2px solid ${dirColor}40`,
          borderRadius: 16,
          padding: "8px 28px",
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 800, color: dirColor }}>{directionLabel}</span>
      </div>
      <div
        style={{
          opacity: interpolate(statsS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(statsS, [0, 1], [20, 0])}px)`,
          marginTop: 40,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 700, color: "#64748b" }}>
          {totalChanged}款变动
        </span>
        {totalChanged > 0 && (
          <>
            <span style={{ fontSize: 22, color: "#cbd5e1" }}>·</span>
            {downCount > 0 && (
              <span style={{ fontSize: 28, fontWeight: 700, color: "#059669" }}>{downCount}降</span>
            )}
            {upCount > 0 && (
              <span style={{ fontSize: 28, fontWeight: 700, color: "#e11d48" }}>{upCount}涨</span>
            )}
          </>
        )}
      </div>
      {avgChange != null && avgChange !== 0 && (
        <div style={{ opacity: interpolate(statsS, [0, 1], [0, 1]), marginTop: 16 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#94a3b8" }}>
            平均降幅 ¥{Math.abs(avgChange)}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ================================================================
//  3. Product List
// ================================================================
export const ProductListSlide: React.FC<{
  title: string;
  products: ProductItem[];
  titleColor?: string;
  summary?: string;
}> = ({ title, products, titleColor = "#1e293b", summary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerS = spring({ frame, fps, config: { damping: 20, stiffness: 50, mass: 1.2 } });

  return (
    <Slide>
      <div style={{ opacity: interpolate(headerS, [0, 1], [0, 1]), marginBottom: 20 }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: titleColor }}>{title}</span>
        <div style={{ height: 3, width: 60, background: "#6366f1", borderRadius: 2, marginTop: 10 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {products.map((p, i) => {
          const itemS = spring({
            frame: frame - 12 - i * 7,
            fps,
            config: { damping: 18, stiffness: 60, mass: 1 },
          });
          const isUp = p.change > 0;
          return (
            <div
              key={i}
              style={{
                opacity: interpolate(itemS, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(itemS, [0, 1], [40, 0])}px)`,
                background: "#ffffff",
                border: `1px solid ${isUp ? "#fecdd3" : "#bbf7d0"}`,
                borderRadius: 14,
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#334155",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </div>
                {p.note && (
                  <div style={{ fontSize: 19, fontWeight: 600, color: "#94a3b8", marginTop: 3 }}>
                    {p.note}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: isUp ? "#e11d48" : "#059669" }}>
                  {isUp ? "↑" : "↓"} ¥{Math.abs(p.change)}
                </span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#1e293b",
                    background: "#f1f5f9",
                    borderRadius: 10,
                    padding: "3px 12px",
                  }}
                >
                  ¥{p.currentPrice.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {summary && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 20px",
            background: "#f1f5f9",
            borderRadius: 12,
            opacity: interpolate(
              spring({ frame: frame - 40, fps, config: { damping: 20, stiffness: 50, mass: 1.2 } }),
              [0, 1],
              [0, 1]
            ),
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 700, color: "#64748b", lineHeight: 1.5 }}>
            💡 {summary}
          </span>
        </div>
      )}
    </Slide>
  );
};

// ================================================================
//  4. Compare Chart Slide
// ================================================================
export const CompareSlide: React.FC<{
  title: string;
  series: SeriesItem[];
}> = ({ title, series }) => {
  const s = useSpring_();
  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        padding: "170px 50px 120px",
        display: "flex",
        flexDirection: "column",
        opacity: interpolate(s, [0, 1], [0, 1]),
      }}
    >
      <div style={{ fontSize: 34, fontWeight: 800, color: "#1e293b", marginBottom: 14, textAlign: "center" }}>
        {title}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 16 }}>
        {series.map((sr, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: `${sr.color}12`,
              border: `2px solid ${sr.color}40`,
              borderRadius: 12,
              padding: "6px 16px",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: sr.color }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: sr.color }}>{sr.label}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#64748b" }}>
              ¥{Math.round(sr.endPrice).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CompareChart series={series} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: "#cbd5e1", textAlign: "center", marginTop: 12 }}>
        DIYXX.COM · 硬件行情数据中心
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
//  5. Summary Slide
// ================================================================
export const SummarySlide: React.FC<{ text: string; warning?: string }> = ({ text, warning }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const textS = spring({ frame, fps, config: { damping: 20, stiffness: 50, mass: 1.2 } });
  const warnS = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 50, mass: 1.2 } });

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "170px 60px 120px",
      }}
    >
      <div
        style={{
          opacity: interpolate(textS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(textS, [0, 1], [30, 0])}px)`,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 20,
          padding: "36px 40px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, color: "#334155", lineHeight: 1.6 }}>{text}</div>
      </div>
      {warning && (
        <div
          style={{
            opacity: interpolate(warnS, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(warnS, [0, 1], [20, 0])}px)`,
            marginTop: 20,
            background: "#fffbeb",
            border: "2px solid #fde68a",
            borderRadius: 16,
            padding: "20px 30px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, color: "#92400e", lineHeight: 1.5 }}>
            ⚠️ {warning}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ================================================================
//  6. Disk Flat Slide (no changes)
// ================================================================
export const DiskFlatSlide: React.FC = () => {
  const s = useSpring_();
  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity: interpolate(s, [0, 1], [0, 1]),
          transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 20 }}>💿</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "#1e293b" }}>硬盘</div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#94a3b8",
            marginTop: 16,
            background: "#f1f5f9",
            borderRadius: 14,
            padding: "10px 30px",
            display: "inline-block",
          }}
        >
          今日零变动 · 横盘观望
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: "#94a3b8", marginTop: 24 }}>
          按需购买即可
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
//  7. News Card Slide
// ================================================================
export const NewsCardSlide: React.FC<{ item: NewsItem; index: number }> = ({ item, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  const contentS = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "170px 50px 120px",
      }}
    >
      <div
        style={{
          opacity: interpolate(cardS, [0, 1], [0, 1]),
          background: "#6366f1",
          borderRadius: 12,
          padding: "6px 20px",
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 800, color: "#ffffff" }}>
          📰 行业动态 #{index + 1}
        </span>
      </div>
      <div
        style={{
          opacity: interpolate(cardS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(cardS, [0, 1], [40, 0])}px)`,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 22,
          padding: "36px",
          width: "100%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 800, color: "#1e293b", lineHeight: 1.5, marginBottom: 16 }}>
          {item.headline}
        </div>
        {item.stat && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 52, fontWeight: 900, color: "#6366f1" }}>{item.stat}</span>
            {item.statLabel && (
              <span style={{ fontSize: 24, fontWeight: 700, color: "#94a3b8" }}>{item.statLabel}</span>
            )}
          </div>
        )}
        <div
          style={{
            opacity: interpolate(contentS, [0, 1], [0, 1]),
            fontSize: 26,
            fontWeight: 600,
            color: "#64748b",
            lineHeight: 1.7,
          }}
        >
          {item.content}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
//  8. Closing Slide
// ================================================================
export const ClosingSlide: React.FC<{ date: string }> = ({ date }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 40, mass: 1.5 } });
  const ctaS = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 40, mass: 1.5 } });
  const pulse = Math.sin(frame * 0.1) * 0.03 + 1;

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity: interpolate(s, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 800, color: "#1e293b", lineHeight: 1.5 }}>
          关注我
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#64748b", marginTop: 8 }}>
          每天带你了解最新行情
        </div>
      </div>
      <div
        style={{
          opacity: interpolate(ctaS, [0, 1], [0, 1]),
          transform: `scale(${interpolate(ctaS, [0, 1], [0.5, 1]) * pulse})`,
          marginTop: 40,
          background: "linear-gradient(135deg, #6366f1, #818cf8)",
          borderRadius: 20,
          padding: "16px 48px",
          boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 800, color: "#ffffff" }}>+ 关注</span>
      </div>
      <div style={{ opacity: interpolate(ctaS, [0, 1], [0, 1]), marginTop: 50 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: "#cbd5e1", letterSpacing: 4 }}>
          DIYXX.COM · {date}
        </span>
      </div>
    </AbsoluteFill>
  );
};

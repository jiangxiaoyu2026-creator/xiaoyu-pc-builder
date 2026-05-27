import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

const FONT = "system-ui, -apple-system, 'PingFang SC', sans-serif";

// ================================================================
//  Sparkline: 小型折线图
// ================================================================
const Sparkline: React.FC<{ data: number[]; color?: string; w?: number; h?: number }> = ({
  data, color = "#6366f1", w = 80, h = 22,
}) => {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} />;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - mn) / rng) * (h - 4)}`)
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ================================================================
//  PriceGridVideo: 通用价格表格
//  用于 DDR5/硬盘/GPU 等所有表格场景
// ================================================================
export interface GridRow {
  name: string;
  price: number;
  todayChange?: number;
  price7d?: number;
  change7d?: number;
  pct7d?: number;
  price30d?: number;
  change30d?: number;
  pct30d?: number;
  sparkline?: number[];
  highlight?: "price" | "change" | null;
}

export interface PriceGridProps {
  title: string;
  titleBadge?: { text: string; color: string };
  rows: GridRow[];
  columns: ("price" | "change" | "7d" | "30d" | "sparkline")[];
  note?: string;
  highlightRow?: number;
  highlightField?: "price" | "change";
}

export const PriceGridVideo: React.FC<PriceGridProps> = ({
  title, titleBadge, rows, columns, note, highlightRow, highlightField,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });

  // Column widths — sized for 1080px mobile readability
  const colW: Record<string, number> = { price: 130, change: 110, "7d": 160, "30d": 160, sparkline: 90 };
  const colLabel: Record<string, string> = { price: "今日价", change: "今日变动", "7d": "7天", "30d": "30天", sparkline: "走势" };

  function fmtChange(val?: number, pct?: number) {
    if (val === undefined && pct === undefined) return { text: "—", color: "#94a3b8" };
    const v = val || 0;
    const prefix = v > 0 ? "↑" : v < 0 ? "↓" : "";
    const color = v > 0 ? "#e11d48" : v < 0 ? "#059669" : "#94a3b8";
    let text = `${prefix}¥${Math.abs(v)}`;
    if (pct !== undefined && pct !== 0) text += ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`;
    return { text, color };
  }

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 30px 200px",
      }}
    >
      {/* Title */}
      <div
        style={{
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
          marginBottom: 30,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span style={{ fontSize: 52, fontWeight: 900, color: "#1e293b" }}>{title}</span>
        {titleBadge && (
          <span
            style={{
              fontSize: 28, fontWeight: 800, color: titleBadge.color,
              background: `${titleBadge.color}14`, border: `2px solid ${titleBadge.color}40`,
              borderRadius: 10, padding: "4px 14px",
            }}
          >
            {titleBadge.text}
          </span>
        )}
      </div>

      {/* Header row */}
      <div
        style={{
          width: "100%", maxWidth: 1000, display: "flex", padding: "0 16px", marginBottom: 10,
          opacity: interpolate(titleS, [0, 1], [0, 0.6]),
        }}
      >
        <span style={{ flex: 1, fontSize: 24, fontWeight: 700, color: "#94a3b8" }}>产品</span>
        {columns.map((col) => (
          <span key={col} style={{ width: colW[col], fontSize: 24, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>
            {colLabel[col]}
          </span>
        ))}
      </div>

      {/* Data rows */}
      <div style={{ width: "100%", maxWidth: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, i) => {
          const rowS = spring({ frame: frame - 10 - i * 6, fps, config: { damping: 18, stiffness: 60 } });
          const isHL = highlightRow === i;
          const hlS = isHL
            ? spring({ frame: frame - 60 - i * 6, fps, config: { damping: 10, stiffness: 25, mass: 1.8 } })
            : 0;

          return (
            <div
              key={i}
              style={{
                opacity: interpolate(rowS, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(rowS, [0, 1], [40, 0])}px)`,
                background: isHL ? `rgba(99,102,241,${interpolate(hlS as number, [0, 1], [0, 0.06])})` : "#fff",
                border: isHL ? "2px solid #818cf8" : "1px solid #e2e8f0",
                borderRadius: 16, padding: "16px 18px",
                display: "flex", alignItems: "center",
              }}
            >
              {/* Product name */}
              <span style={{ flex: 1, fontSize: 30, fontWeight: 700, color: "#334155", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {row.name}
              </span>

              {columns.map((col) => {
                const isHLCell = isHL && highlightField === col;
                const scale = isHLCell ? interpolate(hlS as number, [0, 1], [1, 1.35]) : 1;

                let content: React.ReactNode = null;
                let cellColor = "#1e293b";

                if (col === "price") {
                  content = `¥${row.price.toLocaleString()}`;
                  cellColor = "#1e293b";
                } else if (col === "change") {
                  const f = fmtChange(row.todayChange);
                  content = f.text;
                  cellColor = f.color;
                } else if (col === "7d") {
                  const f = fmtChange(row.change7d, row.pct7d);
                  const p7 = row.price7d || (row.price + (row.change7d || 0) * -1);
                  content = (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: "#475569" }}>¥{p7.toLocaleString()}</span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: f.color }}>{f.text}</span>
                    </div>
                  );
                  cellColor = "#475569";
                } else if (col === "30d") {
                  const f = fmtChange(row.change30d, row.pct30d);
                  const p30 = row.price30d || (row.price + (row.change30d || 0) * -1);
                  content = (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: "#475569" }}>¥{p30.toLocaleString()}</span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: f.color }}>{f.text}</span>
                    </div>
                  );
                  cellColor = "#475569";
                } else if (col === "sparkline") {
                  const sc = row.sparkline || [];
                  const clr = sc.length >= 2 ? (sc[sc.length - 1] >= sc[0] ? "#e11d48" : "#059669") : "#94a3b8";
                  content = <Sparkline data={sc} color={clr} />;
                }

                return (
                  <div
                    key={col}
                    style={{
                      width: colW[col], textAlign: "center", fontSize: col === "sparkline" ? 14 : 28,
                      fontWeight: 800, color: cellColor,
                      transform: `scale(${scale})`, transformOrigin: "center",
                      transition: "transform 0.3s",
                    }}
                  >
                    {isHLCell && (
                      <div
                        style={{
                          position: "absolute",
                          inset: -4,
                          border: `3px solid #6366f1`,
                          borderRadius: 10,
                          opacity: interpolate(hlS as number, [0, 1], [0, 0.8]),
                        }}
                      />
                    )}
                    {content}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {note && (
        <div
          style={{
            marginTop: 20,
            opacity: interpolate(spring({ frame: frame - 50, fps, config: { damping: 20, stiffness: 40 } }), [0, 1], [0, 0.7]),
            fontSize: 24, fontWeight: 700, color: "#94a3b8", textAlign: "center",
          }}
        >
          {note}
        </div>
      )}

      <div style={{ marginTop: 16, opacity: 0.4, fontSize: 18, fontWeight: 600, color: "#cbd5e1" }}>DIYXX.COM</div>
    </AbsoluteFill>
  );
};

// ================================================================
//  SplitGridVideo: AMD vs Intel 上下分屏对比（含价格+30天）
// ================================================================
export interface SplitSection {
  title: string;
  color: string;
  rows: { name: string; price: number; todayChange: number; change7d?: number; price7d?: number; change30d?: number; price30d?: number }[];
}

export interface SplitGridProps {
  topSection: SplitSection;
  bottomSection: SplitSection;
}

export const SplitGridVideo: React.FC<SplitGridProps> = ({ topSection, bottomSection }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 18, stiffness: 50 } });

  const fmtCh = (v: number) => {
    const arrow = v > 0 ? "↑" : v < 0 ? "↓" : "";
    const color = v > 0 ? "#e11d48" : v < 0 ? "#059669" : "#94a3b8";
    return { text: v !== 0 ? `${arrow}${Math.abs(v)}` : "—", color };
  };

  const renderSection = (sec: SplitSection, delay: number) => {
    const sS = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 50 } });
    return (
      <div
        style={{
          opacity: interpolate(sS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(sS, [0, 1], [30, 0])}px)`,
          width: "100%", maxWidth: 1000,
        }}
      >
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 6, height: 36, borderRadius: 3, background: sec.color }} />
          <span style={{ fontSize: 38, fontWeight: 900, color: sec.color }}>{sec.title}</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", padding: "0 14px", marginBottom: 6, opacity: 0.5 }}>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 700, color: "#94a3b8" }}>产品</span>
          <span style={{ width: 110, fontSize: 20, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>现价</span>
          <span style={{ width: 90, fontSize: 20, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>今日</span>
          <span style={{ width: 145, fontSize: 20, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>7天</span>
          <span style={{ width: 145, fontSize: 20, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>30天</span>
        </div>

        {sec.rows.map((row, i) => {
          const rS = spring({ frame: frame - delay - 6 - i * 4, fps, config: { damping: 18, stiffness: 60 } });
          const ch = fmtCh(row.todayChange);
          const ch7 = fmtCh(row.change7d || 0);
          const ch30 = fmtCh(row.change30d || 0);
          const p7 = row.price7d || (row.price - (row.change7d || 0));
          const p30 = row.price30d || (row.price - (row.change30d || 0));

          return (
            <div
              key={i}
              style={{
                opacity: interpolate(rS, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(rS, [0, 1], [30, 0])}px)`,
                background: "#fff", border: `1px solid ${sec.color}20`, borderRadius: 14,
                padding: "10px 14px", marginBottom: 5,
                display: "flex", alignItems: "center",
              }}
            >
              <span style={{ flex: 1, fontSize: 26, fontWeight: 700, color: "#334155" }}>{row.name}</span>
              <span style={{ width: 110, fontSize: 26, fontWeight: 900, color: "#1e293b", textAlign: "center" }}>
                ¥{row.price.toLocaleString()}
              </span>
              <span style={{ width: 90, fontSize: 24, fontWeight: 800, color: ch.color, textAlign: "center" }}>{ch.text}</span>
              <div style={{ width: 145, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#475569" }}>¥{p7.toLocaleString()}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: ch7.color }}>{ch7.text}</span>
              </div>
              <div style={{ width: 145, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#475569" }}>¥{p30.toLocaleString()}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: ch30.color }}>{ch30.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc", fontFamily: FONT,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 28px 200px", gap: 16,
      }}
    >
      <div style={{ opacity: interpolate(titleS, [0, 1], [0, 1]), fontSize: 48, fontWeight: 900, color: "#1e293b", marginBottom: 8 }}>
        CPU · 今日涨跌分化
      </div>
      {renderSection(topSection, 10)}
      <div style={{ width: "85%", height: 2, background: "#e2e8f0", margin: "4px 0" }} />
      {renderSection(bottomSection, 30)}
      <div style={{ marginTop: 8, opacity: 0.4, fontSize: 20, fontWeight: 600, color: "#cbd5e1" }}>DIYXX.COM</div>
    </AbsoluteFill>
  );
};

// ================================================================
//  InfoWarningVideo: 警告/建议卡片
// ================================================================
export interface InfoWarningProps {
  title: string;
  icon: string;
  points: string[];
  advice: string;
}

export const InfoWarningVideo: React.FC<InfoWarningProps> = ({ title, icon, points, advice }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  const adviceS = spring({ frame: frame - 120, fps, config: { damping: 16, stiffness: 40 } });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #fefce8 0%, #f8fafc 50%)", fontFamily: FONT,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "140px 50px",
      }}
    >
      <div
        style={{
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `scale(${interpolate(titleS, [0, 1], [0.8, 1])})`,
          width: "100%", maxWidth: 850,
          background: "#fff", borderRadius: 24, padding: "36px 42px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #fde68a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <span style={{ fontSize: 40 }}>{icon}</span>
          <span style={{ fontSize: 38, fontWeight: 900, color: "#92400e" }}>{title}</span>
        </div>

        {points.map((pt, i) => {
          const pS = spring({ frame: frame - 20 - i * 15, fps, config: { damping: 18, stiffness: 50 } });
          return (
            <div
              key={i}
              style={{
                opacity: interpolate(pS, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(pS, [0, 1], [20, 0])}px)`,
                fontSize: 26, fontWeight: 700, color: "#475569",
                marginBottom: 14, display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "#f59e0b", flexShrink: 0 }} />
              {pt}
            </div>
          );
        })}

        <div
          style={{
            marginTop: 20, opacity: interpolate(adviceS, [0, 1], [0, 1]),
            background: "#fef3c7", borderRadius: 14, padding: "16px 24px",
            fontSize: 26, fontWeight: 800, color: "#92400e",
            border: "2px solid #fcd34d",
          }}
        >
          💡 {advice}
        </div>
      </div>
      <div style={{ marginTop: 24, opacity: 0.4, fontSize: 18, fontWeight: 600, color: "#cbd5e1" }}>DIYXX.COM</div>
    </AbsoluteFill>
  );
};

// ================================================================
//  CombinedMemoryVideo: DDR5表格 + TrendForce上游 合一
//  Phase 1: DDR5表格居中显示
//  Phase 2: 表格上移，下方出现TrendForce（不推出画外）
// ================================================================
export interface CombinedMemoryProps {
  ddr5Rows: GridRow[];
  source: string;
  prediction: string;
  changeRange: string;
  contextLines: string[];
}

export const CombinedMemoryVideo: React.FC<CombinedMemoryProps> = ({
  ddr5Rows, source, prediction, changeRange, contextLines,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tableS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  // DDR5 table starts centered (+350), slides to top (+50) when TrendForce appears
  // FAST slide: 1 second transition (60 frames)
  const tableY = interpolate(frame, [120, 180], [350, 50], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const upstreamS = spring({ frame: frame - 200, fps, config: { damping: 16, stiffness: 40, mass: 1.2 } });
  const numberS = spring({ frame: frame - 280, fps, config: { damping: 12, stiffness: 30, mass: 1.5 } });
  const ctxS = spring({ frame: frame - 360, fps, config: { damping: 18, stiffness: 50 } });

  const colW: Record<string, number> = { price: 120, "7d": 130, "30d": 130 };
  const colLabel: Record<string, string> = { price: "今日价", "7d": "7天", "30d": "30天" };
  const columns: ("price" | "7d" | "30d")[] = ["price", "7d", "30d"];

  function fmtChange(val?: number, pct?: number) {
    if (val === undefined && pct === undefined) return { text: "—", color: "#94a3b8" };
    const v = val || 0;
    const prefix = v > 0 ? "↑" : v < 0 ? "↓" : "";
    const color = v > 0 ? "#e11d48" : v < 0 ? "#059669" : "#94a3b8";
    let text = `${prefix}¥${Math.abs(v)}`;
    if (pct !== undefined && pct !== 0) text += ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`;
    return { text, color };
  }

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #f0f4ff 0%, #f8fafc 100%)",
        fontFamily: FONT,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "flex-start", padding: "120px 40px",
      }}
    >
      {/* DDR5 Table — starts centered, slides up */}
      <div
        style={{
          opacity: interpolate(tableS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(tableS, [0, 1], [20, 0]) + tableY}px)`,
          width: "100%", maxWidth: 960,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 38, fontWeight: 900, color: "#1e293b" }}>DDR5-6000 近期价格</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#059669", background: "#dcfce7", borderRadius: 10, padding: "4px 14px" }}>今日零变动</span>
        </div>

        <div style={{ display: "flex", padding: "0 16px", marginBottom: 6, opacity: 0.5 }}>
          <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: "#94a3b8" }}>产品</span>
          {columns.map(c => <span key={c} style={{ width: colW[c], fontSize: 17, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>{colLabel[c]}</span>)}
        </div>

        {ddr5Rows.map((row, i) => {
          const rS = spring({ frame: frame - 8 - i * 5, fps, config: { damping: 18, stiffness: 60 } });
          return (
            <div key={i} style={{
              opacity: interpolate(rS, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rS, [0, 1], [30, 0])}px)`,
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 16px", marginBottom: 5,
              display: "flex", alignItems: "center",
            }}>
              <span style={{ flex: 1, fontSize: 22, fontWeight: 700, color: "#334155" }}>{row.name}</span>
              <span style={{ width: colW.price, fontSize: 22, fontWeight: 800, color: "#1e293b", textAlign: "center" }}>¥{row.price.toLocaleString()}</span>
              {(() => { const f = fmtChange(row.change7d, row.pct7d); return <span style={{ width: colW["7d"], fontSize: 20, fontWeight: 800, color: f.color, textAlign: "center" }}>{f.text}</span>; })()}
              {(() => { const f = fmtChange(row.change30d, row.pct30d); return <span style={{ width: colW["30d"], fontSize: 20, fontWeight: 800, color: f.color, textAlign: "center" }}>{f.text}</span>; })()}
            </div>
          );
        })}
      </div>

      {/* TrendForce Upstream — appears below table's final position */}
      <div
        style={{
          opacity: interpolate(upstreamS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(upstreamS, [0, 1], [40, 0]) + 50}px)`,
          width: "100%", maxWidth: 920, marginTop: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#92400e", background: "#fef3c7", border: "2px solid #fcd34d", borderRadius: 10, padding: "4px 14px" }}>📊 {source}</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#94a3b8" }}>上游动态</span>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "24px 30px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>{prediction}</div>
          <div style={{ opacity: interpolate(numberS, [0, 1], [0, 1]), transform: `scale(${interpolate(numberS, [0, 1], [0.6, 1])})`, transformOrigin: "left center" }}>
            <span style={{ fontSize: 52, fontWeight: 900, color: "#e11d48", lineHeight: 1.1 }}>{changeRange}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8", marginLeft: 10 }}>季增</span>
          </div>
          <div style={{ width: "100%", height: 1, background: "#f1f5f9", margin: "14px 0" }} />
          <div style={{ opacity: interpolate(ctxS, [0, 1], [0, 1]), display: "flex", flexDirection: "column", gap: 6 }}>
            {contextLines.map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 700, color: "#475569" }}>
                <div style={{ width: 7, height: 7, borderRadius: 4, background: i === 0 ? "#e11d48" : "#059669", flexShrink: 0 }} />
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, opacity: 0.4, fontSize: 18, fontWeight: 600, color: "#cbd5e1" }}>DIYXX.COM</div>
    </AbsoluteFill>
  );
};

// ================================================================
//  AmdFlowHighlightVideo: AMD降价表 + 连续选框移动
//  选框从 row0(9800X3D) 平滑移至 row1(7800X3D)，不重新入场
//  统一列格式：今日价 | 今日变动 | 7天 | 30天
// ================================================================
export interface AmdFlowProps {
  title: string;
  titleBadge?: { text: string; color: string };
  rows: GridRow[];
  switchFrame: number; // 选框从row0移到row1的帧号
}

export const AmdFlowHighlightVideo: React.FC<AmdFlowProps> = ({
  title, titleBadge, rows, switchFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });

  // ROW_H = total height including padding+border (boxSizing: border-box)
  const ROW_H = 94;
  const ROW_GAP = 8;

  // Selection box animation
  const boxAppear = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 40, mass: 1.5 } });
  const moveAnim = spring({ frame: Math.max(0, frame - switchFrame), fps, config: { damping: 16, stiffness: 35, mass: 1.2 } });
  const boxY = frame < switchFrame ? 0 : interpolate(moveAnim, [0, 1], [0, ROW_H + ROW_GAP]);

  function fmtCh(v?: number) {
    if (v === undefined || v === 0) return { text: "—", color: "#94a3b8" };
    const arrow = v > 0 ? "↑" : "↓";
    const color = v > 0 ? "#e11d48" : "#059669";
    return { text: `${arrow}¥${Math.abs(v)}`, color };
  }

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc", fontFamily: FONT,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 28px 200px",
      }}
    >
      {/* Title */}
      <div style={{
        opacity: interpolate(titleS, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
        marginBottom: 28, display: "flex", alignItems: "center", gap: 16,
      }}>
        <span style={{ fontSize: 52, fontWeight: 900, color: "#1e293b" }}>{title}</span>
        {titleBadge && (
          <span style={{ fontSize: 28, fontWeight: 800, color: titleBadge.color, background: `${titleBadge.color}14`, border: `2px solid ${titleBadge.color}40`, borderRadius: 12, padding: "6px 16px" }}>
            {titleBadge.text}
          </span>
        )}
      </div>

      {/* Column headers */}
      <div style={{ width: "100%", maxWidth: 1000, display: "flex", padding: "0 16px", marginBottom: 10, opacity: 0.5 }}>
        <span style={{ flex: 1, fontSize: 24, fontWeight: 700, color: "#94a3b8" }}>产品</span>
        <span style={{ width: 120, fontSize: 24, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>今日价</span>
        <span style={{ width: 100, fontSize: 24, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>今日变动</span>
        <span style={{ width: 150, fontSize: 24, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>7天</span>
        <span style={{ width: 150, fontSize: 24, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>30天</span>
      </div>

      {/* Rows container with selection box overlay */}
      <div style={{ width: "100%", maxWidth: 1000, position: "relative" }}>
        {/* Selection box — sized to exactly match ROW_H */}
        <div style={{
          position: "absolute", left: -6, right: -6,
          top: boxY, height: ROW_H,
          border: "3px solid #6366f1", borderRadius: 18,
          boxShadow: "0 0 24px rgba(99,102,241,0.3), inset 0 0 24px rgba(99,102,241,0.06)",
          opacity: interpolate(boxAppear, [0, 1], [0, 1]),
          transform: `scaleX(${interpolate(boxAppear, [0, 1], [0.9, 1])})`,
          zIndex: 10, pointerEvents: "none" as const,
        }} />

        {rows.map((row, i) => {
          const rowS = spring({ frame: frame - 10 - i * 5, fps, config: { damping: 18, stiffness: 60 } });
          const ch = fmtCh(row.todayChange);
          const ch7 = fmtCh(row.change7d);
          const ch30 = fmtCh(row.change30d);
          const p7 = row.price7d || (row.price - (row.change7d || 0));
          const p30 = row.price30d || (row.price - (row.change30d || 0));

          return (
            <div
              key={i}
              style={{
                opacity: interpolate(rowS, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(rowS, [0, 1], [40, 0])}px)`,
                background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
                padding: "12px 18px", marginBottom: ROW_GAP,
                display: "flex", alignItems: "center",
                height: ROW_H, boxSizing: "border-box" as const,
              }}
            >
              <span style={{ flex: 1, fontSize: 30, fontWeight: 700, color: "#334155" }}>{row.name}</span>
              <span style={{ width: 120, fontSize: 28, fontWeight: 900, color: "#1e293b", textAlign: "center" }}>¥{row.price.toLocaleString()}</span>
              <span style={{ width: 100, fontSize: 26, fontWeight: 800, color: ch.color, textAlign: "center" }}>{ch.text}</span>
              <div style={{ width: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#475569" }}>¥{p7.toLocaleString()}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: ch7.color }}>{ch7.text}</span>
              </div>
              <div style={{ width: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#475569" }}>¥{p30.toLocaleString()}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: ch30.color }}>{ch30.text}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, opacity: 0.4, fontSize: 18, fontWeight: 600, color: "#cbd5e1" }}>DIYXX.COM</div>
    </AbsoluteFill>
  );
};


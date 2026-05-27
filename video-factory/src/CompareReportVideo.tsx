import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { CyberpunkGrid } from "./components/CyberpunkGrid";
import { CompareChart } from "./components/CompareChart";

interface SeriesData {
  label: string;
  color: string;
  points: { date: string; price: number }[];
  startPrice: number;
  endPrice: number;
  change: number;
  changePct: number;
}

export interface CompareReportProps {
  title: string;
  subtitle: string;
  days: number;
  series: SeriesData[];
}

export const CompareReportVideo: React.FC<CompareReportProps> = ({
  title, subtitle, days, series,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 22, stiffness: 50, mass: 1.5 } });
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [-20, 0]);

  // Diff calculation
  const priceDiff = series.length >= 2 ? Math.abs(series[0].endPrice - series[1].endPrice) : 0;
  const higher = series.length >= 2 ? (series[0].endPrice > series[1].endPrice ? series[0] : series[1]) : null;
  const lower = series.length >= 2 ? (series[0].endPrice <= series[1].endPrice ? series[0] : series[1]) : null;
  const pctMore = lower && lower.endPrice > 0 ? ((priceDiff / lower.endPrice) * 100).toFixed(1) : "0";

  return (
    <AbsoluteFill style={{ fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif", overflow: "hidden" }}>
      <CyberpunkGrid />

      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        padding: "170px 45px 100px",
        zIndex: 10,
      }}>

        {/* 标题 */}
        <div style={{
          width: "100%", textAlign: "center",
          opacity: titleOp, transform: `translateY(${titleY}px)`,
        }}>
          <h1 style={{ fontSize: 46, fontWeight: 900, color: "#1e293b", margin: 0, lineHeight: 1.2 }}>
            {title}
          </h1>
          <p style={{ fontSize: 22, color: "#94a3b8", margin: "8px 0 0", fontWeight: 600 }}>
            {subtitle}
          </p>
        </div>

        {/* 产品对比卡片 — 带 VS 分隔 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 0,
          marginTop: 80, marginBottom: "auto",
        }}>
          {series.map((s, i) => {
            const isUp = s.change > 0;
            return (
              <React.Fragment key={i}>
                {/* VS divider */}
                {i > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 80, flexShrink: 0,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1, #f59e0b)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 4px 16px rgba(99,102,241,0.25)",
                    }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: "#ffffff" }}>VS</span>
                    </div>
                  </div>
                )}
                <div style={{
                  flex: 1, background: `${s.color}12`,
                  border: `3px solid ${s.color}40`,
                  borderRadius: "18px", padding: "20px 16px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  boxShadow: `0 4px 16px ${s.color}15`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", background: s.color,
                      boxShadow: `0 0 8px ${s.color}60`,
                    }} />
                    <span style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: 46, fontWeight: 900, color: "#1e293b", lineHeight: 1 }}>
                    ¥{Math.round(s.endPrice).toLocaleString()}
                  </span>
                  <span style={{
                    fontSize: 22, fontWeight: 800,
                    color: isUp ? "#e11d48" : s.change < 0 ? "#059669" : "#94a3b8",
                  }}>
                    {isUp ? "↑" : "↓"} ¥{Math.abs(Math.round(s.change))} ({Math.abs(s.changePct).toFixed(1)}%)
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* 对比图表 */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CompareChart series={series} />
        </div>

        {/* 差价分析 — 重新设计为三行 */}
        {higher && lower && (
          <div style={{
            marginTop: 16, background: "#ffffff",
            border: "1px solid #e2e8f0", borderRadius: "18px",
            padding: "22px 28px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8" }}>当前价差</span>
            <span style={{ fontSize: 52, fontWeight: 900, color: "#1e293b", lineHeight: 1 }}>
              ¥{Math.round(priceDiff).toLocaleString()}
            </span>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#64748b" }}>
              {higher.label} 比 {lower.label} 贵 <span style={{ color: "#e11d48", fontWeight: 900 }}>{pctMore}%</span>
            </span>
          </div>
        )}

        {/* 底部 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 14, borderTop: "1px solid #f1f5f9", paddingTop: 12,
          fontSize: 24, fontWeight: 600, color: "#cbd5e1",
        }}>
          <span>DIYXX.COM · 硬件行情数据中心</span>
          <span>近{days}天数据对比</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

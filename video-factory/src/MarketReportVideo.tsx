import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { MarketReportProps } from "./Root";
import { CyberpunkGrid } from "./components/CyberpunkGrid";
import { TrendChart } from "./components/TrendChart";

export const MarketReportVideo: React.FC<MarketReportProps> = ({
  title,
  subtitle,
  chartData,
  recentChanges,
  priceChange,
  priceChangePercent,
  startPrice,
  endPrice,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isUp = priceChange > 0;

  // 标题入场
  const titleSpring = spring({ frame, fps, config: { damping: 22, stiffness: 50, mass: 1.5 } });
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [-20, 0]);

  // 静态数值，不做动画
  const dispStart = Math.round(startPrice);
  const dispEnd = Math.round(endPrice);
  const dispDiff = Math.round(Math.abs(priceChange));
  const dispPct = Math.abs(priceChangePercent).toFixed(2);

  const productName = title?.replace(/\d+天价格走势$/, '').replace(/价格走势$/, '').trim() || title || '';
  const daysMatch = title?.match(/(\d+)天/);
  const daysNum = daysMatch ? daysMatch[1] : '60';

  const changeDelay = 300;

  return (
    <AbsoluteFill style={{ fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif", overflow: "hidden" }}>
      <CyberpunkGrid />

      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        padding: "170px 45px 100px",
        zIndex: 10,
      }}>

        {/* === 顶部标题 — 居中 === */}
        <div style={{
          width: "100%", textAlign: "center", marginBottom: 28,
          opacity: titleOp, transform: `translateY(${titleY}px)`,
        }}>
          <h1 style={{
            fontSize: 52, fontWeight: 900, color: "#1e293b",
            margin: 0, lineHeight: 1.2,
          }}>
            {productName} 近{daysNum}天价格趋势图
          </h1>
          <p style={{
            fontSize: 22, color: "#94a3b8", margin: "8px 0 0", fontWeight: 600,
          }}>
            DIYXX.COM 数据 · 更新于 {chartData[chartData.length - 1]?.date || ''}
          </p>
        </div>

        {/* === 三个指标卡片 === */}
        <div style={{ display: "flex", gap: 16, marginTop: "auto", marginBottom: "auto" }}>
          {/* 期初价格 */}
          {(() => {
            return (
              <div style={{
                flex: 1, background: "#ffffff", border: "1px solid #e2e8f0",
                borderRadius: "18px", padding: "18px 14px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#94a3b8" }}>期初价格</span>
                <span style={{ fontSize: 52, fontWeight: 900, color: "#1e293b", lineHeight: 1 }}>
                  ¥{dispStart.toLocaleString()}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600, color: "#cbd5e1" }}>
                  {chartData[0]?.date.slice(5)}
                </span>
              </div>
            );
          })()}

          {/* 当前价格 */}
          {(() => {
            return (
              <div style={{
                flex: 1, background: "#ffffff", border: "1px solid #e2e8f0",
                borderRadius: "18px", padding: "18px 14px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#94a3b8" }}>当前价格</span>
                <span style={{ fontSize: 52, fontWeight: 900, color: "#1e293b", lineHeight: 1 }}>
                  ¥{dispEnd.toLocaleString()}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600, color: "#cbd5e1" }}>
                  {chartData[chartData.length - 1]?.date.slice(5)}
                </span>
              </div>
            );
          })()}

          {/* 涨跌幅 */}
          {(() => {
            return (
              <div style={{
                flex: 1,
                background: isUp ? "#fff8f8" : priceChange < 0 ? "#f0fdf4" : "#f8fafc",
                border: `1px solid ${isUp ? "#fecdd3" : priceChange < 0 ? "#bbf7d0" : "#e2e8f0"}`,
                borderRadius: "18px", padding: "18px 14px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#94a3b8" }}>{daysNum}天变动</span>
                <span style={{
                  fontSize: 52, fontWeight: 900, lineHeight: 1,
                  color: isUp ? "#e11d48" : priceChange < 0 ? "#059669" : "#475569",
                }}>
                  {isUp ? "+" : "-"}¥{dispDiff.toLocaleString()}
                </span>
                <span style={{
                  fontSize: 22, fontWeight: 800,
                  color: isUp ? "#fb7185" : priceChange < 0 ? "#34d399" : "#94a3b8",
                }}>
                  {isUp ? "↑" : "↓"} {dispPct}%
                </span>
              </div>
            );
          })()}
        </div>

        {/* === 主图表 — 让它填满剩余空间 === */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TrendChart chartData={chartData} />
        </div>

        {/* === 底部调价记录 === */}
        {recentChanges.length > 0 && (
          <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
            {recentChanges.slice(0, 3).map((item, idx) => {
              const delay = changeDelay + idx * 30;
              const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 60, mass: 1.2 } });
              const op = interpolate(s, [0, 1], [0, 1], { extrapolateRight: "clamp" });
              const ty = interpolate(s, [0, 1], [20, 0], { extrapolateRight: "clamp" });
              const itemIsUp = item.changeAmount > 0;

              return (
                <div key={idx} style={{
                  flex: 1, background: "#ffffff",
                  border: `1px solid ${itemIsUp ? "#fecdd3" : "#bbf7d0"}`,
                  borderRadius: "14px", padding: "14px 14px",
                  opacity: op, transform: `translateY(${ty}px)`,
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 18, fontWeight: 800, color: "#6366f1",
                      background: "#eef2ff", border: "1px solid #e0e7ff",
                      padding: "2px 10px", borderRadius: "6px",
                    }}>
                      {item.category.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 600, color: "#94a3b8" }}>
                      {item.changedAt.slice(5, 10)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 24, fontWeight: 700, color: "#334155",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.hardwareName}
                  </div>
                  <div style={{
                    fontSize: 32, fontWeight: 900,
                    color: itemIsUp ? "#e11d48" : "#059669",
                  }}>
                    {itemIsUp ? "↑" : "↓"} ¥{Math.abs(item.changeAmount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* === 底部品牌 (24px) === */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 12,
          fontSize: 24, fontWeight: 600, color: "#cbd5e1",
        }}>
          <span>DIYXX.COM · 硬件行情数据中心</span>
          <span>{chartData[chartData.length - 1]?.date} 数据更新</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

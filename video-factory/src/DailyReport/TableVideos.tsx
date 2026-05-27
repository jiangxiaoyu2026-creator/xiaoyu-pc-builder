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
//  Summary Table: 今日行情速览
// ================================================================
interface SummaryRow {
  icon: string;
  category: string;
  totalChanged: number;
  downCount: number;
  upCount: number;
  label: string;
  labelColor: string;
}

export const SummaryTableVideo: React.FC<{ rows: SummaryRow[]; subtitle?: string }> = ({ rows, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "160px 50px 120px",
      }}
    >
      {/* Title */}
      <div
        style={{
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          marginBottom: 40,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 900, color: "#1e293b" }}>今日行情速览</div>
        {subtitle && (
          <div style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8", marginTop: 10 }}>
            {subtitle}
          </div>
        )}
        <div
          style={{
            width: 80,
            height: 4,
            background: "linear-gradient(90deg, #6366f1, #818cf8)",
            borderRadius: 2,
            margin: "16px auto 0",
          }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {rows.map((row, i) => {
          const rowS = spring({
            frame: frame - 15 - i * 10,
            fps,
            config: { damping: 18, stiffness: 60, mass: 1 },
          });
          return (
            <div
              key={i}
              style={{
                opacity: interpolate(rowS, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(rowS, [0, 1], [60, 0])}px)`,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: "22px 28px",
                display: "flex",
                alignItems: "center",
                boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: 42, marginRight: 18, width: 52, textAlign: "center" }}>
                {row.icon}
              </div>
              {/* Category name */}
              <div style={{ fontSize: 36, fontWeight: 800, color: "#1e293b", width: 130 }}>
                {row.category}
              </div>
              {/* Change count */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 700, color: "#94a3b8" }}>
                  {row.totalChanged}款变动
                </span>
                {row.downCount > 0 && (
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#059669" }}>
                    ↓{row.downCount}
                  </span>
                )}
                {row.upCount > 0 && (
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#e11d48" }}>
                    ↑{row.upCount}
                  </span>
                )}
              </div>
              {/* Direction badge */}
              <div
                style={{
                  background: `${row.labelColor}12`,
                  border: `2px solid ${row.labelColor}40`,
                  borderRadius: 12,
                  padding: "6px 18px",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 800, color: row.labelColor }}>
                  {row.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 40,
          opacity: interpolate(titleS, [0, 1], [0, 0.6]),
          fontSize: 22,
          fontWeight: 600,
          color: "#cbd5e1",
        }}
      >
        DIYXX.COM · 2026.05.26
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
//  AMD Drop Table: AMD今日降价一览
// ================================================================
interface DropProduct {
  name: string;
  change: number;
  currentPrice: number;
}

export const AmdDropTableVideo: React.FC<{ products: DropProduct[] }> = ({ products }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });

  return (
    <AbsoluteFill
      style={{
        background: "#f8fafc",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "160px 50px 120px",
      }}
    >
      {/* Title */}
      <div
        style={{
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          marginBottom: 36,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: "#1e293b" }}>AMD 今日降价</span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#059669",
              background: "#dcfce7",
              borderRadius: 10,
              padding: "4px 14px",
            }}
          >
            全降
          </span>
        </div>
        <div
          style={{
            width: 80,
            height: 4,
            background: "#059669",
            borderRadius: 2,
            margin: "14px auto 0",
          }}
        />
      </div>

      {/* Table header */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          display: "flex",
          padding: "0 28px",
          marginBottom: 10,
          opacity: interpolate(titleS, [0, 1], [0, 0.7]),
        }}
      >
        <span style={{ flex: 1, fontSize: 22, fontWeight: 700, color: "#94a3b8" }}>产品</span>
        <span
          style={{
            width: 140,
            fontSize: 22,
            fontWeight: 700,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          降幅
        </span>
        <span
          style={{
            width: 160,
            fontSize: 22,
            fontWeight: 700,
            color: "#94a3b8",
            textAlign: "right",
          }}
        >
          现价
        </span>
      </div>

      {/* Rows */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {products.map((p, i) => {
          const rowS = spring({
            frame: frame - 12 - i * 8,
            fps,
            config: { damping: 18, stiffness: 60, mass: 1 },
          });
          // Animate the change indicator bar
          const barWidth = interpolate(rowS, [0, 1], [0, Math.min(Math.abs(p.change) / 35, 100)]);

          return (
            <div
              key={i}
              style={{
                opacity: interpolate(rowS, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(rowS, [0, 1], [50, 0])}px)`,
                background: "#ffffff",
                border: "1px solid #bbf7d0",
                borderRadius: 16,
                padding: "18px 28px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* Product name */}
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#334155" }}>{p.name}</span>
              </div>
              {/* Change amount with mini bar */}
              <div
                style={{
                  width: 140,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 26, fontWeight: 800, color: "#059669" }}>
                  ↓ ¥{Math.abs(p.change)}
                </span>
                <div
                  style={{
                    width: "100%",
                    height: 4,
                    background: "#e2e8f0",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      background: "#059669",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
              {/* Current price */}
              <div style={{ width: 160, textAlign: "right" }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#1e293b",
                    background: "#f1f5f9",
                    borderRadius: 10,
                    padding: "4px 14px",
                  }}
                >
                  ¥{p.currentPrice.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 36,
          opacity: interpolate(titleS, [0, 1], [0, 0.6]),
          fontSize: 22,
          fontWeight: 600,
          color: "#cbd5e1",
        }}
      >
        DIYXX.COM · 数据实时更新
      </div>
    </AbsoluteFill>
  );
};

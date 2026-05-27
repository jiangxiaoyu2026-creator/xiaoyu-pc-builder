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
//  MemoryProductCards: 展示内存产品价格变动（用卡片而非折线图）
// ================================================================
interface MemProduct {
  name: string;
  spec: string;        // e.g. "32G(16G*2) 6800 C32"
  currentPrice: number;
  change: number;       // +50, +30
  badge?: string;       // e.g. "高频灯条"
}

export const MemoryProductCards: React.FC<{ products: MemProduct[] }> = ({ products }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #f0f4ff 0%, #f8fafc 100%)",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "140px 50px",
      }}
    >
      {/* Section header */}
      <div
        style={{
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
          marginBottom: 40,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>
          💾 内存
        </div>
        <div style={{ fontSize: 46, fontWeight: 900, color: "#1e293b" }}>今日价格变动</div>
        <div
          style={{
            width: 60,
            height: 4,
            background: "linear-gradient(90deg, #e11d48, #fb7185)",
            borderRadius: 2,
            margin: "14px auto 0",
          }}
        />
      </div>

      {/* Product cards */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {products.map((p, i) => {
          const cardS = spring({
            frame: frame - 20 - i * 15,
            fps,
            config: { damping: 18, stiffness: 55, mass: 1 },
          });

          // Animated price counter
          const priceProgress = interpolate(cardS, [0, 1], [0, 1], { extrapolateRight: "clamp" });
          const displayPrice = Math.round(p.currentPrice * priceProgress);
          const displayChange = Math.round(p.change * priceProgress);

          return (
            <div
              key={i}
              style={{
                opacity: interpolate(cardS, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(cardS, [0, 1], [40, 0])}px)`,
                background: "#ffffff",
                borderRadius: 24,
                padding: "28px 36px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                border: "1px solid #fecdd3",
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              {/* Left: product info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 34, fontWeight: 800, color: "#1e293b" }}>{p.name}</span>
                  {p.badge && (
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#6366f1",
                        background: "#eef2ff",
                        borderRadius: 8,
                        padding: "3px 10px",
                      }}
                    >
                      {p.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "#94a3b8" }}>{p.spec}</div>
              </div>

              {/* Right: price + change */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: "#1e293b", lineHeight: 1.1 }}>
                  ¥{displayPrice.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    color: "#e11d48",
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 26 }}>↑</span>
                  <span>+¥{displayChange}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom note */}
      <div
        style={{
          marginTop: 36,
          opacity: interpolate(
            spring({ frame: frame - 60, fps, config: { damping: 20, stiffness: 40 } }),
            [0, 1],
            [0, 1]
          ),
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: "#94a3b8" }}>
          仅高频灯条个别调整 · 主流型号未受影响
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 30,
          opacity: interpolate(titleS, [0, 1], [0, 0.5]),
          fontSize: 20,
          fontWeight: 600,
          color: "#cbd5e1",
        }}
      >
        DIYXX.COM
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
//  UpstreamNewsCard: DDR5 稳定性 + TrendForce 上游预测信息图
// ================================================================
interface UpstreamProps {
  stableLabel: string;       // "DDR5-6000 主流套条"
  stableNote: string;        // "本周零变动"
  source: string;            // "TrendForce"
  prediction: string;        // "Q2 DRAM 合约价"
  changeRange: string;       // "+58% ~ 63%"
  contextLines: string[];    // ["成本压力未消失", "零售端消化降价红利"]
}

export const UpstreamNewsCard: React.FC<UpstreamProps> = ({
  stableLabel,
  stableNote,
  source,
  prediction,
  changeRange,
  contextLines,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: DDR5 stability (0-3s = 0-180 frames)
  const stabilityS = spring({ frame, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  // Phase 2: TrendForce data (3s+ = 180+ frames)
  const trendS = spring({
    frame: frame - 150,
    fps,
    config: { damping: 16, stiffness: 40, mass: 1.2 },
  });
  const numberS = spring({
    frame: frame - 200,
    fps,
    config: { damping: 12, stiffness: 30, mass: 1.5 },
  });
  const contextS = spring({
    frame: frame - 280,
    fps,
    config: { damping: 18, stiffness: 50, mass: 1 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #fefce8 0%, #f8fafc 40%)",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "140px 50px",
      }}
    >
      {/* Phase 1: DDR5 Stability Badge */}
      <div
        style={{
          opacity: interpolate(stabilityS, [0, 1], [0, 1]),
          transform: `scale(${interpolate(stabilityS, [0, 1], [0.8, 1])})`,
          marginBottom: 50,
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "2px solid #bbf7d0",
            borderRadius: 20,
            padding: "24px 50px",
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 4px 20px rgba(5,150,105,0.08)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
              color: "#059669",
            }}
          >
            ✓
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1e293b" }}>{stableLabel}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#059669", marginTop: 2 }}>
              {stableNote}
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2: TrendForce Prediction */}
      <div
        style={{
          opacity: interpolate(trendS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(trendS, [0, 1], [30, 0])}px)`,
          width: "100%",
          maxWidth: 850,
        }}
      >
        {/* Source badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              background: "#fef3c7",
              border: "2px solid #fcd34d",
              borderRadius: 10,
              padding: "6px 16px",
              fontSize: 22,
              fontWeight: 800,
              color: "#92400e",
            }}
          >
            📊 {source}
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8" }}>上游动态</span>
        </div>

        {/* Main card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 24,
            padding: "36px 42px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            border: "1px solid #fde68a",
          }}
        >
          {/* Prediction label */}
          <div style={{ fontSize: 28, fontWeight: 700, color: "#64748b", marginBottom: 12 }}>
            {prediction}
          </div>

          {/* Big number */}
          <div
            style={{
              opacity: interpolate(numberS, [0, 1], [0, 1]),
              transform: `scale(${interpolate(numberS, [0, 1], [0.6, 1])})`,
              transformOrigin: "left center",
            }}
          >
            <span
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: "#e11d48",
                lineHeight: 1.1,
                letterSpacing: -2,
              }}
            >
              {changeRange}
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#94a3b8",
                marginLeft: 12,
              }}
            >
              季增
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: "100%",
              height: 1,
              background: "#f1f5f9",
              margin: "24px 0",
            }}
          />

          {/* Context lines */}
          <div
            style={{
              opacity: interpolate(contextS, [0, 1], [0, 1]),
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {contextLines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === 0 ? "#e11d48" : "#059669",
                    flexShrink: 0,
                  }}
                />
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 36,
          opacity: interpolate(stabilityS, [0, 1], [0, 0.5]),
          fontSize: 20,
          fontWeight: 600,
          color: "#cbd5e1",
        }}
      >
        DIYXX.COM · 数据实时更新
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const PriceTicker: React.FC<{ startPrice: number; endPrice: number; color: string }> = ({
  startPrice,
  endPrice,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 延迟 30 帧 (0.5秒) 开始滚动
  const springValue = spring({
    frame: frame - 30,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const currentPrice = interpolate(springValue, [0, 1], [startPrice, endPrice]);
  const isRising = endPrice > startPrice;

  // Add neon glow based on color
  return (
    <div
      style={{
        fontSize: "120px",
        fontWeight: 900,
        fontFamily: "monospace",
        color: color,
        textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
        display: "flex",
        alignItems: "center",
        gap: 20
      }}
    >
      ¥{Math.round(currentPrice).toLocaleString()}
      {frame > 30 && (
        <span style={{ fontSize: "80px" }}>
          {isRising ? "↑" : "↓"}
        </span>
      )}
    </div>
  );
};

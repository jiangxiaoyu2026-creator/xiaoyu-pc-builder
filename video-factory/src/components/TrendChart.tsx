import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const TrendChart: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Create a simple dramatic curved graph path
  const pathData = "M 0 200 Q 150 200, 300 150 T 600 180 T 800 50 L 1000 0";
  const pathLength = 1200; // approximation of SVG bounds
  
  // Animate the line drawing over time
  // Wait 1 second (60 frames), then draw over 2 seconds
  const drawProgress = spring({
    frame: frame - 60,
    fps,
    config: {
      damping: 100,
      stiffness: 10,
    },
  });

  const dashOffset = interpolate(drawProgress, [0, 1], [pathLength, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div style={{ width: 1000, height: 300, position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 1000 300" style={{ overflow: "visible" }}>
        {/* Glow / shadow under the line */}
        <path
          d={pathData}
          fill="none"
          stroke="#00ffcc"
          strokeWidth="10"
          strokeDasharray={pathLength}
          strokeDashoffset={dashOffset}
          style={{
            filter: "drop-shadow(0 0 20px rgba(0, 255, 204, 0.8)) blur(5px)",
            opacity: 0.5
          }}
        />
        {/* Main sharp line */}
        <path
          d={pathData}
          fill="none"
          stroke="#fff"
          strokeWidth="6"
          strokeDasharray={pathLength}
          strokeDashoffset={dashOffset}
        />
      </svg>
    </div>
  );
};

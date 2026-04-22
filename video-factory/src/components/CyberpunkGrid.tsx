import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const CyberpunkGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const yOffset = (frame * 2) % 100; // Continuous scroll down effect
  
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #0b0c10 0%, #1f2833 100%)",
        overflow: "hidden",
        zIndex: 0,
        opacity: 0.8
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          left: "-50%",
          top: "-50%",
          backgroundImage: `
            linear-gradient(rgba(0, 255, 204, 0.2) 2px, transparent 2px),
            linear-gradient(90deg, rgba(0, 255, 204, 0.2) 2px, transparent 2px)
          `,
          backgroundSize: "100px 100px",
          transform: `perspective(500px) rotateX(60deg) translateY(${yOffset}px)`,
          filter: "drop-shadow(0 0 10px rgba(0,255,204,0.5))"
        }}
      />
    </AbsoluteFill>
  );
};

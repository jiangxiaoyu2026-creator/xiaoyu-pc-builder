import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SubtitleItem } from "../Root";

export const Subtitles: React.FC<{ items: SubtitleItem[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeSec = frame / fps;

  // Find the subtitle that is currently active
  const activeSubtitle = items.find(
    (item) => currentTimeSec >= item.start && currentTimeSec <= item.end
  );

  if (!activeSubtitle) return null;

  // calculate how long it's been active to create a pop-in effect
  const framesActive = frame - activeSubtitle.start * fps;
  
  const scale = spring({
    frame: framesActive,
    fps,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: "8%",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 40px",
        textAlign: "center"
      }}
    >
      <div
        style={{
          fontSize: 65,
          fontWeight: 900,
          color: "#fff",
          textShadow: "0 5px 15px rgba(0,0,0,0.8), 0 0 20px #ff0055",
          transform: `scale(${interpolate(scale, [0, 1], [0.8, 1])})`,
          opacity: interpolate(scale, [0, 0.5], [0, 1]),
          lineHeight: 1.4,
          background: "linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.8), rgba(0,0,0,0.5))",
          padding: "10px 40px",
          borderRadius: 20,
          border: "2px solid rgba(255,0,85, 0.3)"
        }}
      >
        {activeSubtitle.text}
      </div>
    </div>
  );
};

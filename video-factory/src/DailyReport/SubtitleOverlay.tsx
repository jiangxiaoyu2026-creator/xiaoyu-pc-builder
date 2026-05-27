import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Video,
  staticFile,
  interpolate,
} from "remotion";

const FONT = "system-ui, -apple-system, 'PingFang SC', sans-serif";

export interface SubtitleEntry {
  start: number; // seconds
  end: number;   // seconds
  text: string;
}

export interface SubtitleOverlayProps {
  /** path to the source video (relative to public/) */
  src: string;
  subtitles: SubtitleEntry[];
}

/**
 * Overlays styled subtitles onto a source video.
 * Designed for 1080x1920 Douyin-style vertical video.
 * Subtitle safe area: bottom 220px margin (above Douyin controls).
 */
export const SubtitleOverlayVideo: React.FC<SubtitleOverlayProps> = ({
  src,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Find active subtitle
  const active = subtitles.find(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  // Fade in/out for subtitle transitions
  let opacity = 0;
  if (active) {
    const fadeIn = interpolate(
      currentTime,
      [active.start, active.start + 0.15],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const fadeOut = interpolate(
      currentTime,
      [active.end - 0.15, active.end],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    opacity = Math.min(fadeIn, fadeOut);
  }

  return (
    <AbsoluteFill>
      {/* Source video */}
      <Video src={staticFile(src)} />

      {/* Subtitle layer */}
      {active && (
        <div
          style={{
            position: "absolute",
            bottom: 220, // Douyin safe area
            left: 40,
            right: 40,
            display: "flex",
            justifyContent: "center",
            opacity,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 44,
              fontWeight: 800,
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.5,
              // Black outline effect via text-shadow
              textShadow: `
                -2px -2px 0 #000, 2px -2px 0 #000,
                -2px  2px 0 #000, 2px  2px 0 #000,
                -3px  0   0 #000, 3px  0   0 #000,
                 0   -3px 0 #000, 0    3px 0 #000,
                 0    0   6px rgba(0,0,0,0.5)
              `,
              maxWidth: 960,
              wordBreak: "break-word" as const,
            }}
          >
            {active.text}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

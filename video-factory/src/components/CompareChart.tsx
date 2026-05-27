import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface SeriesPoint {
  date: string;
  price: number;
}

interface SeriesData {
  label: string;
  color: string;
  points: SeriesPoint[];
  startPrice: number;
  endPrice: number;
  change: number;
  changePct: number;
}

export const CompareChart: React.FC<{ series: SeriesData[] }> = ({ series }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!series || series.length < 2) return null;

  const W = 980;
  const H = 780;
  const pad = { top: 30, right: 80, bottom: 80, left: 140 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Global Y range
  let globalMin = Infinity, globalMax = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      if (p.price < globalMin) globalMin = p.price;
      if (p.price > globalMax) globalMax = p.price;
    }
  }
  const range = globalMax - globalMin || 1;
  const yMin = globalMin - range * 0.15;
  const yMax = globalMax + range * 0.15;
  const yRange = yMax - yMin;

  const maxLen = Math.max(...series.map(s => s.points.length));
  const toX = (i: number) => pad.left + (i / (maxLen - 1)) * plotW;
  const toY = (p: number) => pad.top + (1 - (p - yMin) / yRange) * plotH;

  // Staggered animation: line 1 = frame 0~300, line 2 = frame 240~540 (slight overlap)
  const makeProgress = (startFrame: number) => {
    const f = Math.max(0, frame - startFrame);
    return interpolate(
      spring({ frame: f, fps, config: { damping: 40, stiffness: 18, mass: 2.5 } }),
      [0, 1], [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  };

  const progresses = [makeProgress(0), makeProgress(260)];

  // Grid
  const yTicks = 5;
  const yLines = Array.from({ length: yTicks }).map((_, i) => {
    const ratio = i / (yTicks - 1);
    return { y: pad.top + (1 - ratio) * plotH, price: yMin + ratio * yRange };
  });

  const xLabelStep = Math.max(1, Math.ceil(maxLen / 5));
  const dates = series[0].points.map(p => p.date);

  // Build paths with per-series progress
  const seriesPaths = series.map((s, si) => {
    const prog = progresses[si];
    const pts = s.points.map((p, i) => ({ x: toX(i), y: toY(p.price), price: p.price }));
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    // Tracker position based on this series' own progress
    const exactIdx = prog * (pts.length - 1);
    const fi = Math.floor(exactIdx);
    const ci = Math.min(pts.length - 1, fi + 1);
    const t = exactIdx - fi;
    const trackerX = pts[fi].x + (pts[ci].x - pts[fi].x) * t;
    const trackerY = pts[fi].y + (pts[ci].y - pts[fi].y) * t;
    const trackerPrice = pts[fi].price + (pts[ci].price - pts[fi].price) * t;

    return { ...s, pts, path, prog, trackerX, trackerY, trackerPrice };
  });

  const breathe = Math.sin(frame * 0.08) * 0.3 + 1;

  return (
    <div style={{
      width: W, height: H, background: "#ffffff", borderRadius: "20px",
      border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
      position: "relative", overflow: "hidden",
    }}>
      <svg width={W} height={H}>
        <defs>
          {seriesPaths.map((s, si) => (
            <clipPath key={si} id={`reveal-${si}`}>
              <rect x={0} y={0} width={pad.left + s.prog * plotW} height={H} />
            </clipPath>
          ))}
        </defs>

        {/* Y grid */}
        {yLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.left} y1={g.y} x2={W - pad.right} y2={g.y}
              stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />
            <text x={pad.left - 16} y={g.y + 8} fill="#64748b" fontSize={24}
              fontWeight={700} fontFamily="system-ui, sans-serif" textAnchor="end">
              ¥{Math.round(g.price).toLocaleString()}
            </text>
          </g>
        ))}

        {/* X labels */}
        {dates.filter((_, i) => i % xLabelStep === 0 || i === dates.length - 1).map((d, i) => {
          const idx = dates.indexOf(d);
          return (
            <text key={i} x={toX(idx)} y={pad.top + plotH + 36} fill="#64748b" fontSize={24}
              fontWeight={700} fontFamily="system-ui, sans-serif" textAnchor="middle">
              {d.slice(5)}
            </text>
          );
        })}

        {/* Each series with its own clipPath */}
        {seriesPaths.map((s, si) => (
          <g key={si} clipPath={`url(#reveal-${si})`}>
            <path
              d={`${s.path} L ${s.pts[s.pts.length - 1].x} ${pad.top + plotH} L ${s.pts[0].x} ${pad.top + plotH} Z`}
              fill={s.color} fillOpacity={0.06}
            />
            <path d={s.path} fill="none" stroke={s.color} strokeWidth={4}
              strokeLinejoin="round" strokeLinecap="round" />
            {s.pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} stroke="#ffffff" strokeWidth={1.5} />
            ))}
          </g>
        ))}

        {/* Trackers — only show when the series has started animating */}
        {seriesPaths.map((s, si) => {
          if (s.prog < 0.02) return null;

          const tipW = 150;
          const tipH = 56;
          const nearRight = s.trackerX > W - pad.right - tipW;
          const tipX = nearRight ? s.trackerX - tipW - 16 : s.trackerX + 16;
          const tipY = s.trackerY - tipH / 2 + si * 66;

          return (
            <g key={`tracker-${si}`}>
              <circle cx={s.trackerX} cy={s.trackerY} r={12 * breathe}
                fill={s.color} fillOpacity={0.1} />
              <circle cx={s.trackerX} cy={s.trackerY} r={8}
                fill={s.color} fillOpacity={0.25} stroke={s.color} strokeWidth={2} />
              <circle cx={s.trackerX} cy={s.trackerY} r={4} fill={s.color} />

              <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={12}
                fill={s.color} fillOpacity={0.12} stroke={s.color} strokeWidth={1.5} />
              <text x={tipX + tipW / 2} y={tipY + 20} fill={s.color} fontSize={16}
                fontWeight={800} fontFamily="system-ui, sans-serif" textAnchor="middle">
                {s.label}
              </text>
              <text x={tipX + tipW / 2} y={tipY + 44} fill={s.color} fontSize={24}
                fontWeight={900} fontFamily="system-ui, sans-serif" textAnchor="middle">
                ¥{Math.round(s.trackerPrice).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        {seriesPaths.map((s, si) => (
          <g key={`legend-${si}`} transform={`translate(${pad.left + si * 220}, ${pad.top + plotH + 58})`}>
            <line x1={0} y1={0} x2={16} y2={0} stroke={s.color} strokeWidth={4} />
            <text x={22} y={6} fill={s.color} fontSize={20} fontWeight={700} fontFamily="system-ui, sans-serif">
              {s.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { PricePoint } from "../Root";

export const TrendChart: React.FC<{ chartData: PricePoint[]; title?: string }> = ({
  chartData,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!chartData || chartData.length < 2) {
    return <div style={{ color: "#64748b", fontSize: 28, textAlign: "center", padding: 100 }}>暂无走势数据</div>;
  }

  const W = 980;
  const H = 740;
  // 增大 left padding 确保 Y 轴标签不溢出
  const pad = { top: 20, right: 40, bottom: 80, left: 140 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const prices = chartData.map((d) => d.price);
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const range = rawMax - rawMin || 1;
  const yMin = rawMin - range * 0.25;
  const yMax = rawMax + range * 0.25;
  const yRange = yMax - yMin;

  const toX = (i: number) => pad.left + (i / (chartData.length - 1)) * plotW;
  const toY = (p: number) => pad.top + (1 - (p - yMin) / yRange) * plotH;

  // 7秒缓慢绘制
  const progress = interpolate(
    spring({ frame, fps, config: { damping: 40, stiffness: 18, mass: 2.5 } }),
    [0, 1], [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const pts = chartData.map((d, i) => ({ x: toX(i), y: toY(d.price), price: d.price, date: d.date }));

  // Peak and valley
  let peakIdx = 0, valleyIdx = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].price > pts[peakIdx].price) peakIdx = i;
    if (pts[i].price < pts[valleyIdx].price) valleyIdx = i;
  }

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${pad.top + plotH} L ${pts[0].x} ${pad.top + plotH} Z`;

  const refY = toY(chartData[0].price);
  const startP = chartData[0].price;
  const endP = chartData[chartData.length - 1].price;
  const isOverallUp = endP > startP;
  const diff = endP - startP;
  const pct = startP > 0 ? ((diff / startP) * 100).toFixed(2) : "0";
  const isUp = diff > 0;

  let diffPath = `M ${pts[0].x} ${refY}`;
  for (const p of pts) diffPath += ` L ${p.x} ${p.y}`;
  diffPath += ` L ${pts[pts.length - 1].x} ${refY} Z`;

  // Tracker
  const exactIdx = progress * (pts.length - 1);
  const fi = Math.floor(exactIdx);
  const ci = Math.min(pts.length - 1, fi + 1);
  const t = exactIdx - fi;
  const trackerX = pts[fi].x + (pts[ci].x - pts[fi].x) * t;
  const trackerY = pts[fi].y + (pts[ci].y - pts[fi].y) * t;
  const trackerPrice = pts[fi].price + (pts[ci].price - pts[fi].price) * t;
  const trackerDate = t > 0.5 ? pts[ci].date : pts[fi].date;

  const prevPrice = fi > 0 ? pts[fi - 1].price : pts[fi].price;
  const dailyDiff = trackerPrice - prevPrice;
  const dailyPct = prevPrice > 0 ? ((dailyDiff / prevPrice) * 100).toFixed(1) : "0";

  const breathe = Math.sin(frame * 0.08) * 0.3 + 1;

  // Grids
  const yTicks = 5;
  const yLines = Array.from({ length: yTicks }).map((_, i) => {
    const ratio = i / (yTicks - 1);
    return { y: pad.top + (1 - ratio) * plotH, price: yMin + ratio * yRange };
  });
  const xLabelStep = Math.max(1, Math.ceil(chartData.length / 5));
  const xTicks = pts.filter((_, i) => i % xLabelStep === 0 || i === pts.length - 1);

  const peakRevealProg = progress * (pts.length - 1);
  const peakVisible = peakRevealProg > peakIdx + 1;
  const valleyVisible = peakRevealProg > valleyIdx + 1;

  // Tooltip 位置 — 确保始终在跟踪点附近，不脱节
  const tooltipX = trackerX;
  // Tooltip 在点的上方，但如果太靠上就放到下方
  const tooltipAbove = trackerY > pad.top + 120;
  const tooltipBaseY = tooltipAbove ? trackerY - 95 : trackerY + 60;

  return (
    <div style={{
      width: W, height: H, background: "#ffffff", borderRadius: "20px",
      border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
      position: "relative", overflow: "hidden",
    }}>
      <svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <clipPath id="reveal">
            <rect x={0} y={0} width={pad.left + progress * plotW} height={H} />
          </clipPath>
          <linearGradient id="areaFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor={isOverallUp ? "#ef4444" : "#10b981"} />
          </linearGradient>
          <linearGradient id="diffFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isOverallUp ? "#ef4444" : "#10b981"} stopOpacity="0.12" />
            <stop offset="100%" stopColor={isOverallUp ? "#ef4444" : "#10b981"} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Y grid + labels (26px, right-aligned within left padding) */}
        {yLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.left} y1={g.y} x2={W - pad.right} y2={g.y}
              stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />
            <text x={pad.left - 16} y={g.y + 8} fill="#64748b" fontSize={26}
              fontWeight={700} fontFamily="system-ui, sans-serif" textAnchor="end">
              ¥{Math.round(g.price).toLocaleString()}
            </text>
          </g>
        ))}

        {/* X axis labels (26px) */}
        {xTicks.map((pt, i) => (
          <text key={i} x={pt.x} y={pad.top + plotH + 36} fill="#64748b" fontSize={26}
            fontWeight={700} fontFamily="system-ui, sans-serif" textAnchor="middle">
            {pt.date.slice(5)}
          </text>
        ))}

        {/* Reference line — label inside chart, not outside */}
        <line x1={pad.left} y1={refY} x2={W - pad.right} y2={refY}
          stroke={isOverallUp ? "#fca5a5" : "#86efac"} strokeWidth={1.5}
          strokeDasharray="6 4" opacity={0.6} />
        <text x={pad.left + 8} y={refY - 8}
          fill={isOverallUp ? "#f87171" : "#4ade80"}
          fontSize={18} fontWeight={700} fontFamily="system-ui, sans-serif">
          起始价 ¥{startP.toFixed(0)}
        </text>

        {/* Animated chart */}
        <g clipPath="url(#reveal)">
          <path d={diffPath} fill="url(#diffFill)" />
          <path d={areaPath} fill="url(#areaFill)" />
          <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={4}
            strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#6366f1" stroke="#ffffff" strokeWidth={2} />
          ))}
        </g>

        {/* Peak — always visible, outside clipPath */}
        <g>
          <line x1={pts[peakIdx].x} y1={pts[peakIdx].y - 14} x2={pts[peakIdx].x} y2={pts[peakIdx].y - 32}
            stroke="#f87171" strokeWidth={1.5} />
          <rect x={pts[peakIdx].x - 80} y={pts[peakIdx].y - 62} width={160} height={32} rx={8}
            fill="#fff1f2" stroke="#fecdd3" strokeWidth={1} />
          <text x={pts[peakIdx].x} y={pts[peakIdx].y - 40} fill="#e11d48" fontSize={22}
            fontWeight={800} fontFamily="system-ui, sans-serif" textAnchor="middle">
            ▲ 峰值 ¥{pts[peakIdx].price.toFixed(0)}
          </text>
        </g>

        {/* Valley — always visible, outside clipPath */}
        <g>
          <line x1={pts[valleyIdx].x} y1={pts[valleyIdx].y + 14} x2={pts[valleyIdx].x} y2={pts[valleyIdx].y + 32}
            stroke="#34d399" strokeWidth={1.5} />
          <rect x={pts[valleyIdx].x - 80} y={pts[valleyIdx].y + 32} width={160} height={32} rx={8}
            fill="#ecfdf5" stroke="#bbf7d0" strokeWidth={1} />
          <text x={pts[valleyIdx].x} y={pts[valleyIdx].y + 52} fill="#059669" fontSize={22}
            fontWeight={800} fontFamily="system-ui, sans-serif" textAnchor="middle">
            ▼ 谷底 ¥{pts[valleyIdx].price.toFixed(0)}
          </text>
        </g>

        {/* Legend (20px) */}
        <g transform={`translate(${pad.left + 4}, ${pad.top + plotH + 60})`}>
          <line x1={0} y1={0} x2={16} y2={0} stroke="#6366f1" strokeWidth={3} />
          <text x={22} y={6} fill="#64748b" fontSize={20} fontWeight={700} fontFamily="system-ui, sans-serif">
            均价走势
          </text>
          <line x1={130} y1={0} x2={146} y2={0} stroke={isOverallUp ? "#fca5a5" : "#86efac"} strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={152} y={6} fill="#94a3b8" fontSize={20} fontWeight={700} fontFamily="system-ui, sans-serif">
            起始基准线
          </text>
        </g>

        {/* Tracker — tooltip stays close to the dot */}
        {progress > 0.02 && (
          <g>
            <line x1={trackerX} y1={pad.top} x2={trackerX} y2={pad.top + plotH}
              stroke="#6366f1" strokeWidth={1} strokeDasharray="4 4" opacity={0.25} />
            <circle cx={trackerX} cy={trackerY} r={16 * breathe}
              fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.15)" strokeWidth={1} />
            <circle cx={trackerX} cy={trackerY} r={10}
              fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth={2.5} />
            <circle cx={trackerX} cy={trackerY} r={5} fill="#6366f1" />

            {/* Tooltip — clamped to stay inside chart and close to tracker */}
            <g transform={`translate(${Math.max(pad.left + 130, Math.min(W - pad.right - 130, tooltipX))}, ${tooltipBaseY})`}>
              <rect x={-120} y={-55} width={240} height={108} rx={16}
                fill="rgba(0,0,0,0.05)" transform="translate(2,3)" />
              <rect x={-120} y={-55} width={240} height={108} rx={16}
                fill="rgba(255,255,255,0.97)" stroke="#e2e8f0" strokeWidth={1} />
              <text x={0} y={-30} fill="#94a3b8" fontSize={20} fontWeight={600}
                fontFamily="system-ui, sans-serif" textAnchor="middle">
                {trackerDate}
              </text>
              <line x1={-100} y1={-18} x2={100} y2={-18} stroke="#f1f5f9" strokeWidth={1} />
              <text x={0} y={20} fill="#1e293b" fontSize={42} fontWeight={900}
                fontFamily="system-ui, sans-serif" textAnchor="middle">
                ¥{Math.round(trackerPrice).toLocaleString()}
              </text>
              {Math.abs(dailyDiff) > 0.5 && (
                <text x={0} y={44} fill={dailyDiff > 0 ? "#ef4444" : "#10b981"} fontSize={18} fontWeight={700}
                  fontFamily="system-ui, sans-serif" textAnchor="middle">
                  较前日 {dailyDiff > 0 ? "↑" : "↓"} ¥{Math.abs(Math.round(dailyDiff))} ({dailyDiff > 0 ? "+" : ""}{dailyPct}%)
                </text>
              )}
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};

import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { CyberpunkGrid } from "../components/CyberpunkGrid";
import {
  OpeningSlide,
  SectionIntroSlide,
  ProductListSlide,
  CompareSlide,
  SummarySlide,
  DiskFlatSlide,
  NewsCardSlide,
  ClosingSlide,
} from "./Slides";
import { DailyReportProps } from "./types";

// Timing in seconds → frames (at 60fps)
const F = 60;

// Slide timeline: { from (seconds), dur (seconds) }
const T = {
  opening:      { from: 0,  dur: 4 },
  ramIntro:     { from: 4,  dur: 4 },
  ramProducts:  { from: 8,  dur: 8 },
  cpuIntro:     { from: 16, dur: 4 },
  cpuDown:      { from: 20, dur: 9 },
  cpuCompare:   { from: 29, dur: 10 },
  cpuUpSummary: { from: 39, dur: 8 },
  disk:         { from: 47, dur: 6 },
  gpuIntro:     { from: 53, dur: 5 },
  gpuProducts:  { from: 58, dur: 10 },
  gpuCompare:   { from: 68, dur: 10 },
  gpuSummary:   { from: 78, dur: 7 },
  news1:        { from: 85, dur: 7 },
  news2:        { from: 92, dur: 6 },
  closing:      { from: 98, dur: 5 },
};

export const DAILY_REPORT_DURATION = 103 * F; // 6180 frames

export const DailyReportVideo: React.FC<DailyReportProps> = ({
  date, ram, cpu, disk, gpu, news,
}) => {
  return (
    <AbsoluteFill>
      <CyberpunkGrid />

      {/* ===== Opening ===== */}
      <Sequence from={T.opening.from * F} durationInFrames={T.opening.dur * F}>
        <OpeningSlide date={date} />
      </Sequence>

      {/* ===== RAM ===== */}
      <Sequence from={T.ramIntro.from * F} durationInFrames={T.ramIntro.dur * F}>
        <SectionIntroSlide
          category="内存"
          directionLabel={ram.directionLabel}
          directionType={ram.directionType}
          totalChanged={ram.totalChanged}
          upCount={ram.upCount}
          downCount={ram.downCount}
        />
      </Sequence>
      <Sequence from={T.ramProducts.from * F} durationInFrames={T.ramProducts.dur * F}>
        <ProductListSlide
          title="内存 · 今日变动"
          products={[...ram.upProducts, ...ram.downProducts]}
          summary={ram.summary}
        />
      </Sequence>

      {/* ===== CPU ===== */}
      <Sequence from={T.cpuIntro.from * F} durationInFrames={T.cpuIntro.dur * F}>
        <SectionIntroSlide
          category="CPU"
          directionLabel={cpu.directionLabel}
          directionType={cpu.directionType}
          totalChanged={cpu.totalChanged}
          upCount={cpu.upCount}
          downCount={cpu.downCount}
        />
      </Sequence>
      <Sequence from={T.cpuDown.from * F} durationInFrames={T.cpuDown.dur * F}>
        <ProductListSlide
          title="CPU · 降价产品"
          products={cpu.downProducts}
          titleColor="#059669"
        />
      </Sequence>
      {cpu.compare && (
        <Sequence from={T.cpuCompare.from * F} durationInFrames={T.cpuCompare.dur * F}>
          <CompareSlide title={cpu.compare.title} series={cpu.compare.series} />
        </Sequence>
      )}
      <Sequence from={T.cpuUpSummary.from * F} durationInFrames={T.cpuUpSummary.dur * F}>
        <ProductListSlide
          title="CPU · 涨价产品（部分）"
          products={cpu.upProducts.slice(0, 3)}
          titleColor="#e11d48"
          summary={cpu.summary}
        />
      </Sequence>

      {/* ===== Disk ===== */}
      <Sequence from={T.disk.from * F} durationInFrames={T.disk.dur * F}>
        <DiskFlatSlide />
      </Sequence>

      {/* ===== GPU ===== */}
      <Sequence from={T.gpuIntro.from * F} durationInFrames={T.gpuIntro.dur * F}>
        <SectionIntroSlide
          category="显卡"
          directionLabel={gpu.directionLabel}
          directionType={gpu.directionType}
          totalChanged={gpu.totalChanged}
          upCount={gpu.upCount}
          downCount={gpu.downCount}
          avgChange={gpu.avgChange}
        />
      </Sequence>
      <Sequence from={T.gpuProducts.from * F} durationInFrames={T.gpuProducts.dur * F}>
        <ProductListSlide
          title="显卡 · 技嘉全线降价"
          products={gpu.downProducts.slice(0, 8)}
          titleColor="#059669"
        />
      </Sequence>
      {gpu.compare && (
        <Sequence from={T.gpuCompare.from * F} durationInFrames={T.gpuCompare.dur * F}>
          <CompareSlide title={gpu.compare.title} series={gpu.compare.series} />
        </Sequence>
      )}
      <Sequence from={T.gpuSummary.from * F} durationInFrames={T.gpuSummary.dur * F}>
        <SummarySlide text={gpu.summary} warning={gpu.warning} />
      </Sequence>

      {/* ===== News ===== */}
      {news[0] && (
        <Sequence from={T.news1.from * F} durationInFrames={T.news1.dur * F}>
          <NewsCardSlide item={news[0]} index={0} />
        </Sequence>
      )}
      {news[1] && (
        <Sequence from={T.news2.from * F} durationInFrames={T.news2.dur * F}>
          <NewsCardSlide item={news[1]} index={1} />
        </Sequence>
      )}

      {/* ===== Closing ===== */}
      <Sequence from={T.closing.from * F} durationInFrames={T.closing.dur * F}>
        <ClosingSlide date={date} />
      </Sequence>
    </AbsoluteFill>
  );
};

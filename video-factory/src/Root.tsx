import "./index.css";
import { Composition } from "remotion";
import { MarketReportVideo } from "./MarketReportVideo";
import { CompareReportVideo, CompareReportProps } from "./CompareReportVideo";
import { DailyReportVideo, DAILY_REPORT_DURATION } from "./DailyReport/DailyReportVideo";
import { DailyReportProps } from "./DailyReport/types";
import { SummaryTableVideo, AmdDropTableVideo } from "./DailyReport/TableVideos";
import { MemoryProductCards, UpstreamNewsCard } from "./DailyReport/MemoryCards";
import { PriceGridVideo, SplitGridVideo, InfoWarningVideo, CombinedMemoryVideo, AmdFlowHighlightVideo } from "./DailyReport/DataVisuals";
import { SubtitleOverlayVideo } from "./DailyReport/SubtitleOverlay";

export type PricePoint = {
  date: string;
  price: number;
};

export type SubtitleItem = {
  start: number;
  end: number;
  text: string;
};

export type TrendItem = {
  id?: number;
  hardwareId?: string;
  hardwareName: string;
  category: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
  changedAt: string;
};

export type MarketReportProps = {
  title: string;
  subtitle: string;
  chartData: PricePoint[];
  recentChanges: TrendItem[];
  category: string;
  days: number;
  priceChange: number;
  priceChangePercent: number;
  startPrice: number;
  endPrice: number;
};

const defaultProps: MarketReportProps = {
  title: "DIYXX 显卡价格趋势报告",
  subtitle: "近 30 天显卡类目基准均价走势",
  category: "gpu",
  days: 30,
  priceChange: -125.5,
  priceChangePercent: -4.8,
  startPrice: 2614.5,
  endPrice: 2489.0,
  chartData: [
    { date: "2026-04-26", price: 2614.5 },
    { date: "2026-04-28", price: 2602.0 },
    { date: "2026-05-01", price: 2595.0 },
    { date: "2026-05-05", price: 2580.0 },
    { date: "2026-05-10", price: 2550.0 },
    { date: "2026-05-15", price: 2535.5 },
    { date: "2026-05-20", price: 2510.0 },
    { date: "2026-05-26", price: 2489.0 },
  ],
  recentChanges: [
    { hardwareName: "七彩虹 RTX 4060 Ti Ultra W OC 8G", category: "gpu", oldPrice: 3299, newPrice: 3149, changeAmount: -150, changePercent: -4.55, changedAt: "2026-05-25 14:32:00" },
    { hardwareName: "华硕 DUAL RTX 4060 O8G", category: "gpu", oldPrice: 2499, newPrice: 2399, changeAmount: -100, changePercent: -4.0, changedAt: "2026-05-24 10:15:00" },
    { hardwareName: "蓝宝石 RX 7700 XT 12G 极地版", category: "gpu", oldPrice: 3199, newPrice: 3049, changeAmount: -150, changePercent: -4.69, changedAt: "2026-05-23 16:45:00" },
  ],
};

const defaultCompareProps: CompareReportProps = {
  title: "9800X3D vs 7800X3D 价格对比",
  subtitle: "近 60 天价格走势对比 · DIYXX.COM",
  days: 60,
  series: [
    { label: "9800X3D", color: "#6366f1", points: [{ date: "2026-05-26", price: 2550 }], startPrice: 2790, endPrice: 2550, change: -240, changePct: -8.6 },
    { label: "7800X3D", color: "#f59e0b", points: [{ date: "2026-05-26", price: 1750 }], startPrice: 1890, endPrice: 1750, change: -140, changePct: -7.4 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MarketReport"
        component={MarketReportVideo}
        durationInFrames={600}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
      <Composition
        id="CompareReport"
        component={CompareReportVideo}
        durationInFrames={600}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultCompareProps}
      />
      <Composition
        id="DailyReport"
        component={DailyReportVideo}
        durationInFrames={DAILY_REPORT_DURATION}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{} as DailyReportProps}
      />
      <Composition
        id="SummaryTable"
        component={SummaryTableVideo}
        durationInFrames={330}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ rows: [] }}
      />
      <Composition
        id="AmdDropTable"
        component={AmdDropTableVideo}
        durationInFrames={480}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ products: [] }}
      />
      <Composition
        id="MemoryCards"
        component={MemoryProductCards}
        durationInFrames={630}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ products: [] }}
      />
      <Composition
        id="UpstreamNews"
        component={UpstreamNewsCard}
        durationInFrames={720}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ stableLabel: '', stableNote: '', source: '', prediction: '', changeRange: '', contextLines: [] }}
      />
      <Composition
        id="PriceGrid"
        component={PriceGridVideo}
        durationInFrames={720}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ title: '', rows: [], columns: [] } as any}
      />
      <Composition
        id="SplitGrid"
        component={SplitGridVideo}
        durationInFrames={480}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ topSection: { title: '', color: '', rows: [] }, bottomSection: { title: '', color: '', rows: [] } }}
      />
      <Composition
        id="InfoWarning"
        component={InfoWarningVideo}
        durationInFrames={480}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ title: '', icon: '', points: [], advice: '' }}
      />
      <Composition
        id="CombinedMemory"
        component={CombinedMemoryVideo}
        durationInFrames={720}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ ddr5Rows: [], source: '', prediction: '', changeRange: '', contextLines: [] }}
      />
      <Composition
        id="AmdFlowHighlight"
        component={AmdFlowHighlightVideo}
        durationInFrames={972}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ title: '', rows: [], switchFrame: 504 } as any}
      />
      <Composition
        id="SubtitleOverlay"
        component={SubtitleOverlayVideo}
        durationInFrames={7200}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ src: "", subtitles: [] }}
      />
    </>
  );
};

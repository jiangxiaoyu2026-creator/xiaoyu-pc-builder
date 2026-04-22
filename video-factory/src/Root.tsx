import "./index.css";
import { Composition } from "remotion";
import { MarketReportVideo } from "./MarketReportVideo";

// Define the shape of our input props
export type SubtitleItem = {
  start: number;
  end: number;
  text: string;
};

export type ExtremeItem = {
  name: string;
  category: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
};

export type MarketReportProps = {
  topDrops: ExtremeItem[];
  topRises: ExtremeItem[];
  subtitles: SubtitleItem[];
  audioDurationInSeconds: number;
};

const defaultProps: MarketReportProps = {
  topDrops: [
    {
      name: "AMD R5-9600X",
      category: "cpu",
      oldPrice: 1170,
      newPrice: 1130,
      changeAmount: -40,
      changePercent: -3.42,
    },
  ],
  topRises: [
    {
      name: "Intel Ultra 7 265K",
      category: "cpu",
      oldPrice: 1690,
      newPrice: 1830,
      changeAmount: 140,
      changePercent: 8.28,
    },
  ],
  subtitles: [
    { start: 0, end: 2, text: "这里是测试字幕" }
  ],
  audioDurationInSeconds: 10,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MarketReport"
        component={MarketReportVideo}
        durationInFrames={60 * 60} // Default to 60 seconds, will be overridden dynamically via inputProps
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};

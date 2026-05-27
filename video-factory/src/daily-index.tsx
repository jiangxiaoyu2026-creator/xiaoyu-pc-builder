import { registerRoot } from "remotion";
import { Composition } from "remotion";
import "./index.css";
import {
  DailyMarketReportVideo,
  defaultDailyMarketReportProps,
} from "./DailyMarketReportVideo";

const DailyRoot = () => (
  <Composition
    id="DailyMarketReport"
    component={DailyMarketReportVideo}
    durationInFrames={1800}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultDailyMarketReportProps}
  />
);

registerRoot(DailyRoot);

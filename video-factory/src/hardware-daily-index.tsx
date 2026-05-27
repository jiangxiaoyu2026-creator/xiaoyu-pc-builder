import { registerRoot } from "remotion";
import { Composition } from "remotion";
import "./index.css";
import {
  HardwareDailyReportVideo,
  defaultHardwareDailyReportProps,
  hardwareDailyDurationFrames,
} from "./HardwareDailyReportVideo";

const HardwareDailyRoot = () => (
  <Composition
    id="HardwareDailyReport"
    component={HardwareDailyReportVideo}
    durationInFrames={hardwareDailyDurationFrames}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultHardwareDailyReportProps}
  />
);

registerRoot(HardwareDailyRoot);

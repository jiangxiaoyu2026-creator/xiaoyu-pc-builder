import { registerRoot } from "remotion";
import { Composition } from "remotion";
import "./index.css";
import {
  HorizontalHardwareTrendVideo,
  defaultHorizontalHardwareTrendProps,
  horizontalHardwareDurationFrames,
} from "./HorizontalHardwareTrendVideo";
import {
  ShortHorizontalDailyVideo,
  defaultShortHorizontalDailyProps,
  getShortHorizontalDailyDurationFrames,
  shortHorizontalDailyDurationFrames,
} from "./ShortHorizontalDailyVideo";

const HorizontalHardwareRoot = () => (
  <>
    <Composition
      id="HorizontalHardwareTrend"
      component={HorizontalHardwareTrendVideo}
      durationInFrames={horizontalHardwareDurationFrames}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultHorizontalHardwareTrendProps}
    />
    <Composition
      id="ShortHorizontalDaily"
      component={ShortHorizontalDailyVideo}
      durationInFrames={shortHorizontalDailyDurationFrames}
      calculateMetadata={({ props }) => ({
        durationInFrames: getShortHorizontalDailyDurationFrames(props),
      })}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultShortHorizontalDailyProps}
    />
  </>
);

registerRoot(HorizontalHardwareRoot);

import { registerRoot } from "remotion";
import { Composition } from "remotion";
import "./index.css";
import {
  HorizontalHardwareTrendVideo,
  defaultHorizontalHardwareTrendProps,
  horizontalHardwareDurationFrames,
} from "./HorizontalHardwareTrendVideo";

const HorizontalHardwareRoot = () => (
  <Composition
    id="HorizontalHardwareTrend"
    component={HorizontalHardwareTrendVideo}
    durationInFrames={horizontalHardwareDurationFrames}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={defaultHorizontalHardwareTrendProps}
  />
);

registerRoot(HorizontalHardwareRoot);

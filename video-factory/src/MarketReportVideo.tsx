import { AbsoluteFill, Audio, staticFile } from "remotion";
import { MarketReportProps } from "./Root";
import { CyberpunkGrid } from "./components/CyberpunkGrid";
import { Subtitles } from "./components/Subtitles";
import { PriceTicker } from "./components/PriceTicker";
import { TrendChart } from "./components/TrendChart";

export const MarketReportVideo: React.FC<MarketReportProps> = ({
  topDrops,
  topRises,
  subtitles,
  audioDurationInSeconds,
}) => {
  return (
    <AbsoluteFill className="bg-[#0b0c10]">
      {/* 底部 70% 的赛博朋克内容区 */}
      <AbsoluteFill
        style={{
          top: "30%",
          height: "70%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 80,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <CyberpunkGrid />
        
        <div style={{ zIndex: 10, width: "100%", padding: "0 60px", display: "flex", flexDirection: "column", gap: 100 }}>
          {/* 这里可以轮播或展示极值，目前简单平铺一个最大的降价和一个最大的涨价做视觉示范 */}
          {topDrops.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 60, color: "#fff", fontWeight: 800, textShadow: "0 0 10px rgba(255,255,255,0.5)" }}>
                跳水王: {topDrops[0].name}
              </div>
              <PriceTicker startPrice={topDrops[0].oldPrice} endPrice={topDrops[0].newPrice} color="#ff0055" />
            </div>
          )}

          {topRises.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 60, color: "#fff", fontWeight: 800, textShadow: "0 0 10px rgba(255,255,255,0.5)" }}>
                涨价王: {topRises[0].name}
              </div>
              <PriceTicker startPrice={topRises[0].oldPrice} endPrice={topRises[0].newPrice} color="#00ffcc" />
            </div>
          )}
          
          <TrendChart />
        </div>

        {/* 字幕组件 */}
        <Subtitles items={subtitles} />
      </AbsoluteFill>

      {/* 预留上方 30% 为纯黑/暗色极简背景，用于后期画中画 */}
      <AbsoluteFill
        style={{
          height: "30%",
          backgroundColor: "#050505",
          borderBottom: "4px solid #00ffcc",
          boxShadow: "0 10px 40px rgba(0, 255, 204, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div style={{ color: "#333", fontSize: 40, letterSpacing: 10 }}>[ AI HOLOGRAPHIC AREA ]</div>
      </AbsoluteFill>

      {/* 根据是否有音频文件来注入音频 */}
      {/* 生产环境会在 public/audio.mp3 下放入 TTS 结果 */}
      <Audio src={staticFile("audio.mp3")} />
    </AbsoluteFill>
  );
};

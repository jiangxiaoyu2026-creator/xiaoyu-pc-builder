# DIYXX 硬件行情视频生成工坊 (Video Factory)

基于 Remotion 框架开发，用于将网站后台的价格走势图与行情波动数据自动化合成为动态的赛博朋克数据走势视频。

## 🎬 核心功能
1. **数据动态走势渲染**：根据真实行情历史自动生成流畅的折线图/面积图绘制动画，并带有渐变填充与边缘霓虹发光效果。
2. **实时数据指标展示**：动态计算期初均价、期末均价、波动差值与百分比变动，使用 staggered 延迟动画在画面顶部以卡片展示。
3. **单品调价动态呈现**：以列表形式按时间顺序和调价类型展示最新的价格变动事件，带涨跌高亮指示。
4. **灵活参数化定制**：支持通过命令行传参，随时生成不同品类（GPU、CPU、RAM 等）或指定单品的行情走势视频。

---

## 🚀 快速开始

### 1. 安装依赖
在项目根目录或 `video-factory` 目录下：
```bash
npm install
```

### 2. 生成行情走势视频
我们编写了 `orchestrator` 脚本，可全自动拉取网站真实 API 数据，计算指标并直接输出 MP4 视频。

```bash
# 默认生成近 30 天显卡 (GPU) 品类均价走势视频
npx ts-node scripts/orchestrator.ts

# 自定义生成近 90 天内存 (RAM) 细分为 DDR5 的基准均价走势视频
npx ts-node scripts/orchestrator.ts --category=ram --subcategory=DDR5 --days=90

# 指定单品 (硬件 ID 为 123) 生成近 30 天的价格变动走势视频
npx ts-node scripts/orchestrator.ts --hardwareId=123 --days=30 --title="Intel i5-13600KF 价格走势"
```

#### 命令行可用参数说明：
* `--category`: 要生成的硬件类目，支持 `cpu`, `gpu`, `ram`, `disk`, `mainboard`, `psu`, `case`, `cooler` (默认: `gpu`)。
* `--subcategory`: 细分规格过滤，主要对内存 (`DDR4`/`DDR5`) 或硬盘规格有效。
* `--days`: 统计的天数，上限 90 天 (默认: `30`)。
* `--hardwareId`: 硬件单品的 ID。如果提供，视频将直接渲染该单品的价格变化走势，而非类目均价。
* `--title`: 视频主标题覆盖。默认会根据类目/单品自动生成。

### 3. 本地预览开发
在 Remotion Studio 中可视化预览和调试组件：
```bash
npm run dev
```

---

## 📂 项目结构
* `scripts/orchestrator.ts` — 核心命令行驱动脚本，用于拉取 API、整理 props、并调用 Remotion render。
* `src/Root.tsx` — 注册 Remotion Composition 入口与 Props 格式。
* `src/MarketReportVideo.tsx` — 行情视频布局大屏，整合网格、卡片及折线图。
* `src/components/TrendChart.tsx` — 精心定制的 SVG 折线图与面积图，支持帧级别绘制轨迹插值与高亮发光追踪 tooltip。
* `src/components/CyberpunkGrid.tsx` — 赛博朋克 3D 旋转透视移动背景网格。

---
description: 每日硬件行情大盘分析与四端营销文案生成（由 AI 助手直接完成）
---

# 每日行情营销内容生成

> 用户通过 `/generate-marketing` 或者说"帮我生成今日行情文案"触发此工作流。

## 背景
- 网站：蒋小鱼装机平台 (diyxx.com)
- 后台 API 地址：`https://diyxx.com/api`
- 本工作流由 AI 助手直接生成高质量文案，而非调用后端 AI 接口

## 工作流程

### 1. 获取最新行情数据
// turbo
从网站 API 拉取今日价格变动数据：
```bash
curl -s https://diyxx.com/api/marketing/daily-summary -H "Authorization: Bearer <token>" | python3 -m json.tool
```
如果 API 不可用，也可以直接查询本地数据库：
```bash
cd /Users/mac/new/server_py && python3 -c "
from db import engine
from sqlmodel import Session, select
from models import Hardware
import json

with Session(engine) as s:
    items = s.exec(select(Hardware).where(Hardware.category.in_(['cpu','gpu','mainboard','ram','disk']), Hardware.status=='active')).all()
    for item in items:
        print(f'{item.category} | {item.brand} {item.model} | ¥{item.price}')
"
```

### 2. 收集用户提供的行业快讯
询问用户："请提供今日的行业快讯/大事记"。例如：
- 新品发布（如 RTX 5070 发布、AMD 9000 系列上市）
- 供应链变动（如台积电涨价、内存颗粒缺货）
- 重大促销或渠道动态

如果用户没有提供，就根据数据库中的价格趋势自行分析。

### 3. 生成四端营销文案
根据获取到的行情数据和行业快讯，**直接以 AI 助手的能力**生成以下内容。

**【硬性排版要求：开篇极简数据汇总】**
四端文案的**开篇第一段**，都必须是关于今日价格变动的精准数据统计，格式必须类似（请根据真实数据替换）：
> "今天CPU整体行情改价了24个，其中涨价23个，整体涨幅30%，最高涨幅是245KF，涨幅达到了4%，涨幅是50块钱。"
> ⚠️ 如果有某款硬件价格达到历史最高/最低，必须单独标出！

#### 3.1 公众号深度文章 (article)
- 标题要有吸引力，带数字和情绪
- 800-1200字，专业但通俗
- 包含：今日大盘概述、重点硬件分析、购买建议、趋势预测
- 风格：专业装机顾问，有数据支撑

#### 3.2 小红书种草笔记 (xiaohongshu)
- 标题用 emoji + 关键词，200-400字
- 格式：分段 + emoji 小标题
- 语气：年轻活泼，"姐妹们"/"兄弟们"口吻
- 包含价格对比和装机推荐

#### 3.3 朋友圈文案 (moments)
- 100字以内，精炼有力
- 配合行情截图使用
- 末尾带互动引导（如"需要的扣1"）

#### 3.4 短视频口播脚本 (video_script)
- 适合B站/抖音，30-60秒时长
- 开头3秒Hook必须是行情数据战报（即上述要求的"今天XX行情改价了..."）
- 中间讲数据和分析
- 结尾有行动号召

### 4. 生成一张极简的大盘插图 (可选)
使用 `generate_image` 工具生成一张干净、高对比度、无复杂UI的表格截图（类似红绿跌幅榜），明确声明这是一张**可以作为短视频插入画面的纯净贴纸**。

### 5. 自动生成本地强互动网页汇报（核心升级）
在回答内容之前，使用 `write_to_file` 在 `/Users/mac/Downloads/` 下生成一个名为 `今日硬件行情战报_<日期>.html` 的本地单文件网页。
该网页应当包含：
- **引入 Tailwind CSS** (CDN) 实现极具科技感、自适应的暗黑风UI设计。
- **引入 ECharts** (CDN) 将今日的大盘变动（CPU/内存/显卡等各类别的涨跌幅度及数量）绘制成漂亮的【柱状图】或【趋势折线图】。
- **行情数据统计表**：一个清晰的 `<table>` 罗列今天的 Top涨跌排行榜。
- **AI 营销文案分发区**：将生成的四大平台文案放入好看的卡片中，并利用简单的 JS 给每一张卡片加上【一键复制】按钮。
- **网页生成后**，在对话中引导用户前往下载目录双击打开此 HTML 文件，以体验最完整的“自动化营销工作台”。

### 6. 输出格式
最后，在聊天窗口将生成的分析内容以简要的 markdown 格式输出给用户预览。

## 注意事项
- 绝不能捏造改价数据，没有价格波动的品类要如实输出“0变动”。
- 生成 HTML 文件时，务必保证 HTML 和 JS 语法的完整性，确保图表和按钮能直接运行。

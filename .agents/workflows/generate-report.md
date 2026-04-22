---
description: 硬件行情日报/周报一键生成 — 视频口播稿 + 多端文案。触发词：帮我写今天的行情文案、生成日报、写周报、行情汇总、生成报告
---

# 硬件行情报告一键生成

> 用户通过 `/generate-report` 或任何以下说法触发此工作流：
> - "帮我写今天的行情文案" / "帮我生成日报" / "写今日行情" → 生成**日报**
> - "帮我写本周的行情周报" / "写周报" / "本周总结" → 生成**周报**
> - "帮我生成行情报告" / "行情汇总" → 根据上下文判断日报/周报

## 前置要求（必做）
- **必须先阅读技能文件** `.agents/skills/generate-video-script.md`，严格遵守其中的所有规范、标杆产品、模板结构、禁止事项和踩坑记录。
- 根据用户需求判断是日报还是周报，选择对应模板和 API 周期。

## 工作流程

### 1. 读取技能规范
阅读技能文件，了解标杆产品、日报/周报模板、禁止事项和踩坑记录：
```
.agents/skills/generate-video-script.md
```

### 2. 拉取线上行情数据
// turbo
日报：先拉 daily，如果 totalItemChanged=0 则回退到 weekly。周报：直接拉 weekly。
```bash
curl -s -H "X-API-Key: diyxx-ai-secret-key-2026" "https://www.diyxx.com/api/external/market-report-data?period=daily" > /Users/mac/new/video-factory/temp/today_daily.json && curl -s -H "X-API-Key: diyxx-ai-secret-key-2026" "https://www.diyxx.com/api/external/market-report-data?period=weekly" > /Users/mac/new/video-factory/temp/today_weekly.json
```

### 3. 提取并分析数据
// turbo
用 Python 脚本提取四大品类数据、标杆产品变动、极值产品。注意：标杆搜索使用宽松关键词，避免坑5（搜索过严漏数据）：
```bash
python3 /Users/mac/new/video-factory/temp/extract_today.py
```
**如果是周报**，还需要额外计算内存的分层分析（高端/中端/低端的平均降幅百分比）。

### 4. 搜索股票和新闻
通过联网搜索获取：
- 颗粒厂商（三星/SK海力士/美光）的股价表现（日报看当天，周报看一周走势）
- 2-3条科技行业最新新闻

### 5. 撰写文案
根据提取的数据 + 股票 + 新闻，按技能文件中对应模板严格撰写：
- **日报**：整体趋势 → 标杆 → 极值产品（每品类2-5个）→ 股票当日 → 新闻
- **周报**：整体百分比 → 标杆 → 极值（每品类仅2个）→ 分层趋势分析 → 股票一周走势 → 新闻
- CPU 段落结尾加软广："评论区留配置，我帮你看一下"
- 标杆无变动如实说"价格稳定"

### 6. 数据交叉验证（必做）
文案写完后，将文案中每个数字与 API 原始 JSON 逐条交叉比对，确保零误差。输出验证追踪表。

### 7. 输出文案 Artifact
将最终文案保存为 artifact（markdown 文件），附带数据溯源表。

### 8. 生成多端适配版本
在口播稿之后，附上以下版本：
- **小红书版**：800字以内，配 Emoji，突出"降价榜"和"小鱼判断"
- **朋友圈版**：100字以内，只报最猛的 2 个降价和 1 个涨价
- **公众号版**：包含完整数据表格 + 分析文字

### 9. 通知用户
通过回复简要预告今日核心数据，并提示用户已生成文案。

## API 接口速查

| 项目 | 值 |
|------|------|
| 接口地址 | `https://www.diyxx.com/api/external/market-report-data` |
| 请求方式 | GET |
| 认证方式 | Header: `X-API-Key: diyxx-ai-secret-key-2026` |
| 参数 period | `daily`(今天) / `weekly`(近7天) / `monthly`(近30天) |

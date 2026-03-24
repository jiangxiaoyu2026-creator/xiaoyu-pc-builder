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
根据获取到的行情数据和行业快讯，**直接以 AI 助手的能力**生成以下内容：

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
- 开头有 hook（"今天有个大消息..."）
- 中间讲数据和分析
- 结尾有行动号召

### 4. 输出格式
将生成的内容以清晰的 markdown 格式输出给用户，分四个板块展示，每个板块都可以直接复制使用。

## 注意事项
- 所有价格数据必须使用从 API/数据库获取的**真实数据**
- 文案中提到的硬件型号和价格必须准确
- 如果数据库中没有最新的价格变动记录，要如实告知用户
- 每次生成后，提醒用户检查数据准确性

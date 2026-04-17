---
description: 通过行情中心 API 自动拉取数据，生成视频口播稿/图文周报/日报
---

# 硬件行情视频周报/日报 一键生成

> 用户通过 `/generate-weekly-report` 或者说"帮我生成行情周报"、"帮我写视频文案"触发此工作流。

## 背景
- 本工作流通过线上 API 接口 (`/api/external/market-report-data`) 自动拉取行情数据。
- 数据来源为 DIYXX 行情中心的实时监测数据，包含 CPU、显卡、内存、硬盘等品类。
- 接口已配置 API Key 安全认证，防止未授权访问。

## 工作流程

### 1. 通过 API 拉取行情数据
// turbo
先尝试拉取日报数据，如果今日无变动则自动切换为周报：
```bash
curl -s -H "X-API-Key: diyxx-ai-secret-key-2026" "https://www.diyxx.com/api/external/market-report-data?period=daily" -o /tmp/diyxx_daily.json && echo "=== 日报数据 ===" && python3 -c "
import json
with open('/tmp/diyxx_daily.json') as f:
    d = json.load(f)['data']
total = d['summary']['totalItemChanged']
print(f'今日变动总数: {total}')
if total == 0:
    print('今日无变动，需要切换为周报')
else:
    cats = list(d['categories'].keys())
    print(f'涉及品类: {cats}')
"
```

如果上一步输出"今日无变动，需要切换为周报"，则执行：
// turbo
```bash
curl -s -H "X-API-Key: diyxx-ai-secret-key-2026" "https://www.diyxx.com/api/external/market-report-data?period=weekly" -o /tmp/diyxx_weekly.json && echo "=== 周报数据 ===" && python3 -c "
import json
with open('/tmp/diyxx_weekly.json') as f:
    d = json.load(f)['data']
print(f'本周变动总数: {d[\"summary\"][\"totalItemChanged\"]}')
print(f'降价: {d[\"summary\"][\"totalItemsDropped\"]}  涨价: {d[\"summary\"][\"totalItemsIncreased\"]}')
cats = list(d['categories'].keys())
print(f'涉及品类: {cats}')
"
```

### 2. 逐品类拆解数据
// turbo
对拉取到的 JSON 数据，按 CPU、GPU、RAM、DISK 四大核心品类分别统计降价和涨价明细：
```bash
python3 -c "
import json, os
# 优先用周报，没有则用日报
path = '/tmp/diyxx_weekly.json' if os.path.exists('/tmp/diyxx_weekly.json') else '/tmp/diyxx_daily.json'
with open(path) as f:
    data = json.load(f)['data']
cats = data['categories']
for cat in ['cpu', 'gpu', 'ram', 'disk']:
    print(f'\n===== {cat.upper()} =====')
    if cat not in cats:
        print('  本周期无价格变动')
        continue
    items = cats[cat]['items']
    drops = sorted([i for i in items if i['changeAmount'] < 0], key=lambda x: x['changeAmount'])
    rises = sorted([i for i in items if i['changeAmount'] > 0], key=lambda x: x['changeAmount'], reverse=True)
    print(f'  降价: {len(drops)}条 | 涨价: {len(rises)}条')
    if drops:
        print('  --- 降价TOP5 ---')
        for d in drops[:5]:
            print(f'    {d[\"name\"]}: {d[\"oldPrice\"]}→{d[\"newPrice\"]} ({d[\"changeAmount\"]}元, {d[\"changePercent\"]}%)')
    if rises:
        print('  --- 涨价TOP5 ---')
        for r in rises[:5]:
            print(f'    {r[\"name\"]}: {r[\"oldPrice\"]}→{r[\"newPrice\"]} (+{r[\"changeAmount\"]}元, +{r[\"changePercent\"]}%)')
"
```

### 3. 搜索近期行业新闻
使用 search_web 工具搜索 1-2 条相关新闻（如 Intel 涨价原因、内存走势分析等），融入文案增加专业度。

### 4. 生成视频口播文案
根据上述数据和新闻，**严格按照以下模版结构生成视频口播稿**：

**口播稿结构（必须严格遵循）：**

1. **开场·大盘定调**（约15秒）：用一句话点明本周最核心的趋势。例如"内存崩了，硬盘也崩了，但 CPU 在偷偷涨价。"
2. **第一板块·内存**（约50秒）：
   - 报出降价/涨价总条数
   - 点名降幅前3的具体型号、具体金额和现价
   - DDR4 和 DDR5 分别说
3. **第二板块·硬盘**（约40秒）：
   - 1T 和 2T 分开说
   - 点名当前好价型号和具体价格
4. **第三板块·CPU**（约60秒）：
   - AMD 和 Intel 分开说
   - 点明涨跌最大的型号
   - 结合新闻解释涨价原因
5. **第四板块·显卡**（约40秒）：
   - 点名涨降幅最大的型号
6. **结尾·小鱼判断**（约20秒）：
   - 必须包含"小鱼装机建议"
   - 每个品类用一句话给出"买/等/观望"建议
   - 固定结尾语："好，今天的行情就到这里。每周准时更新，喜欢的兄弟点个关注，我们下期再见！"

**语言风格要求：**
- 口语化，像是在和观众面对面聊天
- 价格必须用"X 块"而非"X 元"
- 涨跌必须给出具体金额和现价，不能说"小幅"等模糊词
- 每个板块之间要有过渡句

### 5. 同时生成多端适配版本
在口播稿之后，附上以下版本：
- **小红书版**：800字以内，配 Emoji，突出"降价榜"和"小鱼判断"
- **朋友圈版**：100字以内，只报最猛的 2 个降价和 1 个涨价
- **公众号版**：包含完整数据表格 + 分析文字

### 6. 生成本地可交付的 HTML 战报
使用 `write_to_file` 工具在 `/Users/mac/Downloads/硬件行情战报_<日期>.html` 下生成一份单页HTML文件。
HTML 中需包含：
- 四大品类的涨跌数据表格
- 四端文案区块（视频/小红书/朋友圈/公众号），每个区块提供【一键复制】按钮
- 简洁美观的深色主题样式

## API 接口速查

| 项目 | 值 |
|------|------|
| 接口地址 | `https://www.diyxx.com/api/external/market-report-data` |
| 请求方式 | GET |
| 认证方式 | Header: `X-API-Key: diyxx-ai-secret-key-2026` |
| 参数 period | `daily`(今天) / `weekly`(近7天) / `monthly`(近30天) |

#!/usr/bin/env python3
"""
月度行情数据提取与报告生成工具

用法:
  python scripts/fetch_market_data.py 2026-04-01 2026-04-30
  python scripts/fetch_market_data.py 2026-04-01 2026-04-30 --categories cpu,gpu

输出:
  market_reports/2026-04_raw.json    - 原始 JSON 数据
  market_reports/2026-04_report.md   - Markdown 格式的行情报告
"""

import sys
import os
import json
import argparse
import requests
from datetime import datetime

# ===== 配置 =====
API_BASE = "https://www.diyxx.com/api"
API_KEY = "diyxx-ai-secret-key-2026"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "market_reports")

# 品类中文名映射
CATEGORY_NAMES = {
    "cpu": "💻 CPU 处理器",
    "gpu": "🎮 GPU 显卡",
    "ram": "🧠 内存",
    "disk": "💾 固态硬盘",
    "motherboard": "🔧 主板",
    "psu": "⚡ 电源",
    "case": "🖥️ 机箱",
    "cooler": "❄️ 散热器",
    "monitor": "🖵 显示器",
}


def fetch_data(start_date: str, end_date: str, categories: str = None) -> dict:
    """调用后端 API 获取日期范围对比数据"""
    params = {
        "start_date": start_date,
        "end_date": end_date,
    }
    if categories:
        params["categories"] = categories

    headers = {"X-API-Key": API_KEY}

    print(f"📡 正在请求 API: {API_BASE}/external/date-range-comparison")
    print(f"   日期范围: {start_date} ~ {end_date}")
    if categories:
        print(f"   品类过滤: {categories}")

    resp = requests.get(
        f"{API_BASE}/external/date-range-comparison",
        params=params,
        headers=headers,
        timeout=30,
    )

    if resp.status_code != 200:
        print(f"❌ API 请求失败: HTTP {resp.status_code}")
        print(f"   响应: {resp.text[:500]}")
        sys.exit(1)

    data = resp.json()
    if data.get("status") != "success":
        print(f"❌ API 返回错误: {data}")
        sys.exit(1)

    return data["data"]


def save_json(data: dict, filepath: str):
    """保存原始 JSON 数据"""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"📄 JSON 数据已保存: {filepath}")


def generate_markdown_report(data: dict) -> str:
    """将 API 返回的结构化数据转换为 Markdown 报告"""
    meta = data["meta"]
    summary = data["summary"]
    categories = data.get("categories", {})

    lines = []

    # ===== 标题 =====
    lines.append(f"# 硬件行情月度对比报告")
    lines.append(f"")
    lines.append(f"**统计周期**: {meta['startDate']} ~ {meta['endDate']}")
    lines.append(f"**生成时间**: {meta['generatedAt']}")
    lines.append(f"")

    # ===== 大盘概览 =====
    lines.append(f"## 📊 大盘概览")
    lines.append(f"")
    lines.append(f"| 指标 | 数值 |")
    lines.append(f"|------|------|")
    lines.append(f"| 价格变动产品总数 | **{summary['totalChanged']}** 件 |")
    lines.append(f"| 降价产品数 | 🔻 {summary['totalDown']} 件 |")
    lines.append(f"| 涨价产品数 | 🔺 {summary['totalUp']} 件 |")
    lines.append(f"| 平均降幅 | {summary['avgDropAmount']} 元 ({summary['avgDropPercent']}%) |")
    lines.append(f"| 平均涨幅 | +{summary['avgRiseAmount']} 元 (+{summary['avgRisePercent']}%) |")
    lines.append(f"")

    if not categories:
        lines.append(f"> 本周期内无价格变动记录。")
        return "\n".join(lines)

    # ===== 收集所有产品用于红黑榜 =====
    all_items = []
    for cat, cat_data in categories.items():
        for item in cat_data.get("items", []):
            item_with_cat = dict(item)
            item_with_cat["_category"] = cat
            all_items.append(item_with_cat)

    # ===== 降价黑榜 Top 10 =====
    drops = sorted([i for i in all_items if i["changeAmount"] < 0], key=lambda x: x["changeAmount"])
    if drops:
        lines.append(f"## 🔴 降价黑榜 Top 10")
        lines.append(f"")
        lines.append(f"| 排名 | 产品名称 | 品类 | 月初价 | 月末价 | 降幅 | 降幅% |")
        lines.append(f"|------|---------|------|--------|--------|------|-------|")
        for i, item in enumerate(drops[:10], 1):
            cat_name = CATEGORY_NAMES.get(item["_category"], item["_category"])
            # 去掉emoji前缀用于表格简洁
            short_cat = cat_name.split(" ", 1)[-1] if " " in cat_name else cat_name
            lines.append(
                f"| {i} | {item['name']} | {short_cat} | {item['startPrice']} | {item['endPrice']} | {item['changeAmount']} | {item['changePercent']}% |"
            )
        lines.append(f"")

    # ===== 涨价红榜 Top 10 =====
    rises = sorted([i for i in all_items if i["changeAmount"] > 0], key=lambda x: x["changeAmount"], reverse=True)
    if rises:
        lines.append(f"## 🟢 涨价红榜 Top 10")
        lines.append(f"")
        lines.append(f"| 排名 | 产品名称 | 品类 | 月初价 | 月末价 | 涨幅 | 涨幅% |")
        lines.append(f"|------|---------|------|--------|--------|------|-------|")
        for i, item in enumerate(rises[:10], 1):
            cat_name = CATEGORY_NAMES.get(item["_category"], item["_category"])
            short_cat = cat_name.split(" ", 1)[-1] if " " in cat_name else cat_name
            lines.append(
                f"| {i} | {item['name']} | {short_cat} | {item['startPrice']} | {item['endPrice']} | +{item['changeAmount']} | +{item['changePercent']}% |"
            )
        lines.append(f"")

    # ===== 分品类明细 =====
    # 按照优先级排序品类
    cat_order = ["cpu", "gpu", "ram", "disk", "motherboard", "psu", "case", "cooler", "monitor"]
    sorted_cats = sorted(categories.keys(), key=lambda c: cat_order.index(c) if c in cat_order else 99)

    for cat in sorted_cats:
        cat_data = categories[cat]
        cat_display = CATEGORY_NAMES.get(cat, f"📦 {cat}")
        items = cat_data.get("items", [])
        if not items:
            continue

        lines.append(f"## {cat_display}")
        lines.append(f"")
        lines.append(f"变动产品: **{cat_data['totalChanged']}** 件 (🔻降价 {cat_data['downCount']} / 🔺涨价 {cat_data['upCount']})")
        lines.append(f"")
        lines.append(f"| 产品名称 | 月初价 | 月末价 | 涨跌额 | 涨跌幅 | 调价次数 |")
        lines.append(f"|---------|--------|--------|--------|--------|---------|")

        for item in items:
            sign = "+" if item["changeAmount"] > 0 else ""
            lines.append(
                f"| {item['name']} | {item['startPrice']} | {item['endPrice']} | {sign}{item['changeAmount']} | {sign}{item['changePercent']}% | {item['changeCount']}次 |"
            )
        lines.append(f"")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="月度行情数据提取工具")
    parser.add_argument("start_date", help="起始日期 (YYYY-MM-DD)")
    parser.add_argument("end_date", help="结束日期 (YYYY-MM-DD)")
    parser.add_argument("--categories", "-c", help="品类过滤，逗号分隔 (cpu,gpu,ram,disk)", default=None)
    args = parser.parse_args()

    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 从日期生成文件名（取年月）
    try:
        dt = datetime.strptime(args.start_date, "%Y-%m-%d")
        file_prefix = dt.strftime("%Y-%m")
    except ValueError:
        file_prefix = args.start_date

    # 1. 获取数据
    data = fetch_data(args.start_date, args.end_date, args.categories)

    # 2. 保存 JSON
    json_path = os.path.join(OUTPUT_DIR, f"{file_prefix}_raw.json")
    save_json(data, json_path)

    # 3. 生成并保存 Markdown 报告
    report = generate_markdown_report(data)
    md_path = os.path.join(OUTPUT_DIR, f"{file_prefix}_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"📝 Markdown 报告已保存: {md_path}")

    # 4. 打印摘要
    summary = data.get("summary", {})
    print(f"\n{'='*50}")
    print(f"✅ 报告生成完成！")
    print(f"   变动产品: {summary.get('totalChanged', 0)} 件")
    print(f"   降价: {summary.get('totalDown', 0)} 件")
    print(f"   涨价: {summary.get('totalUp', 0)} 件")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()

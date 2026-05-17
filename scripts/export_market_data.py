#!/usr/bin/env python3
"""
DIYXX 行情数据导出脚本
用法: python3 scripts/export_market_data.py
输出: exports/ 目录下的 CSV 文件，可直接给 AI 工具分析
"""

import urllib.request
import json
import csv
import os
from datetime import date, timedelta

# =================== 配置 ===================
API_BASE = "https://www.diyxx.com/api"
USERNAME = os.getenv("DIYXX_ADMIN_USERNAME", "xiaoyu")
PASSWORD = os.getenv("DIYXX_ADMIN_PASSWORD")
OUTPUT_DIR = "exports"
DAYS = 30
CATEGORIES = ["gpu", "cpu", "ram", "disk"]
# ============================================


def login():
    if not PASSWORD:
        raise RuntimeError("Missing DIYXX_ADMIN_PASSWORD")
    data = json.dumps({"username": USERNAME, "password": PASSWORD}).encode()
    req = urllib.request.Request(
        f"{API_BASE}/auth/login",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read()).get("access_token", "")


def fetch(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def export_price_history(token, today_str):
    """导出所有产品的每日价格历史"""
    print("📊 正在拉取产品列表...")
    all_rows = []

    for cat in CATEGORIES:
        # 先拿到产品列表
        hw_data = fetch(
            f"{API_BASE}/products?category={cat}&status=active&page=1&page_size=200",
            token
        )
        products = hw_data.get("items", hw_data.get("data", []))
        print(f"  {cat.upper()}: {len(products)} 款产品")

        for p in products:
            hw_id = p.get("id")
            hw_name = f"{p.get('brand','')} {p.get('model','')}".strip()
            current_price = p.get("price", 0)
            if not current_price or current_price <= 0:
                continue

            try:
                hist = fetch(
                    f"{API_BASE}/stats/product-price-history?hardware_id={hw_id}&days={DAYS+5}",
                    token
                )
                pts = hist.get("productTrends", [{}])[0].get("points", [])
                if not pts:
                    continue

                # 为每个数据点生成一行
                for pt in pts:
                    all_rows.append({
                        "日期": pt["date"],
                        "品类": cat,
                        "产品名称": hw_name,
                        "产品ID": hw_id,
                        "价格": pt["price"],
                    })
            except Exception as e:
                pass  # 无历史数据的产品跳过

    return all_rows


def export_price_changes(token):
    """导出近期所有价格变动记录"""
    print("📈 正在拉取价格变动记录...")
    rows = []
    for cat in CATEGORIES:
        data = fetch(f"{API_BASE}/stats/price-trends?days={DAYS}&category={cat}", token)
        for c in data.get("recentChanges", []):
            rows.append({
                "变动时间": c.get("changedAt", "")[:19],
                "品类": cat,
                "产品名称": c.get("hardwareName", ""),
                "旧价格": c.get("oldPrice", ""),
                "新价格": c.get("newPrice", ""),
                "变动金额": c.get("changeAmount", ""),
                "变动百分比": f"{c.get('changePercent', 0):.2f}%",
            })
    return rows


def export_current_prices(token):
    """导出所有在售产品当前价格快照"""
    print("💾 正在拉取当前价格快照...")
    rows = []
    for cat in CATEGORIES:
        hw_data = fetch(
            f"{API_BASE}/products?category={cat}&status=active&page=1&page_size=500",
            token
        )
        products = hw_data.get("items", hw_data.get("data", []))
        for p in products:
            price = p.get("price", 0)
            if not price or price <= 0:
                continue
            rows.append({
                "品类": cat,
                "品牌": p.get("brand", ""),
                "型号": p.get("model", ""),
                "当前价格": price,
                "产品ID": p.get("id", ""),
            })
    return rows


def save_csv(rows, filename):
    if not rows:
        print(f"  ⚠️ {filename}: 无数据，跳过")
        return
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig 让 Excel 正确显示中文
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✅ 已保存: {path} ({len(rows)} 行)")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    today_str = date.today().strftime("%Y-%m-%d")

    print(f"🔑 登录中...")
    token = login()
    print(f"✅ 登录成功\n")

    # 1. 当前价格快照
    snapshot_rows = export_current_prices(token)
    save_csv(snapshot_rows, f"当前价格快照_{today_str}.csv")

    # 2. 价格变动记录
    changes_rows = export_price_changes(token)
    save_csv(changes_rows, f"价格变动记录_{today_str}.csv")

    # 3. 逐产品价格历史（数据量大，可能较慢）
    print(f"\n⏳ 拉取产品历史价格数据（约 {DAYS} 天，可能需要 1-2 分钟）...")
    history_rows = export_price_history(token, today_str)
    save_csv(history_rows, f"产品历史价格_{today_str}.csv")

    print(f"\n🎉 导出完成！文件位于 ./{OUTPUT_DIR}/ 目录")
    print(f"   可以直接上传给 ChatGPT / Claude / Kimi 进行数据分析")


if __name__ == "__main__":
    main()

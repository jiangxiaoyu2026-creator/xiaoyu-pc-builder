#!/usr/bin/env python3
"""
京东价格监控 - 初始化商品种子数据
将用户提供的14款内存按3个分类写入 jd_trend_products 表
"""
import sqlite3
import os

# 数据库路径
DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "xiaoyu.db"))

# ============================================
# 用户提供的 14 款监控内存清单，按 3 个分类排列
# ============================================
PRODUCTS = [
    # ---- 分类一: DDR5 6000 C28 32G 16G*2 ----
    {
        "sku_id": "100131725287",
        "name": "佰维 时空行者 DW100 RGB C28 白色",
        "brand": "佰维(BIWIN)",
        "category": "DDR5 6000 C28 32G 16G*2",
        "url": "https://item.jd.com/100131725287.html"
    },
    {
        "sku_id": "100098768438",
        "name": "金百达 星刃 A-die C28 黑色",
        "brand": "金百达(KINGBANK)",
        "category": "DDR5 6000 C28 32G 16G*2",
        "url": "https://item.jd.com/100098768438.html"
    },
    {
        "sku_id": "100114195705",
        "name": "阿斯加特 女武神II代 RGB A-die C28 黑色",
        "brand": "阿斯加特(Asgard)",
        "category": "DDR5 6000 C28 32G 16G*2",
        "url": "https://item.jd.com/100114195705.html"
    },
    {
        "sku_id": "100171531574",
        "name": "宏碁掠夺者 Hermes冰刃 RGB C28 白色",
        "brand": "宏碁掠夺者(PREDATOR)",
        "category": "DDR5 6000 C28 32G 16G*2",
        "url": "https://item.jd.com/100171531574.html"
    },
    {
        "sku_id": "100138827392",
        "name": "芝奇 皇家戟 EXPO版 RGB C28 银色",
        "brand": "G.SKILL芝奇",
        "category": "DDR5 6000 C28 32G 16G*2",
        "url": "https://item.jd.com/100138827392.html"
    },
    {
        "sku_id": "100222160298",
        "name": "光威 龙武 RGB A-die C28 星空黑",
        "brand": "光威(Gloway)",
        "category": "DDR5 6000 C28 32G 16G*2",
        "url": "https://item.jd.com/100222160298.html"
    },

    # ---- 分类二: DDR5 6000 C28 48G 24G*2 ----
    {
        "sku_id": "100214798098",
        "name": "佰维 时空行者 DW100 RGB C28 白色",
        "brand": "佰维(BIWIN)",
        "category": "DDR5 6000 C28 48G 24G*2",
        "url": "https://item.jd.com/100214798098.html"
    },
    {
        "sku_id": "100194387332",
        "name": "阿斯加特 女武神II代 RGB M-die C28 黑色",
        "brand": "阿斯加特(Asgard)",
        "category": "DDR5 6000 C28 48G 24G*2",
        "url": "https://item.jd.com/100194387332.html"
    },
    {
        "sku_id": "100197058538",
        "name": "宏碁掠夺者 Hermes冰刃 RGB C28 白色",
        "brand": "宏碁掠夺者(PREDATOR)",
        "category": "DDR5 6000 C28 48G 24G*2",
        "url": "https://item.jd.com/100197058538.html"
    },

    # ---- 分类三: DDR4 3600 32G 16*2 ----
    {
        "sku_id": "100042308470",
        "name": "阿斯加特 金伦加TUF联名 CJR C18 黑橙甲",
        "brand": "阿斯加特(Asgard)",
        "category": "DDR4 3600 32G 16*2",
        "url": "https://item.jd.com/100042308470.html"
    },
    {
        "sku_id": "100043263864",
        "name": "芝奇 幻光戟 RGB",
        "brand": "G.SKILL芝奇",
        "category": "DDR4 3600 32G 16*2",
        "url": "https://item.jd.com/100043263864.html"
    },
    {
        "sku_id": "100070417863",
        "name": "威刚 XPG龙耀 D35G RGB 釉白",
        "brand": "威刚(ADATA)",
        "category": "DDR4 3600 32G 16*2",
        "url": "https://item.jd.com/100070417863.html"
    },
    {
        "sku_id": "100047815753",
        "name": "金百达 黑爵 intel专用条",
        "brand": "金百达(KINGBANK)",
        "category": "DDR4 3600 32G 16*2",
        "url": "https://item.jd.com/100047815753.html"
    },
    {
        "sku_id": "100005420561",
        "name": "美商海盗船 复仇者LPX C18",
        "brand": "美商海盗船(CORSAIR)",
        "category": "DDR4 3600 32G 16*2",
        "url": "https://item.jd.com/100005420561.html"
    },
]


def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 建表 (如果不存在)
    c.execute("""
        CREATE TABLE IF NOT EXISTS jd_trend_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            brand TEXT DEFAULT '',
            category TEXT NOT NULL,
            url TEXT DEFAULT '',
            isActive INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT ''
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS jd_trend_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            sku_id TEXT NOT NULL,
            price REAL NOT NULL,
            record_date TEXT NOT NULL,
            recorded_at TEXT DEFAULT ''
        )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_jtp_category ON jd_trend_products(category)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_jtpr_sku ON jd_trend_prices(sku_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_jtpr_date ON jd_trend_prices(record_date)")

    from datetime import datetime, timedelta
    now = (datetime.utcnow() + timedelta(hours=8)).isoformat()

    inserted = 0
    skipped = 0
    for p in PRODUCTS:
        try:
            c.execute(
                "INSERT INTO jd_trend_products (sku_id, name, brand, category, url, isActive, createdAt) VALUES (?,?,?,?,?,1,?)",
                (p["sku_id"], p["name"], p["brand"], p["category"], p["url"], now)
            )
            inserted += 1
        except sqlite3.IntegrityError:
            skipped += 1  # 已存在，跳过

    conn.commit()
    conn.close()

    print(f"✅ 种子数据写入完成！新增: {inserted} 条, 跳过(已存在): {skipped} 条")
    print(f"📁 数据库路径: {DB_PATH}")


if __name__ == "__main__":
    seed()

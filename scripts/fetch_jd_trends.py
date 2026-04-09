#!/usr/bin/env python3
"""
京东价格监控 - 价格抓取脚本
已升级为：京东联盟官方开放平台 API (JD Union Open JOS)
"""
import sqlite3
import os
import sys
import json
import time
import hashlib
import logging
from datetime import datetime, timedelta

import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# 数据库路径
DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "xiaoyu.db"))

# 京东联盟 API 配置
# 请注意：账号必须在京东联盟/京粉 APP 完成“实名认证”，否则 API 会返回 431 拒绝访问错误
APP_KEY = "95d6ef40876feb5446e1a76483e77fe0"
APP_SECRET = "1cbc87e2d83e470e8b8f931971309c95"
JD_ROUTER_URL = "https://router.jd.com/api"

def generate_sign(params, secret):
    """JD Union MD5 Sign Algorithm"""
    sorted_keys = sorted(params.keys())
    param_str = secret
    for key in sorted_keys:
        if key != 'sign':
            param_str += key + str(params[key])
    param_str += secret
    return hashlib.md5(param_str.encode('utf-8')).hexdigest().upper()


def get_all_active_products(conn):
    c = conn.cursor()
    c.execute("SELECT id, sku_id, name, brand, category FROM jd_trend_products WHERE isActive = 1 ORDER BY category, id")
    return c.fetchall()

def get_today_str():
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")

def get_now_str():
    return (datetime.utcnow() + timedelta(hours=8)).isoformat()

def already_recorded_today(conn, sku_id, today):
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM jd_trend_prices WHERE sku_id = ? AND record_date = ?", (sku_id, today))
    return c.fetchone()[0] > 0

def save_price(conn, product_id, sku_id, price, record_date):
    c = conn.cursor()
    c.execute(
        "INSERT INTO jd_trend_prices (product_id, sku_id, price, record_date, recorded_at) VALUES (?,?,?,?,?)",
        (product_id, sku_id, price, record_date, get_now_str())
    )
    conn.commit()


def fetch_price_via_jd_union(sku_id):
    """通过京东联盟官方接口获取最新价格"""
    param_json = json.dumps({"goodsReqDTO": {"skuIds": [str(sku_id)]}})
    
    params = {
        "method": "jd.union.open.goods.query",
        "app_key": APP_KEY,
        "timestamp": (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S"),
        "format": "json",
        "v": "1.0",
        "sign_method": "md5",
        "param_json": param_json
    }
    params["sign"] = generate_sign(params, APP_SECRET)
    
    try:
        r = requests.get(JD_ROUTER_URL, params=params, timeout=10, verify=False)
        if r.status_code == 200:
            data = r.json()
            resp = data.get("jd_union_open_goods_query_response", {})
            result_str = resp.get("result", "{}")
            result_dict = json.loads(result_str)
            
            code = result_dict.get("code")
            if code == 200:
                goods_data = result_dict.get("data", [])
                if goods_data:
                    # 获取价格
                    item = goods_data[0]
                    price_info = item.get("priceInfo", {})
                    price = price_info.get("lowestPrice") or price_info.get("price")
                    if price:
                        return float(price)
            elif code == 431:
                logger.error(f"❌ [API未授权] 京东账号未完成实名认证，导致无法获取价格。请前往 union.jd.com 补充实名。")
                return None
            else:
                logger.error(f"❌ [API报错] code={code}, msg={result_dict.get('message')}")
    except Exception as e:
        logger.error(f"请求 JD API 发生异常: {e}")
        
    return None


def fetch_all_prices():
    """主流程: 抓取所有活跃商品的价格"""
    conn = sqlite3.connect(DB_PATH)
    products = get_all_active_products(conn)
    today = get_today_str()

    logger.info(f"📦 共有 {len(products)} 个活跃监控商品")
    logger.info(f"📅 当前日期: {today}")
    logger.info(f"🚀 使用 JD Union 官方 API (JOS) 获取数据...")

    success_count = 0
    skip_count = 0
    fail_count = 0
    failed_items = []

    for pid, sku_id, name, brand, category in products:
        if already_recorded_today(conn, sku_id, today):
            logger.info(f"⏭️  {name} ({sku_id}) - 今日已记录，跳过")
            skip_count += 1
            continue

        logger.info(f"🔍 查询价格: {name} ({sku_id})...")
        price = fetch_price_via_jd_union(sku_id)

        if price is not None and price > 0:
            save_price(conn, pid, sku_id, price, today)
            logger.info(f"✅ {name} ({sku_id}) => ¥{price:.2f}")
            success_count += 1
        else:
            fail_count += 1
            failed_items.append({"id": pid, "sku_id": sku_id, "name": name, "brand": brand})

    conn.close()

    logger.info("=" * 60)
    logger.info(f"📊 抓取完成! 成功: {success_count}, 跳过: {skip_count}, 失败: {fail_count}")
    
    if failed_items:
        logger.info(f"\n⚠️  如果全是失败，请检查上面日志是否有实名认证 (431) 或额度超限等官方错误。")
        logger.warning(f"由于接口不可用，可随时运行 `python3 scripts/fetch_jd_trends.py --manual` 或在管理后台人工补价。")


def manual_entry():
    """手动录入模式"""
    conn = sqlite3.connect(DB_PATH)
    products = get_all_active_products(conn)
    today = get_today_str()

    print(f"\n{'='*60}")
    print(f"📝 京东价格手动录入模式 ({today})")
    print(f"{'='*60}")
    print(f"共 {len(products)} 个商品待录入。")
    print(f"提示: 输入价格按回车，输入 's' 跳过，输入 'q' 退出。\n")

    current_category = ""
    for pid, sku_id, name, brand, category in products:
        if category != current_category:
            current_category = category
            print(f"\n{'─'*50}")
            print(f"📂 分类: {category}")
            print(f"{'─'*50}")

        if already_recorded_today(conn, sku_id, today):
            print(f"  ⏭️  {brand} {name} - 今日已录入")
            continue

        while True:
            user_input = input(f"  💰 {brand} {name}\n     https://item.jd.com/{sku_id}.html\n     请输入价格 (¥): ").strip()
            
            if user_input.lower() == 'q':
                conn.close()
                print("\n👋 已退出录入模式")
                return
            if user_input.lower() == 's':
                print("     ⏭️  已跳过")
                break
            try:
                price = float(user_input.replace('¥', '').replace(',', ''))
                if price > 0:
                    save_price(conn, pid, sku_id, price, today)
                    print(f"     ✅ 已保存: ¥{price:.2f}")
                    break
                else:
                    print("     ⚠️  价格必须大于0")
            except ValueError:
                print("     ⚠️  请输入有效数字")

    conn.close()
    print(f"\n✅ 手动录入完成!")

if __name__ == "__main__":
    if "--manual" in sys.argv:
        manual_entry()
    else:
        fetch_all_prices()

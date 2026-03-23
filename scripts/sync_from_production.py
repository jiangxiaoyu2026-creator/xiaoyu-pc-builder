"""
线上真实数据同步脚本 (无需登录版)
从 diyxx.com 公开 API 拉取硬件和价格历史到本地。

使用: python3 scripts/sync_from_production.py
"""
import sys, os, json, urllib.request

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server_py.db import engine
from server_py.models import Hardware, PriceHistory
from sqlmodel import Session, select

PROD = "https://www.diyxx.com/api"

def get(url):
    try:
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print(f"  ❌ 请求失败 {url}: {e}")
        return None

def sync_products():
    print("\n📦 拉取线上硬件数据 (公开API)...")
    all_items = []
    page = 1
    while True:
        data = get(f"{PROD}/products?page={page}&page_size=100")
        if not data or "items" not in data:
            break
        items = data["items"]
        all_items.extend(items)
        print(f"  第{page}页: {len(items)} 个")
        if len(items) < 100:
            break
        page += 1

    print(f"  共 {len(all_items)} 个硬件")

    with Session(engine) as session:
        for o in session.exec(select(Hardware)).all():
            session.delete(o)
        session.commit()

        for p in all_items:
            hw = Hardware(
                id=p.get("id",""), category=p.get("category",""),
                brand=p.get("brand",""), model=p.get("model",""),
                price=p.get("price",0), previousPrice=p.get("previousPrice"),
                status=p.get("status","active"), sortOrder=p.get("sortOrder",100),
                specs=p.get("specs",{}), image=p.get("image"),
                imageSource=p.get("imageSource","user"), specsSource=p.get("specsSource","user"),
                createdAt=p.get("createdAt",""),
                isDiscount=p.get("isDiscount",False), isRecommended=p.get("isRecommended",False),
                isNew=p.get("isNew",False), costPrice=p.get("costPrice",0.0),
                profitType=p.get("profitType","fixed"), profitValue=p.get("profitValue",0.0),
            )
            session.add(hw)
        session.commit()
        print(f"  ✅ 写入 {len(all_items)} 个硬件到本地")

def sync_price_history():
    print("\n📈 拉取线上价格变动 (公开API, 近90天)...")
    data = get(f"{PROD}/stats/public-price-trends?days=90")
    if not data:
        print("  ❌ 失败"); return

    changes = data.get("recentChanges", [])
    print(f"  获取到 {len(changes)} 条变动记录")

    with Session(engine) as session:
        for o in session.exec(select(PriceHistory)).all():
            session.delete(o)
        session.commit()

        for c in changes:
            session.add(PriceHistory(
                hardwareId=c.get("hardwareId", c.get("id","")),
                hardwareName=c.get("hardwareName",""),
                category=c.get("category",""),
                oldPrice=c.get("oldPrice",0), newPrice=c.get("newPrice",0),
                changeAmount=c.get("changeAmount",0), changePercent=c.get("changePercent",0),
                changedAt=c.get("changedAt",""),
            ))
        session.commit()
        print(f"  ✅ 写入 {len(changes)} 条真实价格历史到本地")

if __name__ == "__main__":
    print("=" * 50)
    print("  从 diyxx.com 同步真实数据 (无需登录)")
    print("=" * 50)
    sync_products()
    sync_price_history()
    print("\n🎉 同步完毕！重启后端即可看到真实数据。")

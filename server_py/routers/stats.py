from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Optional
from ..db import get_session
from ..models import DailyStat, User, Order, Hardware, UsedItem, Config, RecycleRequest, PriceHistory
from .auth import get_current_admin
from datetime import datetime
import time

router = APIRouter()

@router.get("/")
@router.get("")
async def get_stats(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """获取系统统计数据（仅限管理员）"""
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        # 计算总 AI 生成数
        total_ai = session.exec(select(func.sum(DailyStat.aiGenerations))).first() or 0
        
        # Calculate total revenue and orders
        total_revenue = session.exec(select(func.sum(Order.amount)).where(Order.status == "paid")).first() or 0
        total_orders = session.exec(select(func.count(Order.id)).where(Order.status == "paid")).first() or 0
        
        # 获取最近 30 天的统计数据
        daily_stats = session.exec(
            select(DailyStat)
            .order_by(DailyStat.date.desc())
            .limit(30)
        ).all()
        
        # --- 实时计算的统计 ---
        # 今日新增硬件
        today_new_hardware = session.exec(
            select(func.count(Hardware.id)).where(Hardware.createdAt.startswith(today))
        ).first() or 0
        
        # 活跃 VIP 用户数
        now_ts = int(time.time() * 1000)  # milliseconds
        vip_by_expire = session.exec(
            select(func.count(User.id)).where(User.vipExpireAt > now_ts)
        ).first() or 0
        vip_by_role = session.exec(
            select(func.count(User.id)).where(User.role.in_(["admin", "streamer", "sub_admin"]))
        ).first() or 0
        active_vip_count = max(vip_by_expire, vip_by_role)
        
        # 二手闲置统计
        total_used = session.exec(select(func.count(UsedItem.id))).first() or 0
        pending_used = session.exec(
            select(func.count(UsedItem.id)).where(UsedItem.status == "pending")
        ).first() or 0
        today_new_used = session.exec(
            select(func.count(UsedItem.id)).where(UsedItem.createdAt.startswith(today))
        ).first() or 0
        
        # 待审核回收申请
        pending_recycle = session.exec(
            select(func.count(RecycleRequest.id)).where(RecycleRequest.status == "pending")
        ).first() or 0
        
        # 今日新增配置
        today_new_configs = session.exec(
            select(func.count(Config.id)).where(Config.createdAt.startswith(today))
        ).first() or 0
        
        # 硬件总数
        total_hardware = session.exec(select(func.count(Hardware.id))).first() or 0
        active_hardware = session.exec(
            select(func.count(Hardware.id)).where(Hardware.status == "active")
        ).first() or 0
        
        return {
            "totalAiGenerations": total_ai,
            "totalRevenue": total_revenue / 100.0,
            "totalOrders": total_orders,
            "dailyStats": sorted(daily_stats, key=lambda x: x.date),
            # 新增实时统计
            "todayNewHardware": today_new_hardware,
            "todayNewConfigs": today_new_configs,
            "todayNewUsed": today_new_used,
            "activeVipCount": active_vip_count,
            "totalHardware": total_hardware,
            "activeHardware": active_hardware,
            "totalUsed": total_used,
            "pendingUsed": pending_used,
            "pendingRecycle": pending_recycle,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log")
async def log_event(
    event_data: dict,
    session: Session = Depends(get_session)
):
    """记录自定义事件（内部/公开）"""
    event_type = event_data.get("type")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    try:
        # 获取或创建当天的统计记录
        stat = session.get(DailyStat, today)
        if not stat:
            stat = DailyStat(date=today)
            session.add(stat)
            
        if event_type == "ai_generation":
            stat.aiGenerations += 1
        elif event_type == "new_config":
            stat.newConfigs += 1
        elif event_type == "new_user":
            stat.newUsers += 1
        else:
            raise HTTPException(status_code=400, detail="无效的事件类型")
            
        session.commit()
        return {"success": True}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/price-trends")
async def get_price_trends(
    days: int = 30,
    category: Optional[str] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """获取价格变化趋势数据"""
    from datetime import timedelta
    
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    # Get recent price changes
    query = select(PriceHistory).where(PriceHistory.changedAt >= cutoff)
    if category and category != "all":
        query = query.where(PriceHistory.category == category)
    query = query.order_by(PriceHistory.changedAt.desc())
    
    changes = session.exec(query.limit(500)).all()
    
    # Today's summary
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_changes = [c for c in changes if c.changedAt.startswith(today)]
    today_up = [c for c in today_changes if c.changeAmount > 0]
    today_down = [c for c in today_changes if c.changeAmount < 0]
    
    # Group by date for chart data
    date_map = {}
    for c in changes:
        date_key = c.changedAt[:10]  # YYYY-MM-DD
        if date_key not in date_map:
            date_map[date_key] = {"date": date_key, "upCount": 0, "downCount": 0, "totalChanges": 0, "avgChange": 0, "changes": []}
        entry = date_map[date_key]
        entry["totalChanges"] += 1
        if c.changeAmount > 0:
            entry["upCount"] += 1
        else:
            entry["downCount"] += 1
        entry["changes"].append(c.changeAmount)
    
    # Calculate averages
    chart_data = []
    for date_key in sorted(date_map.keys()):
        entry = date_map[date_key]
        entry["avgChange"] = round(sum(entry["changes"]) / len(entry["changes"]), 2) if entry["changes"] else 0
        del entry["changes"]
        chart_data.append(entry)
    
    # Recent changes list (latest 50)
    recent = []
    for c in changes[:50]:
        recent.append({
            "id": c.id,
            "hardwareId": c.hardwareId,
            "hardwareName": c.hardwareName,
            "category": c.category,
            "oldPrice": c.oldPrice,
            "newPrice": c.newPrice,
            "changeAmount": c.changeAmount,
            "changePercent": c.changePercent,
            "changedAt": c.changedAt
        })
    
    # Get available categories
    categories = session.exec(select(Hardware.category).distinct()).all()
    
    return {
        "todaySummary": {
            "upCount": len(today_up),
            "downCount": len(today_down),
            "totalChanges": len(today_changes),
            "avgUpAmount": round(sum(c.changeAmount for c in today_up) / len(today_up), 2) if today_up else 0,
            "avgDownAmount": round(sum(c.changeAmount for c in today_down) / len(today_down), 2) if today_down else 0,
        },
        "chartData": chart_data,
        "recentChanges": recent,
        "categories": sorted([c for c in categories if c]),
    }

import re

def _parse_ram_specs(name: str) -> str:
    name_upper = name.upper()
    capacity = 0
    m_mul = re.search(r'(\d+)[G]?\*(\d+)', name_upper)
    if m_mul:
        capacity = int(m_mul.group(1)) * int(m_mul.group(2))
    else:
        m_single = re.search(r'(\d+)G', name_upper)
        if m_single:
            capacity = int(m_single.group(1))
            
    freq = ""
    m_freq = re.search(r'(3200|3600|4800|5200|5600|6000|6400|6800|7200|7600|8000)', name_upper)
    if m_freq:
        freq = m_freq.group(1)
        
    ddr = ""
    if "DDR4" in name_upper:
        ddr = "DDR4"
    elif "DDR5" in name_upper:
        ddr = "DDR5"
    elif freq:
        ddr = "DDR4" if int(freq) <= 4000 else "DDR5"
        
    tags = []
    if ddr: tags.append(ddr)
    if freq: tags.append(f"{freq}MHz")
    if capacity: tags.append(f"{capacity}GB")
    return " ".join(tags) if tags else "其他未分类规格"


def _parse_disk_specs(name: str) -> str:
    name_upper = name.upper()
    m = re.search(r'(\d+)\s*(TB|T|GB|G)', name_upper)
    if m:
        num = m.group(1)
        unit = m.group(2)
        if unit == 'T': unit = 'TB'
        if unit == 'G': unit = 'GB'
        return f"{num}{unit}"
    return "其他未分类规格"


@router.get("/public-category-trends/{category}")
async def get_public_category_trends(
    category: str,
    days: int = 7,
    session: Session = Depends(get_session)
):
    """前台获取特定品类（内存/硬盘）的细分规格价格变动组"""
    from datetime import timedelta
    
    if category not in ['ram', 'disk']:
        raise HTTPException(status_code=400, detail="Only ram and disk are supported for trend categorization")
        
    cutoff = (datetime.utcnow() + timedelta(hours=8) - timedelta(days=days)).isoformat()
    
    query = select(PriceHistory).where(
        PriceHistory.category == category, 
        PriceHistory.changedAt >= cutoff
    ).order_by(PriceHistory.changedAt.desc())
    
    changes = session.exec(query.limit(1000)).all()
    
    # 剔除价格变为0的数据
    valid_changes = []
    for c in changes:
        if c.oldPrice and c.newPrice and c.oldPrice > 0 and c.newPrice > 0 and getattr(c, 'changeAmount', 0) != 0:
            valid_changes.append(c)
            
    groups = {}
    for c in valid_changes:
        label = _parse_ram_specs(c.hardwareName) if category == 'ram' else _parse_disk_specs(c.hardwareName)
        
        if label not in groups:
            groups[label] = {
                "label": label,
                "count": 0,
                "upCount": 0,
                "downCount": 0,
                "totalChangeAmount": 0,
                "items": []
            }
            
        grp = groups[label]
        grp["count"] += 1
        grp["totalChangeAmount"] += float(c.changeAmount) if c.changeAmount else 0.0
        
        if c.changeAmount and c.changeAmount > 0:
            grp["upCount"] += 1
        elif c.changeAmount and c.changeAmount < 0:
            grp["downCount"] += 1
            
        if len(grp["items"]) < 5:
            pct = round(c.changeAmount / c.oldPrice * 100, 2) if c.oldPrice else 0
            grp["items"].append({
                "name": c.hardwareName,
                "old": c.oldPrice,
                "new": c.newPrice,
                "change": c.changeAmount,
                "changePercent": pct
            })
            
    result = []
    for label, grp in groups.items():
        grp["avgChange"] = round(grp["totalChangeAmount"] / grp["count"], 2) if grp["count"] > 0 else 0
        del grp["totalChangeAmount"]
        result.append(grp)
        
    result.sort(key=lambda x: x["count"], reverse=True)
    
    return {
        "category": category,
        "totalChanges": len(valid_changes),
        "days": days,
        "groups": result
    }

@router.get("/public-price-trends")
async def get_public_price_trends(
    days: int = 30, # 默认给前台看30天的
    session: Session = Depends(get_session)
):
    """前台获取公开价格变化趋势（所有人可用）"""
    from datetime import timedelta
    
    cutoff = (datetime.utcnow() + timedelta(hours=8) - timedelta(days=days)).isoformat()
    
    # Get recent price changes
    query = select(PriceHistory).where(PriceHistory.changedAt >= cutoff).order_by(PriceHistory.changedAt.desc())
    changes = session.exec(query.limit(200)).all() # 限制给前台的数据量
    
    # Today's summary
    today = (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")
    today_changes = [c for c in changes if c.changedAt.startswith(today)]
    today_up = [c for c in today_changes if c.changeAmount > 0]
    today_down = [c for c in today_changes if c.changeAmount < 0]
    
    # Group by date for chart data
    date_map = {}
    for c in changes:
        date_key = c.changedAt[:10]  # YYYY-MM-DD
        if date_key not in date_map:
            date_map[date_key] = {"date": date_key, "upCount": 0, "downCount": 0, "totalChanges": 0, "avgChange": 0, "changes": []}
        entry = date_map[date_key]
        entry["totalChanges"] += 1
        if c.changeAmount > 0:
            entry["upCount"] += 1
        else:
            entry["downCount"] += 1
        entry["changes"].append(c.changeAmount)
    
    # Calculate averages
    chart_data = []
    for date_key in sorted(date_map.keys()):
        entry = date_map[date_key]
        entry["avgChange"] = round(sum(entry["changes"]) / len(entry["changes"]), 2) if entry["changes"] else 0
        del entry["changes"]
        chart_data.append(entry)
    
    # Recent changes list (latest 50 for public)
    recent = []
    for c in changes[:50]:
        recent.append({
            "id": c.id,
            "hardwareName": c.hardwareName,
            "category": c.category,
            "oldPrice": c.oldPrice,
            "newPrice": c.newPrice,
            "changeAmount": c.changeAmount,
            "changePercent": c.changePercent,
            "changedAt": c.changedAt
        })
    
    return {
        "todaySummary": {
            "upCount": len(today_up),
            "downCount": len(today_down),
            "totalChanges": len(today_changes),
        },
        "chartData": chart_data,
        "recentChanges": recent,
    }

@router.get("/product-price-history")
async def get_product_price_history(
    hardware_id: Optional[str] = None,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    days: int = 30,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """获取产品级别价格历史趋势（真实品类/细分均价 + 单品走势）"""
    from datetime import timedelta
    from collections import defaultdict

    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

    # Build the query for price history records
    query = select(PriceHistory).where(PriceHistory.changedAt >= cutoff)
    if category and category != "all":
        query = query.where(PriceHistory.category == category)
    if hardware_id:
        query = query.where(PriceHistory.hardwareId == hardware_id)
    query = query.order_by(PriceHistory.changedAt.asc())

    changes = session.exec(query.limit(2000)).all()

    # --- Build per-product price timeline ---
    # For each product, reconstruct a price curve from change events
    # Each change gives us (date, newPrice), so we can build a step function
    product_timelines = defaultdict(list)  # hardwareId -> [{date, price, name}]
    product_names = {}  # hardwareId -> name

    for c in changes:
        date_key = c.changedAt[:10]
        product_timelines[c.hardwareId].append({
            "date": date_key,
            "price": c.newPrice,
            "oldPrice": c.oldPrice,
        })
        product_names[c.hardwareId] = c.hardwareName

    # Format product trends for frontend
    product_trends = []
    for hw_id, points in product_timelines.items():
        product_trends.append({
            "hardwareId": hw_id,
            "name": product_names[hw_id],
            "points": points  # [{date, price, oldPrice}]
        })

    # --- Category average price trend ---
    category_avg_trend = [] # Legacy field to avoid breaking frontend blindly, leaving empty

    # 2. Total category average (new "全量均价" or "细分规格均价")
    category_total_avg_trend = []
    if category and category != "all":
        # Get current prices and creation dates for all active products in category
        hw_data = session.exec(
            select(Hardware.id, Hardware.name, Hardware.price, Hardware.createdAt)
            .where(Hardware.category == category, Hardware.status == "active")
        ).all()
        
        # Filter by subcategory if requested
        if subcategory and category in ['ram', 'disk']:
            filtered_hw_data = []
            for h in hw_data:
                hw_name = h[1] # h.name is index 1
                if not hw_name: continue
                label = _parse_ram_specs(hw_name) if category == 'ram' else _parse_disk_specs(hw_name)
                if label == subcategory:
                    filtered_hw_data.append(h)
            hw_data = filtered_hw_data
        
        if hw_data:
            # Reconstruct history working backwards from today
            current_date = datetime.utcnow()
            dates = [(current_date - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days + 1)]
            dates.sort()
            
            # Map changes by date for easy lookup
            changes_by_date = defaultdict(list)
            for c in sorted(changes, key=lambda x: x.changedAt, reverse=True):
                changes_by_date[c.changedAt[:10]].append(c)
            
            temp_prices = {h[0]: h[2] for h in hw_data} # h.price is index 2
            hw_created = {h[0]: h[3][:10] if h[3] else "2000-01-01" for h in hw_data} # h.createdAt is index 3
            
            for d in reversed(dates):
                # Only include products that were already created
                valid_prices = [p for hid, p in temp_prices.items() if hw_created[hid] <= d]
                if valid_prices:
                    avg = sum(valid_prices) / len(valid_prices)
                    category_total_avg_trend.append({
                        "date": d,
                        "avgPrice": round(avg, 2)
                    })
                
                # Reverse changes that happened on this day
                for c in changes_by_date.get(d, []):
                    if c.hardwareId in temp_prices:
                        temp_prices[c.hardwareId] = c.oldPrice
            
            category_total_avg_trend.reverse()

    # --- Product list for this category ---
    products_query = select(Hardware.id, Hardware.brand, Hardware.model, Hardware.price, Hardware.category)
    if category and category != "all":
        products_query = products_query.where(Hardware.category == category)
    products_query = products_query.where(Hardware.status == "active").order_by(Hardware.brand, Hardware.model)
    product_rows = session.exec(products_query).all()

    products_list = []
    for row in product_rows:
        products_list.append({
            "id": row[0],
            "name": f"{row[1]} {row[2]}",
            "price": row[3],
            "category": row[4],
        })

    # Available categories
    categories = session.exec(select(Hardware.category).distinct()).all()

    return {
        "productTrends": product_trends,
        "categoryAvgTrend": category_avg_trend,
        "categoryTotalAvgTrend": category_total_avg_trend,
        "products": products_list,
        "categories": sorted([c for c in categories if c]),
    }

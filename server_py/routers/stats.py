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

@router.get("/public-price-trends")
async def get_public_price_trends(
    days: int = 14, # 默认给前台看14天的
    session: Session = Depends(get_session)
):
    """前台获取公开价格变化趋势（所有人可用）"""
    from datetime import timedelta
    
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    # Get recent price changes
    query = select(PriceHistory).where(PriceHistory.changedAt >= cutoff).order_by(PriceHistory.changedAt.desc())
    changes = session.exec(query.limit(200)).all() # 限制给前台的数据量
    
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
    
    # Recent changes list (latest 20 for public)
    recent = []
    for c in changes[:20]:
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

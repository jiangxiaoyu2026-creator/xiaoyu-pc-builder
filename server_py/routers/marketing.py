from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select, func, or_
from typing import List, Optional, Dict, Any
from ..db import get_session
from ..models import Hardware, PriceHistory, User
from .auth import get_current_admin
from ..services.ai_service import AiService
from datetime import datetime, timedelta
import collections

router = APIRouter()

@router.get("/daily-summary")
async def get_marketing_summary(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """
    Get a summary of hardware market activity for social media content.
    Includes:
    1. Top 10 price drops (Today vs Yesterday)
    2. Category highlights (Current Avg vs History Low)
    3. AI recommended 'Best Value' items
    """
    try:
        now = datetime.utcnow()
        start_date = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        # 1. Fetch 7-day Volatility
        recent_changes = session.exec(
            select(PriceHistory)
            .where(PriceHistory.changedAt >= start_date)
            .order_by(func.abs(PriceHistory.changeAmount).desc()) # Biggest absolute changes
            .limit(50)
        ).all()
        
        # 2. Fetch All-time Lows (Simple approximation: min price in history or current)
        # In a real app, we'd have a specific column, but here we scan PriceHistory
        all_time_lows = {}
        # This is a bit heavy, in production we should cache this or use a materialized view
        # For now, let's just get items changed in the last 30 days
        recent_history = session.exec(
            select(PriceHistory.hardwareId, func.min(PriceHistory.newPrice))
            .group_by(PriceHistory.hardwareId)
        ).all()
        for hw_id, min_price in recent_history:
            all_time_lows[hw_id] = min_price

        # 3. Build Category Highlights
        # For each major category, pick the most popular/relevant items
        categories = ["cpu", "mainboard", "gpu", "ram", "disk"]
        highlights = {}
        
        for cat in categories:
            # Get current active items in this category
            items = session.exec(
                select(Hardware)
                .where(Hardware.category == cat, Hardware.status == "active")
                .limit(20) # Sample 20 items per category
            ).all()
            
            cat_data = []
            for item in items:
                # Find yesterday's price (latest change before today)
                yesterday_price_record = session.exec(
                    select(PriceHistory)
                    .where(PriceHistory.hardwareId == item.id, PriceHistory.changedAt < today_start)
                    .order_by(PriceHistory.changedAt.desc())
                    .limit(1)
                ).first()
                
                yesterday_price = yesterday_price_record.newPrice if yesterday_price_record else item.price
                
                cat_data.append({
                    "id": item.id,
                    "name": f"{item.brand} {item.model}",
                    "todayPrice": item.price,
                    "yesterdayPrice": yesterday_price,
                    "historyLow": min(all_time_lows.get(item.id, item.price), item.price),
                    "change": round(item.price - yesterday_price, 2),
                    "changePercent": round((item.price - yesterday_price) / yesterday_price * 100, 2) if yesterday_price != 0 else 0
                })
            
            # Sort by change (drops first) or just show all
            highlights[cat] = sorted(cat_data, key=lambda x: x["change"])

        return {
            "date": now.strftime("%Y-%m-%d"),
            "topDrops": [
                {
                    "name": f"[{c.brand}] {c.hardwareName}" if hasattr(c, 'brand') else c.hardwareName,
                    "category": c.category,
                    "oldPrice": c.oldPrice,
                    "newPrice": c.newPrice,
                    "drop": c.changeAmount,
                    "trend": "down" if c.changeAmount < 0 else "up"
                } for c in recent_changes
            ],
            "categoryHighlights": highlights
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class GenerateDailyRequest(BaseModel):
    external_news: str = ""

@router.post("/generate-daily")
def generate_daily_marketing(
    request: GenerateDailyRequest,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """
    Generate the 4-platform marketing content using AI based on today's hardware price drops.
    """
    # 1. 抓取当日大盘行情数据 — 尽可能丰富
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    today_changes = session.exec(
        select(PriceHistory)
        .where(PriceHistory.changedAt >= today_start)
        .order_by(PriceHistory.changeAmount.asc())
        .limit(30)
    ).all()
    
    # 按品类分组，给 AI 更有结构的数据
    grouped: dict = {}
    for c in today_changes:
        cat = c.category or '其他'
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append({
            "名称": c.hardwareName,
            "旧价": c.oldPrice,
            "新价": c.newPrice,
            "降幅(元)": round(c.changeAmount, 2),
            "降幅(%)": round(c.changePercent, 2)
        })
    
    # 构建摘要
    total_items = len(today_changes)
    avg_drop = round(sum(c.changeAmount for c in today_changes) / total_items, 2) if total_items > 0 else 0
    biggest_drop = today_changes[0] if today_changes else None
    
    daily_data = {
        "日期": now.strftime("%Y-%m-%d"),
        "今日总计变价商品数": total_items,
        "平均降幅(元)": avg_drop,
        "今日降价王": f"{biggest_drop.hardwareName} 暴降 {abs(biggest_drop.changeAmount):.0f}元 ({biggest_drop.changePercent:.1f}%)" if biggest_drop else "暂无",
        "各品类详细数据": grouped
    }
    
    ai_service = AiService(session)
    result = ai_service.generate_marketing_content(daily_data, request.external_news)
    
    if not result:
        raise HTTPException(status_code=500, detail="AI 生成文案失败，请稍后重试或检查配置。")

    media_assets = []
    relevant_models = result.get("relevant_hardware_models", [])
    if isinstance(relevant_models, list):
        for model_str in relevant_models:
            words = model_str.split()
            stmt = select(Hardware).where(Hardware.status == 'active')
            for w in words:
                stmt = stmt.where(
                    or_(
                        Hardware.model.ilike(f"%{w}%"),
                        Hardware.brand.ilike(f"%{w}%")
                    )
                )
            stmt = stmt.limit(1)
            matched = session.exec(stmt).first()
            if matched and matched.image:
                media_assets.append({
                    "id": matched.id,
                    "brand": matched.brand,
                    "model": matched.model,
                    "image": matched.image,
                    "keyword": model_str
                })
            else:
                media_assets.append({
                    "id": None,
                    "brand": "",
                    "model": model_str,
                    "image": None,
                    "keyword": model_str
                })
    
    result["media_assets"] = media_assets
        
    return {
        "status": "success",
        "data": result
    }

@router.get("/category-trends")
def get_category_trends(
    category: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """
    Returns the table data for Douyin Video 实时均价与行情波动 table.
    Groups items by specs (or model if specs are missing), and calculates vs 1, 7 days.
    """
    now = datetime.utcnow()
    day1_start = (now - timedelta(days=1)).isoformat()
    day7_start = (now - timedelta(days=7)).isoformat()
    
    # Get active hardware in category
    # DDR4 and DDR5 can be distinguished using model names from 'ram'
    real_category = "ram" if category.lower() in ["ddr4", "ddr5"] else category
    
    items = session.exec(select(Hardware).where(Hardware.category == real_category, Hardware.status == "active")).all()
    
    # Group items by a key, e.g., specs or model
    # For ram, we usually use model + capacity string, or brand + model
    grouped = collections.defaultdict(list)
    for item in items:
        # If it's ram, separate by DDR4/DDR5 if requested
        if real_category == "ram" and category.upper() not in item.model.upper():
            continue
            
        group_key = item.model
        if "GB" in group_key or "MHz" in group_key: # Good enough for grouping RAM
             # Extract the standard spec ignoring brand, or simply use model
             group_key = f"{category.upper()} {item.model.split()[-1] if ' ' in item.model else item.model}"
        
        # CPU grouping
        if real_category == "cpu":
             group_key = f"{item.brand} {item.model}"
             
        grouped[group_key].append(item)
        
    results = []
    for spec, hw_list in grouped.items():
        count = len(hw_list)
        if count == 0: continue
            
        current_avg = sum(item.price for item in hw_list) / count
        
        # Fetch historic prices for these items
        hw_ids = [item.id for item in hw_list]
        
        # Price 1 day ago
        # To get the average price X days ago, we need the closest price chronologically.
        def get_avg_at_date(day_start):
            total = 0
            for item in hw_list:
                # 1. Try to find the latest price BEFORE or AT day_start
                ph_before = session.exec(
                    select(PriceHistory)
                    .where(PriceHistory.hardwareId == item.id, PriceHistory.changedAt <= day_start)
                    .order_by(PriceHistory.changedAt.desc())
                ).first()
                
                if ph_before:
                    total += ph_before.newPrice
                    continue
                    
                # 2. If no history before, find the EARLIEST price AFTER day_start
                # This represents the price before the first recorded change!
                ph_after = session.exec(
                    select(PriceHistory)
                    .where(PriceHistory.hardwareId == item.id, PriceHistory.changedAt > day_start)
                    .order_by(PriceHistory.changedAt.asc())
                ).first()
                
                if ph_after:
                    total += ph_after.oldPrice
                    continue
                    
                # 3. If no history at all, the price hasn't changed since creation
                total += item.price
                
            return total / count

        avg_1day = get_avg_at_date(day1_start)
        avg_7day = get_avg_at_date(day7_start)

        # Calculate percentages
        def calc_pct(old_val, new_val):
            if old_val == 0: return 0
            return round((new_val - old_val) / old_val * 100, 2)
            
        vs1 = calc_pct(avg_1day, current_avg)
        vs7 = calc_pct(avg_7day, current_avg)
        
        # Only add if we have a reasonable average
        if current_avg > 0:
            results.append({
                "spec": spec,
                "count": count,
                "currentAvg": round(current_avg),
                "vs1": vs1,
                "vs7": vs7,
                "vs14": 0, # Placeholder
                "vs30": 0  # Placeholder
            })
            
    # Sort by current average price ascending
    results.sort(key=lambda x: x["currentAvg"])
    return results[:15] # Limit to 15 rows for neatness


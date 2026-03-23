from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select, func
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
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        yesterday_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        # 1. Fetch Today's Changes
        today_changes = session.exec(
            select(PriceHistory)
            .where(PriceHistory.changedAt >= today_start)
            .order_by(PriceHistory.changeAmount.asc()) # Biggest drops first
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
                    "name": c.hardwareName,
                    "category": c.category,
                    "oldPrice": c.oldPrice,
                    "newPrice": c.newPrice,
                    "drop": c.changeAmount
                } for c in today_changes[:10]
            ],
            "categoryHighlights": highlights
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class GenerateDailyRequest(BaseModel):
    external_news: str = ""

@router.post("/generate-daily")
async def generate_daily_marketing(
    request: GenerateDailyRequest,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """
    Generate the 4-platform marketing content using AI based on today's hardware price drops.
    """
    # 1. 抓取当日大盘行情数据（复用 summary 逻辑或简化提取）
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    today_changes = session.exec(
        select(PriceHistory)
        .where(PriceHistory.changedAt >= today_start)
        .order_by(PriceHistory.changeAmount.asc())
        .limit(15)
    ).all()
    
    top_drops_data = [
        {
            "category": c.category,
            "hardwareName": c.hardwareName,
            "oldPrice": c.oldPrice,
            "newPrice": c.newPrice,
            "drop": c.changeAmount
        } for c in today_changes
    ]
    
    daily_data = {
        "date": now.strftime("%Y-%m-%d"),
        "top_drops_today": top_drops_data
    }
    
    # 2. 调用 AI 服务生成多端文案
    ai_service = AiService(session)
    result = ai_service.generate_marketing_content(daily_data, request.external_news)
    
    if not result:
        raise HTTPException(status_code=500, detail="AI 生成文案失败，请稍后重试或检查配置。")
        
    return {
        "status": "success",
        "data": result
    }

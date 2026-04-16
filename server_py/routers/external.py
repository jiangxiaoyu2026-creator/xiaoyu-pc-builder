import os
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from sqlmodel import Session, select, func
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from ..db import get_session
from ..models import PriceHistory, Hardware

router = APIRouter()

# 获取配置的 API KEY，并在如果没有配置时给予一个默认值提示
EXTERNAL_API_KEY = os.getenv("EXTERNAL_API_KEY", "diyxx-ai-secret-key-2026")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    if api_key != EXTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key


@router.get("/market-report-data")
async def get_market_report_data(
    period: str = "daily",  # daily, weekly, monthly
    session: Session = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    """
    专门为 AI 提供的行情数据接口，可用于分析和生成日报/周报/月报。
    """
    days_map = {
        "daily": 1,
        "weekly": 7,
        "monthly": 30
    }
    
    if period not in days_map:
        raise HTTPException(status_code=400, detail="Invalid period. Use 'daily', 'weekly', or 'monthly'.")
        
    days = days_map[period]
    now = datetime.utcnow() + timedelta(hours=8)
    cutoff_dt = now - timedelta(days=days)
    
    # 将 cutoff 设置为截断至天，即当天的 00:00:00 (如果 daily 的话，即从昨天这个时候算起或者从今天 0点起)
    # 对于 daily 行情，应该是指今天0点到现在，这里为了更加实用，设为：
    if period == "daily":
        cutoff_date_str = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    else:
        cutoff_date_str = cutoff_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    # 获取时间范围内的所有价格变动
    changes = session.exec(
        select(PriceHistory)
        .where(PriceHistory.changedAt >= cutoff_date_str)
        .order_by(PriceHistory.changeAmount.asc())
    ).all()
    
    # 按照正宗变动分组
    drops = [c for c in changes if c.changeAmount < 0]
    rises = [c for c in changes if c.changeAmount > 0]
    
    # 排序以找出极端变动
    drops_sorted = sorted(drops, key=lambda x: x.changeAmount) # 降幅最大排前面
    rises_sorted = sorted(rises, key=lambda x: x.changeAmount, reverse=True) # 涨幅最大排前面
    
    # 构建结构化的返回数据供 AI 处理
    report_data = {
        "meta": {
            "period": period,
            "days": days,
            "generatedAt": now.strftime("%Y-%m-%d %H:%M:%S"),
            "startDateStr": cutoff_date_str
        },
        "summary": {
            "totalItemChanged": len(changes),
            "totalItemsDropped": len(drops),
            "totalItemsIncreased": len(rises),
            "averageDrop": round(sum(d.changeAmount for d in drops) / len(drops), 2) if drops else 0,
            "averageIncrease": round(sum(r.changeAmount for r in rises) / len(rises), 2) if rises else 0,
        },
        "extremeChanges": {
            "biggestDrops": [
                {
                    "name": d.hardwareName,
                    "category": d.category,
                    "oldPrice": d.oldPrice,
                    "newPrice": d.newPrice,
                    "changeAmount": d.changeAmount,
                    "changePercent": round(d.changePercent, 2),
                    "time": d.changedAt
                } for d in drops_sorted[:10]
            ],
            "biggestIncreases": [
                {
                    "name": r.hardwareName,
                    "category": r.category,
                    "oldPrice": r.oldPrice,
                    "newPrice": r.newPrice,
                    "changeAmount": r.changeAmount,
                    "changePercent": round(r.changePercent, 2),
                    "time": r.changedAt
                } for r in rises_sorted[:10]
            ]
        },
        "categories": {}
    }
    
    # 按照分类汇总并打包
    for c in changes:
        cat = c.category if c.category else "other"
        if cat not in report_data["categories"]:
            report_data["categories"][cat] = {
                "changedItemCount": 0,
                "items": []
            }
            
        report_data["categories"][cat]["changedItemCount"] += 1
        
        # 为了不让数据过于庞大，将每个分类的具体信息限制，或做高度精炼
        # 这里只推入比较重要的明细，如果数据量过多 AI 容易突破上下文
        report_data["categories"][cat]["items"].append({
             "name": c.hardwareName,
             "oldPrice": c.oldPrice,
             "newPrice": c.newPrice,
             "changeAmount": c.changeAmount,
             "changePercent": round(c.changePercent, 2),
             "time": c.changedAt
        })
        
    return {
        "status": "success",
        "data": report_data
    }

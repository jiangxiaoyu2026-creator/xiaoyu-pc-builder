import os
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from sqlmodel import Session, select, func
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict

from ..db import get_session
from ..models import PriceHistory, Hardware
from ..services.price_safety import is_valid_price_history_change

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
    # 结合运营需求，每天 13:00 前拉取 daily 报告时，自动出昨天的完整报告
    end_date_str = None
    if period == "daily":
        if now.hour < 13:
            target_date = now - timedelta(days=1)
            cutoff_date_str = target_date.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            end_date_str = target_date.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        else:
            cutoff_date_str = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            end_date_str = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    else:
        cutoff_date_str = cutoff_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    # 获取时间范围内的所有价格变动
    query = select(PriceHistory).where(PriceHistory.changedAt >= cutoff_date_str)
    if end_date_str:
        query = query.where(PriceHistory.changedAt <= end_date_str)
    
    changes = session.exec(
        query.order_by(PriceHistory.changeAmount.asc())
    ).all()
    changes = [c for c in changes if is_valid_price_history_change(c.oldPrice, c.newPrice)]
    
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


@router.get("/date-range-comparison")
async def get_date_range_comparison(
    start_date: str,  # 格式: 2026-04-01
    end_date: str,    # 格式: 2026-04-30
    categories: Optional[str] = None,  # 可选，逗号分隔: cpu,gpu,ram,disk
    session: Session = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    """
    自定义日期范围的价格对比接口。
    核心算法：对每个产品，取该时段内第一条变动记录的 oldPrice 作为月初价，
    最后一条变动记录的 newPrice 作为月末价，计算净涨跌。
    """
    # 参数校验
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD 格式")
    
    if start_dt >= end_dt:
        raise HTTPException(status_code=400, detail="start_date 必须早于 end_date")

    # 构建查询：获取时间范围内的所有 PriceHistory 记录
    start_str = start_date + "T00:00:00"
    end_str = end_date + "T23:59:59"
    
    query = select(PriceHistory).where(
        PriceHistory.changedAt >= start_str,
        PriceHistory.changedAt <= end_str
    )
    
    # 如果指定了品类过滤
    if categories:
        cat_list = [c.strip() for c in categories.split(",") if c.strip()]
        if cat_list:
            query = query.where(PriceHistory.category.in_(cat_list))
    
    query = query.order_by(PriceHistory.changedAt.asc())
    all_changes = session.exec(query).all()
    all_changes = [c for c in all_changes if is_valid_price_history_change(c.oldPrice, c.newPrice)]
    
    if not all_changes:
        now_cst = datetime.utcnow() + timedelta(hours=8)
        return {
            "status": "success",
            "data": {
                "meta": {
                    "startDate": start_date,
                    "endDate": end_date,
                    "generatedAt": now_cst.strftime("%Y-%m-%d %H:%M:%S")
                },
                "summary": {
                    "totalChanged": 0, "totalUp": 0, "totalDown": 0,
                    "avgDropAmount": 0, "avgDropPercent": 0,
                    "avgRiseAmount": 0, "avgRisePercent": 0
                },
                "categories": {}
            }
        }
    
    # 按产品 ID 分组
    product_changes = defaultdict(list)
    for change in all_changes:
        product_changes[change.hardwareId].append(change)
    
    # 对每个产品执行价格重建算法
    product_results = []
    for hw_id, changes in product_changes.items():
        # changes 已按时间升序排列（查询时 ORDER BY changedAt ASC）
        first_change = changes[0]
        last_change = changes[-1]
        
        start_price = first_change.oldPrice   # 月初价 = 第一条记录变动前的价格
        end_price = last_change.newPrice      # 月末价 = 最后一条记录变动后的价格
        
        # 数据清洗：剔除 price=0（下架产品）和净变动为 0 的产品
        if start_price <= 0 or end_price <= 0:
            continue
        
        net_change = round(end_price - start_price, 2)
        if net_change == 0:
            continue
        
        net_percent = round((net_change / start_price) * 100, 2) if start_price > 0 else 0
        
        product_results.append({
            "hardwareId": hw_id,
            "name": first_change.hardwareName,
            "category": first_change.category,
            "startPrice": start_price,
            "endPrice": end_price,
            "changeAmount": net_change,
            "changePercent": net_percent,
            "changeCount": len(changes)  # 期间内调价次数
        })
    
    # 统计汇总
    drops = [p for p in product_results if p["changeAmount"] < 0]
    rises = [p for p in product_results if p["changeAmount"] > 0]
    
    now_cst = datetime.utcnow() + timedelta(hours=8)
    
    summary = {
        "totalChanged": len(product_results),
        "totalUp": len(rises),
        "totalDown": len(drops),
        "avgDropAmount": round(sum(d["changeAmount"] for d in drops) / len(drops), 2) if drops else 0,
        "avgDropPercent": round(sum(d["changePercent"] for d in drops) / len(drops), 2) if drops else 0,
        "avgRiseAmount": round(sum(r["changeAmount"] for r in rises) / len(rises), 2) if rises else 0,
        "avgRisePercent": round(sum(r["changePercent"] for r in rises) / len(rises), 2) if rises else 0,
    }
    
    # 按品类分组
    categories_data = defaultdict(lambda: {"totalChanged": 0, "upCount": 0, "downCount": 0, "items": []})
    
    for p in product_results:
        cat = p["category"] if p["category"] else "other"
        categories_data[cat]["totalChanged"] += 1
        if p["changeAmount"] > 0:
            categories_data[cat]["upCount"] += 1
        else:
            categories_data[cat]["downCount"] += 1
        categories_data[cat]["items"].append({
            "hardwareId": p["hardwareId"],
            "name": p["name"],
            "startPrice": p["startPrice"],
            "endPrice": p["endPrice"],
            "changeAmount": p["changeAmount"],
            "changePercent": p["changePercent"],
            "changeCount": p["changeCount"]
        })
    
    # 每个品类的 items 按涨跌额排序（降幅最大在前）
    for cat in categories_data:
        categories_data[cat]["items"].sort(key=lambda x: x["changeAmount"])
    
    return {
        "status": "success",
        "data": {
            "meta": {
                "startDate": start_date,
                "endDate": end_date,
                "generatedAt": now_cst.strftime("%Y-%m-%d %H:%M:%S")
            },
            "summary": summary,
            "categories": dict(categories_data)
        }
    }

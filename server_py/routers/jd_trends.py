"""
京东价格趋势监控 API 路由
提供监控商品列表、价格历史、手动录入等接口
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from ..db import get_session
from ..models import JDTrendProduct, JDTrendPrice
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class PriceEntry(BaseModel):
    """手动录入价格的请求体"""
    sku_id: str
    price: float
    record_date: Optional[str] = None  # 默认今天


class BatchPriceEntry(BaseModel):
    """批量手动录入"""
    entries: List[PriceEntry]


def get_today():
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")


def get_now():
    return (datetime.utcnow() + timedelta(hours=8)).isoformat()


@router.get("")
def get_jd_trends(session: Session = Depends(get_session)):
    """
    获取所有监控商品及其最新价格和涨跌情况
    按 category 分组返回
    """
    # 1. 获取所有活跃商品
    products = session.exec(
        select(JDTrendProduct)
        .where(JDTrendProduct.isActive == True)
        .order_by(JDTrendProduct.category, JDTrendProduct.id)
    ).all()

    result = {}
    for p in products:
        # 获取最近两条价格记录（用于计算涨跌）
        prices = session.exec(
            select(JDTrendPrice)
            .where(JDTrendPrice.sku_id == p.sku_id)
            .order_by(JDTrendPrice.record_date.desc())
            .limit(2)
        ).all()

        current_price = prices[0].price if len(prices) > 0 else None
        previous_price = prices[1].price if len(prices) > 1 else None
        last_date = prices[0].record_date if len(prices) > 0 else None

        # 计算涨跌
        change_amount = None
        change_percent = None
        if current_price is not None and previous_price is not None:
            change_amount = round(current_price - previous_price, 2)
            if previous_price > 0:
                change_percent = round((current_price - previous_price) / previous_price * 100, 2)

        # 获取历史最低价和最高价
        all_prices = session.exec(
            select(JDTrendPrice)
            .where(JDTrendPrice.sku_id == p.sku_id)
            .order_by(JDTrendPrice.record_date)
        ).all()
        
        price_values = [pp.price for pp in all_prices if pp.price and pp.price > 0]
        min_price = min(price_values) if price_values else None
        max_price = max(price_values) if price_values else None
        total_records = len(price_values)

        item = {
            "id": p.id,
            "sku_id": p.sku_id,
            "name": p.name,
            "brand": p.brand,
            "category": p.category,
            "url": p.url,
            "current_price": current_price,
            "previous_price": previous_price,
            "change_amount": change_amount,
            "change_percent": change_percent,
            "last_date": last_date,
            "min_price": min_price,
            "max_price": max_price,
            "total_records": total_records,
        }

        if p.category not in result:
            result[p.category] = []
        result[p.category].append(item)

    return {"categories": result}


@router.get("/history/{sku_id}")
def get_price_history(sku_id: str, days: int = 90, session: Session = Depends(get_session)):
    """
    获取指定商品的历史价格趋势数据
    默认返回最近90天
    """
    # 验证商品存在
    product = session.exec(
        select(JDTrendProduct).where(JDTrendProduct.sku_id == sku_id)
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    cutoff = (datetime.utcnow() + timedelta(hours=8) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    prices = session.exec(
        select(JDTrendPrice)
        .where(JDTrendPrice.sku_id == sku_id)
        .where(JDTrendPrice.record_date >= cutoff)
        .order_by(JDTrendPrice.record_date)
    ).all()

    return {
        "product": {
            "id": product.id,
            "sku_id": product.sku_id,
            "name": product.name,
            "brand": product.brand,
            "category": product.category,
        },
        "history": [
            {"date": p.record_date, "price": p.price}
            for p in prices
        ]
    }


@router.post("/price")
def add_price(entry: PriceEntry, session: Session = Depends(get_session)):
    """
    手动录入单个商品价格
    """
    product = session.exec(
        select(JDTrendProduct).where(JDTrendProduct.sku_id == entry.sku_id)
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"SKU {entry.sku_id} 不在监控列表中")

    record_date = entry.record_date or get_today()

    # 检查是否已有当天记录，有则更新
    existing = session.exec(
        select(JDTrendPrice)
        .where(JDTrendPrice.sku_id == entry.sku_id)
        .where(JDTrendPrice.record_date == record_date)
    ).first()

    if existing:
        existing.price = entry.price
        existing.recorded_at = get_now()
        session.add(existing)
    else:
        new_price = JDTrendPrice(
            product_id=product.id,
            sku_id=entry.sku_id,
            price=entry.price,
            record_date=record_date,
            recorded_at=get_now()
        )
        session.add(new_price)

    session.commit()
    return {"ok": True, "message": f"已保存 {product.name} 的价格 ¥{entry.price} ({record_date})"}


@router.post("/price/batch")
def add_prices_batch(batch: BatchPriceEntry, session: Session = Depends(get_session)):
    """
    批量录入价格（前端一键提交当日所有价格）
    """
    results = []
    for entry in batch.entries:
        product = session.exec(
            select(JDTrendProduct).where(JDTrendProduct.sku_id == entry.sku_id)
        ).first()
        if not product:
            results.append({"sku_id": entry.sku_id, "ok": False, "message": "商品不存在"})
            continue

        record_date = entry.record_date or get_today()
        
        existing = session.exec(
            select(JDTrendPrice)
            .where(JDTrendPrice.sku_id == entry.sku_id)
            .where(JDTrendPrice.record_date == record_date)
        ).first()

        if existing:
            existing.price = entry.price
            existing.recorded_at = get_now()
            session.add(existing)
        else:
            new_price = JDTrendPrice(
                product_id=product.id,
                sku_id=entry.sku_id,
                price=entry.price,
                record_date=record_date,
                recorded_at=get_now()
            )
            session.add(new_price)

        results.append({"sku_id": entry.sku_id, "ok": True, "name": product.name, "price": entry.price})

    session.commit()
    return {"ok": True, "results": results, "count": len([r for r in results if r["ok"]])}


@router.get("/products")
def get_monitored_products(session: Session = Depends(get_session)):
    """获取所有监控商品列表（含非活跃的）"""
    products = session.exec(
        select(JDTrendProduct).order_by(JDTrendProduct.category, JDTrendProduct.id)
    ).all()
    return {"products": [dict(
        id=p.id, sku_id=p.sku_id, name=p.name, brand=p.brand,
        category=p.category, url=p.url, isActive=p.isActive
    ) for p in products]}


@router.post("/products")
def add_product(
    sku_id: str = Body(...),
    name: str = Body(...),
    brand: str = Body(""),
    category: str = Body(...),
    url: str = Body(""),
    session: Session = Depends(get_session)
):
    """新增监控商品"""
    existing = session.exec(
        select(JDTrendProduct).where(JDTrendProduct.sku_id == sku_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="该SKU已在监控列表中")

    product = JDTrendProduct(
        sku_id=sku_id, name=name, brand=brand, category=category,
        url=url, isActive=True, createdAt=get_now()
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return {"ok": True, "product": product}


@router.delete("/products/{sku_id}")
def remove_product(sku_id: str, session: Session = Depends(get_session)):
    """停止监控商品（软删除，设为非活跃）"""
    product = session.exec(
        select(JDTrendProduct).where(JDTrendProduct.sku_id == sku_id)
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    product.isActive = False
    session.add(product)
    session.commit()
    return {"ok": True, "message": f"已停止监控 {product.name}"}

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Hardware, User, PriceHistory
from .auth import get_current_admin
import uuid
import json
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/", response_model=dict)
@router.get("", response_model=dict)
async def get_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    is_recommended: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session)
):
    # Only return active products for public API
    query = select(Hardware).where(Hardware.status == "active")
    
    if category:
        query = query.where(Hardware.category == category)
    if brand:
        query = query.where(Hardware.brand == brand)
    if is_recommended is not None:
        query = query.where(Hardware.isRecommended == is_recommended)
    
    if search:
        from sqlmodel import or_
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            # Use coalesce to handle potential NULL values in database
            from sqlalchemy import func
            query = query.where(or_(
                func.coalesce(Hardware.brand, "").ilike(search_term),
                func.coalesce(Hardware.model, "").ilike(search_term)
            ))
        
    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(Hardware).where(Hardware.status == "active")
    if category: count_query = count_query.where(Hardware.category == category)
    if brand: count_query = count_query.where(Hardware.brand == brand)
    if is_recommended is not None: count_query = count_query.where(Hardware.isRecommended == is_recommended)
    if search:
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            count_query = count_query.where(or_(
                func.coalesce(Hardware.brand, "").ilike(search_term),
                func.coalesce(Hardware.model, "").ilike(search_term)
            ))
    total = session.scalar(count_query)

    offset = (page - 1) * page_size
    results = session.exec(query.order_by(Hardware.sortOrder).offset(offset).limit(page_size)).all()
    
    # Manual conversion to ensure specs is parsed as JSON object
    products = []
    for hw in results:
        hw_dict = hw.model_dump()
        if isinstance(hw.specs, str):
            try:
                hw_dict["specs"] = json.loads(hw.specs)
            except:
                hw_dict["specs"] = {}
        products.append(hw_dict)
        
    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/admin", response_model=dict)
async def get_admin_products(
    page: int = 1,
    page_size: int = 20,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session), 
    admin: User = Depends(get_current_admin)
):
    """Admin only: Get all products including archived ones with pagination and filtering"""
    from sqlalchemy import func, or_
    
    query = select(Hardware)
    
    if category and category != 'all':
        query = query.where(Hardware.category == category)
    
    if brand and brand != 'all':
        query = query.where(Hardware.brand == brand)
    
    if search:
        print(f"DEBUG: Search query: '{search}'")
        # Support multi-keyword search (e.g., "MSI 迫" -> matches MSI brand and 迫击炮 model)
        keywords = search.strip().split()
        print(f"DEBUG: Keywords: {keywords}")
        for kw in keywords:
            search_term = f"%{kw}%"
            query = query.where(or_(
                func.coalesce(Hardware.brand, "").ilike(search_term),
                func.coalesce(Hardware.model, "").ilike(search_term)
            ))
        
    # Count total for the filtered query
    count_query = select(func.count()).select_from(Hardware)
    if category and category != 'all':
        count_query = count_query.where(Hardware.category == category)
    if brand and brand != 'all':
        count_query = count_query.where(Hardware.brand == brand)
    if search:
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            count_query = count_query.where(or_(
                func.coalesce(Hardware.brand, "").ilike(search_term),
                func.coalesce(Hardware.model, "").ilike(search_term)
            ))
        
    total = session.scalar(count_query)
    
    offset = (page - 1) * page_size
    results = session.exec(query.order_by(Hardware.sortOrder).offset(offset).limit(page_size)).all()
    
    products = []
    for hw in results:
        hw_dict = hw.model_dump()
        if isinstance(hw.specs, str):
            try:
                hw_dict["specs"] = json.loads(hw.specs)
            except:
                hw_dict["specs"] = {}
        products.append(hw_dict)
        
    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/brands", response_model=List[str])
async def get_brands(
    category: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get all distinct brands, optionally filtered by category"""
    from sqlalchemy import distinct
    
    query = select(distinct(Hardware.brand)).where(Hardware.brand != None)
    
    if category and category != 'all':
        query = query.where(Hardware.category == category)
        
    brands = session.exec(query).all()
    # Filter out empty strings if any and sort
    return sorted([b for b in brands if b])

def _serialize_specs(specs) -> str:
    """将 specs 转换为 JSON 字符串"""
    if specs is None:
        return "{}"
    if isinstance(specs, str):
        return specs
    if isinstance(specs, dict):
        return json.dumps(specs, ensure_ascii=False)
    return "{}"

def _log_price_change(session: Session, product: Hardware, old_price: float, new_price: float):
    """智能记录价格变动：2小时内的变动合并为一条记录"""
    if old_price == new_price or old_price is None:
        return
    
    product.previousPrice = old_price
    change_pct = ((new_price - old_price) / old_price * 100) if old_price > 0 else 0
    
    # 查找该商品最近的一条价格记录
    recent = session.exec(
        select(PriceHistory)
        .where(PriceHistory.hardwareId == product.id)
        .order_by(PriceHistory.changedAt.desc())  # type: ignore
        .limit(1)
    ).first()
    
    merge_window = timedelta(hours=2)
    
    if recent:
        try:
            recent_time = datetime.fromisoformat(recent.changedAt)
            now = datetime.utcnow()
            if now - recent_time < merge_window:
                # 2小时内：更新现有记录，保留原始 oldPrice
                recent.newPrice = new_price
                recent.changeAmount = round(new_price - recent.oldPrice, 2)
                recent.changePercent = round(
                    ((new_price - recent.oldPrice) / recent.oldPrice * 100) if recent.oldPrice > 0 else 0, 2
                )
                recent.changedAt = now.isoformat()
                session.add(recent)
                return
        except (ValueError, TypeError):
            pass  # 解析失败则创建新记录
    
    # 超过2小时或无历史记录：创建新记录
    ph = PriceHistory(
        hardwareId=product.id,
        hardwareName=f"{product.brand} {product.model}",
        category=product.category,
        oldPrice=old_price,
        newPrice=new_price,
        changeAmount=round(new_price - old_price, 2),
        changePercent=round(change_pct, 2)
    )
    session.add(ph)

@router.post("/")
@router.post("")
async def create_product(
    product_data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    product_id = product_data.get("id") or str(uuid.uuid4())
    specs_value = _serialize_specs(product_data.get("specs"))

    existing = session.get(Hardware, product_id)
    if existing:
        old_price = existing.price
        for key, value in product_data.items():
            if key == "specs":
                value = _serialize_specs(value)
            if hasattr(existing, key):
                setattr(existing, key, value)
        new_price = existing.price
        # 智能记录价格变动（2小时合并）
        _log_price_change(session, existing, old_price, new_price)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    new_product = Hardware(
        id=product_id,
        category=product_data.get("category"),
        brand=product_data.get("brand"),
        model=product_data.get("model"),
        price=product_data.get("price"),
        status=product_data.get("status", "active"),
        sortOrder=product_data.get("sortOrder", 100),
        specs=specs_value,
        image=product_data.get("image"),
        isDiscount=product_data.get("isDiscount", False),
        isRecommended=product_data.get("isRecommended", False),
        isNew=product_data.get("isNew", False)
    )
    session.add(new_product)
    session.commit()
    session.refresh(new_product)
    return new_product

@router.put("/{product_id}")
async def update_product(
    product_id: str,
    product_data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    product = session.get(Hardware, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="产品未找到")

    old_price = product.price
    for key, value in product_data.items():
        if key == "specs":
            value = _serialize_specs(value)
        if hasattr(product, key):
            setattr(product, key, value)

    new_price = product.price
    # 智能记录价格变动（2小时合并）
    _log_price_change(session, product, old_price, new_price)

    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    product = session.get(Hardware, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="产品未找到")

    session.delete(product)
    session.commit()
    return {"message": "产品已删除"}

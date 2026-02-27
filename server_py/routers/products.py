from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Hardware, User, PriceHistory
from .auth import get_current_admin
from pydantic import BaseModel
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
    
    products = [hw.model_dump() for hw in results]
        
    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size
    }

class BatchProductsRequest(BaseModel):
    ids: List[str]

@router.post("/batch", response_model=List[dict])
async def get_products_batch(
    request: BatchProductsRequest,
    session: Session = Depends(get_session)
):
    """批量获取指定 ID 的产品详情（用于配置单展示）"""
    if not request.ids:
        return []
        
    from sqlmodel import select
    query = select(Hardware).where(Hardware.id.in_(request.ids))
    results = session.exec(query).all()
    
    products = [hw.model_dump() for hw in results]
    
    # 保持请求中的顺序
    id_map = {p["id"]: p for p in products}
    ordered_products = [id_map[pid] for pid in request.ids if pid in id_map]
    
    return ordered_products

@router.get("/admin", response_model=dict)
async def get_admin_products(
    page: int = 1,
    page_size: int = 20,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    search: Optional[str] = None,
    sort_key: Optional[str] = "sortOrder",
    sort_dir: Optional[str] = "asc",
    session: Session = Depends(get_session), 
    admin: User = Depends(get_current_admin)
):
    """Admin only: Get all products including archived ones with pagination and filtering"""
    from sqlalchemy import func, or_, asc, desc
    
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
    
    # Sort Logic
    sort_column = getattr(Hardware, sort_key) if hasattr(Hardware, sort_key) else Hardware.sortOrder
    
    # 组合排序：主排序 -> 权重排序 -> ID（确保分页稳定）
    if sort_dir == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # 始终将权重作为第二排序（除非权重本身就是主排序），ID 作为最后保底
    if sort_key != "sortOrder":
        query = query.order_by(asc(Hardware.sortOrder))
    
    query = query.order_by(Hardware.id)

    offset = (page - 1) * page_size
    results = session.exec(query.offset(offset).limit(page_size)).all()
    
    products = [hw.model_dump() for hw in results]
        
    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/counts/admin", response_model=dict)
async def get_admin_product_counts(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: Get counts of products grouped by category"""
    from sqlalchemy import func
    query = select(Hardware.category, func.count()).select_from(Hardware).group_by(Hardware.category)
    results = session.exec(query).all()
    
    counts = {category: count for category, count in results if category}
    
    # Also get total count
    total_query = select(func.count()).select_from(Hardware)
    total = session.scalar(total_query)
    counts['total'] = total or 0
    
    return counts

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

@router.get("/specs/values", response_model=List[str])
async def get_spec_values(
    category: str,
    key: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: Get all distinct values for a specific spec key in a category"""
    # SQLite doesn't have a simple way to distinct on JSON keys via SQLModel easily without raw SQL
    # Since the product count is usually small, we can fetch and process in Python
    # or use SQLAlchemy's func.json_extract if we want to be more efficient.
    from sqlalchemy import func
    
    # Using json_extract for efficiency if supported by the DB (SQLite/MariaDB/Postgres all support it)
    # Hardware.specs is a string, so we might need to cast or use specific JSON functions
    statement = select(Hardware).where(Hardware.category == category)
    products = session.exec(statement).all()
    
    values = set()
    for p in products:
        try:
            specs = json.loads(p.specs) if isinstance(p.specs, str) else (p.specs or {})
            val = specs.get(key)
            if val is not None and val != "":
                values.add(str(val))
        except:
            continue
            
    return sorted(list(values))

def _serialize_specs(specs) -> dict:
    """确保 specs 是字典（适应 JSON 字段）"""
    if specs is None:
        return {}
    if isinstance(specs, dict):
        return specs
    if isinstance(specs, str):
        try:
            return json.loads(specs)
        except Exception:
            return {}
    return {}

def _log_price_change(session: Session, product: Hardware, old_price: float, new_price: float):
    """智能记录价格变动：2小时内的变动合并为一条记录"""
    if old_price == new_price or old_price is None:
        return
        
    # 如果价格是 0（例如新建未定价、或者暂未明确售价），不进行价格变动统计
    if old_price == 0 or new_price == 0:
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

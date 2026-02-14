from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from db import get_session
from models import UsedItem, User
from .auth import get_current_user, get_current_admin
import uuid
import json
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=dict)
@router.get("", response_model=dict)
async def get_used_items(
    type: Optional[str] = None,
    category: Optional[str] = None,
    condition: Optional[str] = None,
    status: Optional[str] = "published",
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session)
):
    query = select(UsedItem)
    if status != "all":
        query = query.where(UsedItem.status == status)
    
    if type:
        query = query.where(UsedItem.type == type)
    if category:
        query = query.where(UsedItem.category == category)
    if condition:
        query = query.where(UsedItem.condition == condition)
    
    if search:
        from sqlalchemy import or_, func
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            query = query.where(or_(
                func.coalesce(UsedItem.brand, "").ilike(search_term),
                func.coalesce(UsedItem.model, "").ilike(search_term),
                func.coalesce(UsedItem.description, "").ilike(search_term)
            ))
        
    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(UsedItem)
    if status != "all":
        count_query = count_query.where(UsedItem.status == status)
        
    if type: count_query = count_query.where(UsedItem.type == type)
    if category: count_query = count_query.where(UsedItem.category == category)
    if condition: count_query = count_query.where(UsedItem.condition == condition)
    if search:
        from sqlalchemy import or_, func
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            count_query = count_query.where(or_(
                func.coalesce(UsedItem.brand, "").ilike(search_term),
                func.coalesce(UsedItem.model, "").ilike(search_term),
                func.coalesce(UsedItem.description, "").ilike(search_term)
            ))
    total = session.scalar(count_query)

    offset = (page - 1) * page_size
    items = session.exec(query.order_by(UsedItem.createdAt.desc()).offset(offset).limit(page_size)).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/admin", response_model=dict)
async def get_admin_used_items(
    page: int = 1,
    page_size: int = 20,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    from sqlalchemy import func, or_
    query = select(UsedItem)
    if category and category != 'all':
        query = query.where(UsedItem.category == category)
    if brand and brand != 'all':
        query = query.where(UsedItem.brand == brand)
    if search:
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            query = query.where(or_(
                func.coalesce(UsedItem.brand, "").ilike(search_term),
                func.coalesce(UsedItem.model, "").ilike(search_term),
                func.coalesce(UsedItem.description, "").ilike(search_term)
            ))

    count_query = select(func.count()).select_from(UsedItem)
    if category and category != 'all': count_query = count_query.where(UsedItem.category == category)
    if brand and brand != 'all': count_query = count_query.where(UsedItem.brand == brand)
    if search:
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            count_query = count_query.where(or_(
                func.coalesce(UsedItem.brand, "").ilike(search_term),
                func.coalesce(UsedItem.model, "").ilike(search_term)
            ))

    total = session.scalar(count_query)
    offset = (page - 1) * page_size
    items = session.exec(query.order_by(UsedItem.createdAt.desc()).offset(offset).limit(page_size)).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.post("/")
@router.post("")
async def create_used_item(
    item_data: dict, 
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    new_item = UsedItem(
        id=str(uuid.uuid4()),
        type=item_data.get("type", "personal"),
        sellerId=user.id,
        sellerName=user.username,
        contact=item_data.get("contact", ""),
        category=item_data.get("category"),
        brand=item_data.get("brand"),
        model=item_data.get("model"),
        price=item_data.get("price"),
        originalPrice=item_data.get("originalPrice"),
        condition=item_data.get("condition"),
        images=json.dumps(item_data.get("images", [])),
        description=item_data.get("description"),
        status=item_data.get("status", "pending") if user.role == "admin" else "pending",
        inspectionReport=json.dumps(item_data.get("inspectionReport")) if item_data.get("inspectionReport") else "null"
    )
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return new_item

@router.put("/{item_id}")
async def update_used_item(
    item_id: str,
    item_data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    item = session.get(UsedItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="商品未找到")
    
    # Check ownership or admin
    if item.sellerId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作")
    
    for key, value in item_data.items():
        if hasattr(item, key):
            if key == "images" and isinstance(value, list):
                value = json.dumps(value)
            if key == "inspectionReport" and value is not None:
                value = json.dumps(value)
            setattr(item, key, value)
            
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.delete("/{item_id}")
async def delete_used_item(
    item_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    item = session.get(UsedItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="商品未找到")
    
    if item.sellerId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作")
    
    session.delete(item)
    session.commit()
    return {"message": "商品已删除"}

@router.post("/{item_id}/mark-sold")
async def mark_sold(
    item_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    item = session.get(UsedItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="商品未找到")
    
    if item.sellerId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作")
    
    item.status = "sold"
    session.add(item)
    session.commit()
    return {"message": "已标记为已售"}

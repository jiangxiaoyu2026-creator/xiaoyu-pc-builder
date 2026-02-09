from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import UsedItem, User
from .auth import get_current_user
import uuid
import json
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[UsedItem])
async def get_used_items(session: Session = Depends(get_session)):
    return session.exec(select(UsedItem)).all()

@router.post("/")
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
        contact=item_data.get("contact"),
        category=item_data.get("category"),
        brand=item_data.get("brand"),
        model=item_data.get("model"),
        price=item_data.get("price"),
        originalPrice=item_data.get("originalPrice"),
        condition=item_data.get("condition"),
        images=json.dumps(item_data.get("images", [])),
        description=item_data.get("description"),
        status="pending"
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
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check ownership or admin
    if item.sellerId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in item_data.items():
        if hasattr(item, key):
            if key == "images" and isinstance(value, list):
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
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.sellerId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session.delete(item)
    session.commit()
    return {"message": "Item deleted"}

@router.post("/{item_id}/mark-sold")
async def mark_sold(
    item_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    item = session.get(UsedItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.sellerId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item.status = "sold"
    session.add(item)
    session.commit()
    return {"message": "Marked as sold"}

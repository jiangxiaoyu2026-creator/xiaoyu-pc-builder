from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Hardware, User
from .auth import get_current_admin
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[Hardware])
async def get_hardware(session: Session = Depends(get_session)):
    return session.exec(select(Hardware)).all()

@router.post("/")
async def create_hardware(
    hardware_data: dict, 
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    new_hw = Hardware(
        id=str(uuid.uuid4()),
        category=hardware_data.get("category"),
        brand=hardware_data.get("brand"),
        model=hardware_data.get("model"),
        price=hardware_data.get("price"),
        status=hardware_data.get("status", "active"),
        sortOrder=hardware_data.get("sortOrder", 100),
        specs=hardware_data.get("specs", "{}"),
        image=hardware_data.get("image"),
        isDiscount=hardware_data.get("isDiscount", False),
        isRecommended=hardware_data.get("isRecommended", False),
        isNew=hardware_data.get("isNew", False)
    )
    session.add(new_hw)
    session.commit()
    session.refresh(new_hw)
    return new_hw

@router.put("/{hw_id}")
async def update_hardware(
    hw_id: str,
    hardware_data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    hw = session.get(Hardware, hw_id)
    if not hw:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    for key, value in hardware_data.items():
        if hasattr(hw, key):
            setattr(hw, key, value)
            
    session.add(hw)
    session.commit()
    session.refresh(hw)
    return hw

@router.delete("/{hw_id}")
async def delete_hardware(
    hw_id: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    hw = session.get(Hardware, hw_id)
    if not hw:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    session.delete(hw)
    session.commit()
    return {"message": "Hardware deleted"}

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from db import get_session
from models import RecycleRequest, User
from .auth import get_current_user, get_current_admin
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[RecycleRequest])
@router.get("", response_model=List[RecycleRequest])
async def get_recycle_requests(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    return session.exec(select(RecycleRequest)).all()

@router.post("/")
@router.post("")
async def create_recycle_request(
    request_data: dict, 
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    new_request = RecycleRequest(
        id=str(uuid.uuid4()),
        userId=user.id,
        userName=user.username,
        description=request_data.get("description"),
        wechat=request_data.get("wechat"),
        image=request_data.get("image"),
        status="pending",
        isRead=False
    )
    session.add(new_request)
    session.commit()
    session.refresh(new_request)
    return new_request

@router.post("/{req_id}/read")
async def mark_as_read(
    req_id: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    req = session.get(RecycleRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="申请记录未找到")
    
    req.isRead = True
    session.add(req)
    session.commit()
    return {"success": True}

@router.post("/{req_id}/complete")
async def mark_as_completed(
    req_id: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    req = session.get(RecycleRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="申请记录未找到")
    
    req.status = "completed"
    session.add(req)
    session.commit()
    return {"success": True}

@router.delete("/{req_id}")
async def delete_recycle_request(
    req_id: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    req = session.get(RecycleRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="申请记录未找到")
    
    session.delete(req)
    session.commit()
    return {"success": True}

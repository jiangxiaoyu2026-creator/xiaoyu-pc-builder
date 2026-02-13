from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Setting, User
from .auth import get_current_admin
import json

router = APIRouter()

@router.get("/")
@router.get("")
async def get_all_settings(session: Session = Depends(get_session)):
    """获取所有设置，前端需要"""
    result = {}
    settings = session.exec(select(Setting)).all()
    for s in settings:
        try:
            result[s.key] = json.loads(s.value)
        except:
            result[s.key] = s.value
    return result

@router.post("/")
@router.post("")
async def save_settings(
    data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """保存多个设置"""
    for key, value in data.items():
        setting = session.get(Setting, key)
        if not setting:
            setting = Setting(key=key, value=json.dumps(value))
        else:
            setting.value = json.dumps(value)
        session.add(setting)
    session.commit()
    return {"success": True}

@router.get("/{key}")
async def get_setting(key: str, session: Session = Depends(get_session)):
    setting = session.get(Setting, key)
    if not setting:
        return {"key": key, "value": None}
    try:
        return {"key": key, "value": json.loads(setting.value)}
    except:
        return {"key": key, "value": setting.value}

@router.post("/{key}")
async def save_setting(
    key: str, 
    value: dict, 
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    setting = session.get(Setting, key)
    if not setting:
        setting = Setting(key=key, value=json.dumps(value))
    else:
        setting.value = json.dumps(value)
    
    session.add(setting)
    session.commit()
    return {"success": True}

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Setting, User
from .auth import get_current_admin
import json

router = APIRouter()

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

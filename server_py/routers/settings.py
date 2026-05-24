from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Setting, User
from .auth import get_current_admin, get_current_user_optional
import json

router = APIRouter()

SENSITIVE_SETTING_KEYS = {"sms_config", "payment_config", "aiSettings"}

def _is_admin(user: Optional[User]) -> bool:
    return user is not None and user.role == "admin"

@router.get("/")
@router.get("")
async def get_all_settings(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """获取所有设置。非管理员不返回敏感配置（短信/支付/AI密钥）。"""
    result = {}
    settings = session.exec(select(Setting)).all()
    for s in settings:
        try:
            result[s.key] = json.loads(s.value)
        except:
            result[s.key] = s.value
    if not _is_admin(current_user):
        result = {k: v for k, v in result.items() if k not in SENSITIVE_SETTING_KEYS}
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
async def get_setting(
    key: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    if key in SENSITIVE_SETTING_KEYS and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="权限不足")
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

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Setting, User
from .auth import get_current_admin
import json
import os

router = APIRouter()

@router.get("/settings")
async def get_sms_settings(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    setting = session.get(Setting, "sms_config")
    if not setting:
        return {
            "accessKeyId": "",
            "accessKeySecret": "",
            "signName": "",
            "templateCode": ""
        }
    try:
        data = json.loads(setting.value)
        # Hide secret in response if needed, but for admin it might be okay
        # For security, let's keep it consistent with the existing logic
        return data
    except:
        return {}

@router.post("/settings")
async def save_sms_settings(
    settings: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    setting = session.get(Setting, "sms_config")
    if not setting:
        setting = Setting(key="sms_config", value=json.dumps(settings))
    else:
        setting.value = json.dumps(settings)
    
    session.add(setting)
    session.commit()
    return {"success": True}

@router.post("/send-test")
async def send_test_sms(
    data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    phone = data.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")
    
    # In a real scenario, call Aliyun SMS SDK here
    print(f"Sending test SMS to {phone}")
    return {"success": True, "message": f"Mock test SMS sent to {phone}"}

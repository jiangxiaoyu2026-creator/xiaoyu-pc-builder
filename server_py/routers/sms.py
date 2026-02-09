from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Setting, User
from ..services.sms_service import SMSService
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
            "templateCode": "",
            "appCode": ""
        }
    try:
        data = json.loads(setting.value)
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

@router.post("/send-code")
async def send_code(
    data: dict,
    session: Session = Depends(get_session)
):
    mobile = data.get("mobile")
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number required")
    
    # Get SMS config for appCode
    setting = session.get(Setting, "sms_config")
    if not setting:
        raise HTTPException(status_code=500, detail="SMS service not configured")
    
    config = json.loads(setting.value)
    app_code = config.get("appCode")
    
    if not app_code:
        # Fallback to accessKeyId if appCode is not specifically set (for compatibility)
        app_code = config.get("accessKeyId")
    
    if not app_code:
        raise HTTPException(status_code=500, detail="Aliyun AppCode missing in configuration")
    
    success = await SMSService.send_verification_code(mobile, session, app_code)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send verification code. Please check your SMS configuration.")
        
    return {"success": True, "message": "Verification code sent"}

@router.post("/send-test")
async def send_test_sms(
    data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    phone = data.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")
    
    return {"success": True, "message": f"Mock test SMS sent to {phone}"}

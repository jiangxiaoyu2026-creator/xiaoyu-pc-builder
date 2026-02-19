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

@router.get("/config")
async def get_sms_config(session: Session = Depends(get_session)):
    """前端获取SMS配置状态"""
    setting = session.get(Setting, "sms_config")
    if not setting:
        return {
            "success": True,
            "config": {
                "accessKeyId": "",
                "signName": "",
                "templateCode": "",
                "isConfigured": False
            }
        }
    try:
        data = json.loads(setting.value)
        return {
            "success": True,
            "config": {
                "accessKeyId": data.get("accessKeyId", "")[:4] + "****" if data.get("accessKeyId") else "",
                "signName": data.get("signName", ""),
                "templateCode": data.get("templateCode", ""),
                "isConfigured": bool(data.get("accessKeyId") or data.get("appCode"))
            }
        }
    except:
        return {"success": False, "config": {"isConfigured": False}}

@router.post("/config")
@router.post("/config/")
async def save_sms_config(
    config: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """保存SMS配置"""
    setting = session.get(Setting, "sms_config")
    if not setting:
        setting = Setting(key="sms_config", value=json.dumps(config))
    else:
        setting.value = json.dumps(config)

    session.add(setting)
    session.commit()
    return {"success": True}

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
@router.post("/settings/")
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
@router.post("/send-code/")
async def send_code(
    data: dict,
    session: Session = Depends(get_session)
):
    mobile = data.get("mobile")
    if not mobile:
        raise HTTPException(status_code=400, detail="请输入手机号")
    
    # Get SMS config for appCode
    setting = session.get(Setting, "sms_config")
    if not setting:
        raise HTTPException(status_code=500, detail="短信服务未配置")
    
    config = json.loads(setting.value)
    app_code = config.get("appCode")
    
    if not app_code:
        # Fallback to accessKeyId if appCode is not specifically set (for compatibility)
        app_code = config.get("accessKeyId")
    
    if not app_code:
        raise HTTPException(status_code=500, detail="配置中缺少阿里云 AppCode")
    
    success = await SMSService.send_verification_code(mobile, session, app_code)
    if not success:
        raise HTTPException(status_code=500, detail="验证码发送失败，请检查短信服务配置。")
        
    return {"success": True, "message": "验证码已发送"}

@router.post("/send-test")
@router.post("/send-test/")
async def send_test_sms(
    data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    phone = data.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="请输入手机号")
    
    return {"success": True, "message": f"Mock test SMS sent to {phone}"}

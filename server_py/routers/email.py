from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlmodel import Session
from db import get_session
from services.email_service import EmailService
from models import EmailSettings, User
from .auth import get_current_admin

router = APIRouter()

@router.post("/send-code")
@router.post("/send-code/")
async def send_code(data: dict, session: Session = Depends(get_session)):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="请输入邮箱地址")
    
    # Simple email format check
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="邮箱格式不正确")
    
    # Try sending
    success = await EmailService.send_verification_code(email, session)
    if not success:
        # Check if it's because of missing config
        settings = session.get(EmailSettings, 1)
        if not settings or not settings.smtpUser:
             raise HTTPException(status_code=500, detail="邮件服务未配置，请联系管理员。")
        raise HTTPException(status_code=500, detail="邮件验证码发送失败")
        
    return {"success": True, "message": "验证码已发送至您的邮箱"}

@router.get("/config")
async def get_email_config(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Get Email Configuration (Admin only)"""
    settings = session.get(EmailSettings, 1)
    if not settings:
        return {
            "smtpServer": "smtp.qq.com",
            "smtpPort": 465,
            "smtpUser": "",
            "senderName": "小鱼装机平台",
            "useSSL": True,
            "isConfigured": False
        }
    
    return {
        "smtpServer": settings.smtpServer,
        "smtpPort": settings.smtpPort,
        "smtpUser": settings.smtpUser,
        "senderName": settings.senderName,
        "useSSL": settings.useSSL,
        "isConfigured": bool(settings.smtpUser and settings.smtpPassword)
    }

@router.post("/config")
async def save_email_config(
    config: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Save Email Configuration"""
    settings = session.get(EmailSettings, 1)
    if not settings:
        settings = EmailSettings(id=1)
    
    if "smtpServer" in config: settings.smtpServer = config["smtpServer"]
    if "smtpPort" in config: settings.smtpPort = config["smtpPort"]
    if "smtpUser" in config: settings.smtpUser = config["smtpUser"]
    if "smtpPassword" in config and config["smtpPassword"]: # Only update if provided
        settings.smtpPassword = config["smtpPassword"]
    if "senderName" in config: settings.senderName = config["senderName"]
    if "useSSL" in config: settings.useSSL = config["useSSL"]
    
    session.add(settings)
    session.commit()
    return {"success": True, "message": "邮件设置已保存"}

# --- Verification Management ---

@router.get("/verifications", response_model=dict)
async def get_email_verifications(
    page: int = 1,
    page_size: int = 20,
    email: Optional[str] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: List email verifications with pagination and search"""
    from sqlmodel import select
    from sqlalchemy import func
    from ..models import EmailVerification
    
    query = select(EmailVerification)
    if email:
        query = query.where(EmailVerification.email.ilike(f"%{email}%"))
        
    # Count
    count_query = select(func.count()).select_from(EmailVerification)
    if email:
        count_query = count_query.where(EmailVerification.email.ilike(f"%{email}%"))
    total = session.scalar(count_query)
    
    # Exec
    offset = (page - 1) * page_size
    results = session.exec(query.order_by(EmailVerification.createdAt.desc()).offset(offset).limit(page_size)).all()
    
    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.delete("/verifications/{verify_id}")
async def delete_email_verification(
    verify_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: Delete an email verification record"""
    from ..models import EmailVerification
    item = session.get(EmailVerification, verify_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录未找到")
        
    session.delete(item)
    session.commit()
    return {"success": True, "message": "记录已删除"}

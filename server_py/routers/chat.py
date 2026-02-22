from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import List, Optional
from ..db import get_session
from ..models import ChatSession, ChatMessage, ChatSettings, User
from .auth import get_current_user_optional, get_current_admin
import uuid
import json
from datetime import datetime

router = APIRouter()

# --- Chat Configurations ---

@router.get("/configurations")
async def get_chat_settings_api(session: Session = Depends(get_session)):
    try:
        settings = session.get(ChatSettings, 1)
        if not settings:
            settings = ChatSettings(id=1)
            session.add(settings)
            session.commit()
            session.refresh(settings)
        
        # Parse JSON fields
        quick_replies = []
        try:
            if settings.quickReplies:
                quick_replies = json.loads(settings.quickReplies)
        except:
            pass
            
        return {
            "welcomeMessage": settings.welcomeMessage,
            "quickReplies": quick_replies,
            "workingHours": settings.workingHours,
            "autoReply": settings.autoReply,
            "enabled": settings.enabled
        }
    except Exception as e:
        print(f"Error getting chat settings: {e}")
        return {
            "welcomeMessage": "你好！",
            "quickReplies": [],
            "workingHours": "9:00 - 18:00",
            "autoReply": "",
            "enabled": True
        }

@router.post("/configurations")
async def save_chat_settings_api(
    payload: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    settings = session.get(ChatSettings, 1)
    if not settings:
        settings = ChatSettings(id=1)
    
    if "welcomeMessage" in payload: settings.welcomeMessage = payload["welcomeMessage"]
    if "quickReplies" in payload: settings.quickReplies = json.dumps(payload["quickReplies"])
    if "workingHours" in payload: settings.workingHours = payload["workingHours"]
    if "autoReply" in payload: settings.autoReply = payload["autoReply"]
    if "enabled" in payload: settings.enabled = payload["enabled"]
    
    session.add(settings)
    session.commit()
    return {"success": True}

# --- Chat Sessions (Admin) ---

@router.get("/admin/sessions")
async def get_admin_sessions(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    # Sort by last message time desc
    try:
        statement = select(ChatSession).order_by(ChatSession.lastMessageTime.desc())
        results = session.exec(statement).all()
        return results
    except Exception as e:
        print(f"Error fetching sessions: {e}")
        return []

@router.post("/admin/sessions/{session_id}/read")
async def mark_session_read(
    session_id: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    chat_session = session.get(ChatSession, session_id)
    if chat_session:
        chat_session.unreadCount = 0
        session.add(chat_session)
        session.commit()
    return {"success": True}

# --- Client Chat ---

@router.post("/session/init")
async def init_session(
    payload: dict,
    session: Session = Depends(get_session),
    user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Client initializes a session.
    Payload: { userParserId: string } (required if not logged in)
    """
    user_id = user.id if user else None
    parser_id = payload.get("userParserId")
    
    # Try to find existing active session
    # Priority: userId -> parserId
    
    chat_session = None
    
    if user_id:
        # Find active session for user
        stmt = select(ChatSession).where(ChatSession.userId == user_id).where(ChatSession.status == "active").order_by(ChatSession.updatedAt.desc())
        chat_session = session.exec(stmt).first()
    elif parser_id:
        # Find active session for parser
        stmt = select(ChatSession).where(ChatSession.userParserId == parser_id).where(ChatSession.status == "active").order_by(ChatSession.updatedAt.desc())
        chat_session = session.exec(stmt).first()
        
    if not chat_session:
        # Create new session
        new_id = str(uuid.uuid4())
        username = user.username if user else f"访客 {parser_id[-4:] if parser_id and len(parser_id) > 4 else 'Guest'}"
        
        chat_session = ChatSession(
            id=new_id,
            userId=user_id,
            userParserId=parser_id if not user_id else None,
            userName=username,
            userAvatar=None, # In real app, get from user profile
            status="active",
            lastMessageTime=datetime.utcnow().isoformat(),
            updatedAt=datetime.utcnow().isoformat()
        )
        session.add(chat_session)
        session.commit()
        session.refresh(chat_session)
        
        # Send initial welcome message if exists
        settings = session.get(ChatSettings, 1)
        if settings and settings.welcomeMessage:
            welcome_msg = ChatMessage(
                sessionId=new_id,
                sender="system",
                content=settings.welcomeMessage,
                type="text",
                isRead=False,
                createdAt=datetime.utcnow().isoformat()
            )
            session.add(welcome_msg)
            session.commit()
        
    return chat_session

@router.get("/messages")
async def get_messages(
    sessionId: str = Query(..., alias="sessionId"),
    limit: int = 50,
    session: Session = Depends(get_session)
):
    try:
        statement = select(ChatMessage).where(ChatMessage.sessionId == sessionId).order_by(ChatMessage.createdAt.asc())
        messages = session.exec(statement).all()
        return messages
    except Exception as e:
        print(f"Error getting messages: {e}")
        return []

@router.post("/messages")
async def send_message(
    payload: dict,
    session: Session = Depends(get_session),
    user: Optional[User] = Depends(get_current_user_optional)
):
    session_id = payload.get("sessionId")
    content = payload.get("content")
    msg_type = payload.get("type", "text")
    sender = payload.get("sender", "user") # 'user' or 'admin'
    
    if not session_id or not content:
        raise HTTPException(status_code=400, detail="Missing fields")
        
    chat_session = session.get(ChatSession, session_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Create message
    msg = ChatMessage(
        sessionId=session_id,
        sender=sender,
        content=content,
        type=msg_type,
        isRead=False,
        createdAt=datetime.utcnow().isoformat()
    )
    session.add(msg)
    
    # Update session
    chat_session.lastMessage = content if msg_type == 'text' else f"[{msg_type}]"
    chat_session.lastMessageTime = datetime.utcnow().isoformat()
    chat_session.updatedAt = datetime.utcnow().isoformat()
    
    if sender == 'user':
        chat_session.unreadCount += 1
    
    session.add(chat_session)
    session.commit()
    session.refresh(msg)
    
    # Check if this is the first message from the user to trigger auto-reply
    # Auto-reply triggers when:
    # 1. Sender is 'user'
    # 2. Chat settings have auto-reply enabled
    # 3. Admin hasn't sent a message in the last 5 minutes (meaning they're away)
    auto_reply_msg = None
    if sender == 'user':
        settings = session.get(ChatSettings, 1)
        if settings and settings.enabled and settings.autoReply:
            from datetime import timedelta
            five_min_ago = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
            
            # Check if admin has sent any messages recently
            recent_admin_msg = session.exec(
                select(ChatMessage).where(
                    ChatMessage.sessionId == session_id,
                    ChatMessage.sender == 'admin',
                    ChatMessage.createdAt > five_min_ago
                ).order_by(ChatMessage.createdAt.desc())
            ).first()
            
            if not recent_admin_msg:
                # Also avoid spamming: don't auto-reply if last message was already an auto-reply
                last_msg_in_session = session.exec(
                    select(ChatMessage).where(
                        ChatMessage.sessionId == session_id,
                        ChatMessage.sender.in_(['admin', 'system'])
                    ).order_by(ChatMessage.createdAt.desc())
                ).first()
                
                should_auto_reply = True
                if last_msg_in_session and last_msg_in_session.content == settings.autoReply:
                    # Check if this auto-reply was recent (within 2 minutes) - avoid spamming
                    try:
                        last_auto_time = datetime.fromisoformat(last_msg_in_session.createdAt)
                        if datetime.utcnow() - last_auto_time < timedelta(minutes=2):
                            should_auto_reply = False
                    except:
                        pass
                
                if should_auto_reply:
                    # Use a slight timestamp offset so it appears after the user's message
                    auto_reply_time = datetime.utcnow() + timedelta(seconds=1)
                    auto_reply_msg = ChatMessage(
                        sessionId=session_id,
                        sender="admin",
                        content=settings.autoReply,
                        type="text",
                        isRead=False,
                        createdAt=auto_reply_time.isoformat()
                    )
                    session.add(auto_reply_msg)
                    
                    chat_session.lastMessage = settings.autoReply
                    chat_session.lastMessageTime = auto_reply_time.isoformat()
                    chat_session.updatedAt = auto_reply_time.isoformat()
                    session.add(chat_session)
                    session.commit()
                    session.refresh(auto_reply_msg)
            
    return {"message": msg, "autoReply": auto_reply_msg}


from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import List, Optional
from fastapi.security import OAuth2PasswordBearer
from fastapi import Request
from pydantic import BaseModel
from ..db import get_session
from ..models import User
from ..utils.auth import get_password_hash, verify_password, create_access_token, decode_access_token
from ..services.sms_service import SMSService
from ..services.email_service import EmailService
import uuid
from datetime import datetime

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

class LoginRequest(BaseModel):
    username: str
    password: str

async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="凭证校验失败",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if payload is None:
            return None
        username: str = payload.get("sub")
        if username is None:
            return None
        
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        return user
    except:
        return None

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足"
        )
    return current_user

@router.post("/register")
async def register(user_data: dict, session: Session = Depends(get_session)):
    username = user_data.get("username")
    password = user_data.get("password")
    invite_code = user_data.get("inviteCode")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="用户名和密码均为必填项")
    
    if not invite_code:
        raise HTTPException(status_code=400, detail="请输入邀请码")
        
    # Validate Invitation Code
    from ..models import InvitationCode
    code_record = session.get(InvitationCode, invite_code)
    
    if not code_record:
        raise HTTPException(status_code=400, detail="邀请码无效")
        
    if code_record.status != "active":
        raise HTTPException(status_code=400, detail="邀请码已禁用")
        
    if code_record.usedCount >= code_record.maxUses:
        raise HTTPException(status_code=400, detail="邀请码使用次数已达上限")
    
    # Check if user exists
    existing_user = session.exec(select(User).where(User.username == username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="该用户名已被注册")
    
    # Create new user
    import random, string
    new_user_invite_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    new_user = User(
        id=str(uuid.uuid4()),
        username=username,
        password=get_password_hash(password),
        role="user",
        status="active",
        invitedBy=code_record.creatorId,
        inviteCode=new_user_invite_code
    )
    session.add(new_user)
    
    # Assign a new invitation code to the new user
    new_code_record = InvitationCode(
        code=new_user_invite_code,
        creatorId=new_user.id,
        maxUses=3
    )
    session.add(new_code_record)
    
    # Update used count of the invitation code
    code_record.usedCount += 1
    session.add(code_record)
    
    # Update inviter stats (optional, if creatorId is a user)
    inviter = session.get(User, code_record.creatorId)
    if inviter:
        inviter.inviteCount += 1
        session.add(inviter)
    
    session.commit()
    session.refresh(new_user)
    
    return {"message": "用户创建成功", "userId": new_user.id}

@router.post("/register-sms")
@router.post("/register-sms/")
async def register_sms(data: dict, session: Session = Depends(get_session)):
    mobile = data.get("mobile")
    code = data.get("code")
    username = data.get("username")
    password = data.get("password")
    
    if not all([mobile, code, username, password]):
        raise HTTPException(status_code=400, detail="缺失必填字段")
    
    # Verify SMS
    if not SMSService.verify_code(mobile, code, session):
        raise HTTPException(status_code=400, detail="验证码无效或已过期")
    
    # Check if mobile already exists
    if session.exec(select(User).where(User.mobile == mobile)).first():
        raise HTTPException(status_code=400, detail="该手机号已被注册")
    
    # Check if username exists
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # Create user
    new_user = User(
        id=str(uuid.uuid4()),
        username=username,
        mobile=mobile,
        password=get_password_hash(password),
        role="user",
        status="active"
    )
    session.add(new_user)
    session.commit()
    return {"message": "用户注册成功", "userId": new_user.id}

@router.post("/register-email")
@router.post("/register-email/")
async def register_email(data: dict, session: Session = Depends(get_session)):
    email = data.get("email")
    code = data.get("code")
    username = data.get("username")
    password = data.get("password")
    
    if not all([email, code, username, password]):
        raise HTTPException(status_code=400, detail="缺失必填字段")
    
    # Verify Email Code
    if not EmailService.verify_code(email, code, session):
        raise HTTPException(status_code=400, detail="验证码无效或已过期")
    
    # Check if email already exists
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=400, detail="该邮箱已被注册")
    
    # Check if username exists
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # Create user
    new_user = User(
        id=str(uuid.uuid4()),
        username=username,
        email=email,
        password=get_password_hash(password),
        role="user",
        status="active"
    )
    session.add(new_user)
    session.commit()
    return {"message": "用户注册成功", "userId": new_user.id}

@router.post("/login")
async def login(
    login_data: LoginRequest,
    session: Session = Depends(get_session)
):
    import logging
    logger = logging.getLogger(__name__)

    # Determine which data source to use
    username = login_data.username
    password = login_data.password

    if not username or not password:
         raise HTTPException(status_code=400, detail="Missing username or password")

    logger.info(f"Login attempt - Username: {username}")


    logger.info(f"Login attempt - Username: {username}")


    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()

    if not user:
        logger.warning(f"User not found: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"User found - Username: {user.username}, Role: {user.role}")
    logger.info(f"Stored password hash: {user.password}")

    password_valid = verify_password(password, user.password)
    logger.info(f"Password verification result: {password_valid}")

    if not password_valid:
        logger.warning(f"Password verification failed for user: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.lastLogin = datetime.utcnow().isoformat()
    session.add(user)
    session.commit()
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,

            "inviteCode": user.inviteCode,
            "vipExpireAt": user.vipExpireAt,
            "inviteCount": user.inviteCount,
            "inviteVipDays": user.inviteVipDays
        }
    }

@router.post("/login-sms")
async def login_sms(data: dict, session: Session = Depends(get_session)):
    mobile = data.get("mobile")
    code = data.get("code")
    
    if not mobile or not code:
        raise HTTPException(status_code=400, detail="手机号和验证码均为必填项")
        
    # Verify SMS
    if not SMSService.verify_code(mobile, code, session):
        raise HTTPException(status_code=400, detail="验证码无效或已过期")
        
    # Find user by mobile
    user = session.exec(select(User).where(User.mobile == mobile)).first()
    if not user:
        raise HTTPException(status_code=404, detail="未找到该手机号对应的账号，请先注册")
        
    # Update last login
    user.lastLogin = datetime.utcnow().isoformat()
    session.add(user)
    session.commit()
    
    # Generate access token
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "mobile": user.mobile,

            "inviteCode": user.inviteCode,
            "vipExpireAt": user.vipExpireAt,
            "inviteCount": user.inviteCount,
            "inviteVipDays": user.inviteVipDays
        }
    }

@router.post("/login-email")
@router.post("/login-email/")
async def login_email(data: dict, session: Session = Depends(get_session)):
    email = data.get("email")
    code = data.get("code")
    
    if not email or not code:
        raise HTTPException(status_code=400, detail="邮箱和验证码均为必填项")
        
    # Verify Email Code
    if not EmailService.verify_code(email, code, session):
        raise HTTPException(status_code=400, detail="验证码无效或已过期")
        
    # Find user by email
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="未找到该邮箱对应的账号，请先注册")
        
    # Update last login
    user.lastLogin = datetime.utcnow().isoformat()
    session.add(user)
    session.commit()
    
    # Generate access token
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "email": user.email,
            "inviteCode": user.inviteCode,
            "vipExpireAt": user.vipExpireAt,
            "inviteCount": user.inviteCount,
            "inviteVipDays": user.inviteVipDays
        }
    }

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[User])
async def get_users(session: Session = Depends(get_session), admin: User = Depends(get_current_admin)):
    return session.exec(select(User)).all()

@router.post("/users", response_model=User)
@router.post("/users/", response_model=User)
async def create_user(
    user_data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """管理员创建用户"""
    username = user_data.get("username")
    password = user_data.get("password")
    role = user_data.get("role", "user")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="用户名和密码均为必填项")
    
    # Check if user exists
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    new_user = User(
        id=str(uuid.uuid4()),
        username=username,
        password=get_password_hash(password),
        role=role,
        status="active"
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@router.post("/user")
@router.post("/user/")
async def update_user(
    user_data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """更新用户信息"""
    user_id = user_data.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="用户 ID 缺失")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="未找到该用户")

    for key, value in user_data.items():
        if key == "password" and value:
            value = get_password_hash(value)
        if hasattr(user, key) and key != "id":
            setattr(user, key, value)

    session.add(user)
    session.commit()
    session.refresh(user)
    return user

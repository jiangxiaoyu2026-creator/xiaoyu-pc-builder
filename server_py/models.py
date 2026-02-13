from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, create_engine, Session, select
import json

# --- Models ---

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(primary_key=True)
    username: str = Field(unique=True, index=True)
    mobile: Optional[str] = Field(default=None, unique=True, index=True)
    email: Optional[str] = Field(default=None, unique=True, index=True) # Added email field
    password: str
    role: str = Field(default="user")
    status: str = Field(default="active")
    lastLogin: Optional[str] = None
    vipExpireAt: Optional[int] = None
    inviteCode: Optional[str] = None
    invitedBy: Optional[str] = None
    inviteCount: int = Field(default=0)
    inviteVipDays: int = Field(default=0)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Hardware(SQLModel, table=True):
    __tablename__ = "hardware"
    id: str = Field(primary_key=True)
    category: str
    brand: str
    model: str
    price: float
    previousPrice: Optional[float] = None
    status: str = Field(default="active")
    sortOrder: int = Field(default=100)
    specs: str = Field(default="{}")  # Store as JSON string
    image: Optional[str] = None # Matches frontend 'image'
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    isDiscount: bool = Field(default=False)
    isRecommended: bool = Field(default=False)
    isNew: bool = Field(default=False)

class PriceHistory(SQLModel, table=True):
    __tablename__ = "price_history"
    id: Optional[int] = Field(default=None, primary_key=True)
    hardwareId: str = Field(index=True)
    hardwareName: str  # brand + model for easy display
    category: str
    oldPrice: float
    newPrice: float
    changeAmount: float  # newPrice - oldPrice
    changePercent: float  # (newPrice - oldPrice) / oldPrice * 100
    changedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Config(SQLModel, table=True):
    __tablename__ = "configs"
    id: str = Field(primary_key=True)
    userId: Optional[str] = None
    userName: Optional[str] = None
    serialNumber: str = Field(unique=True, index=True)
    cpuId: Optional[str] = None
    gpuId: Optional[str] = None
    mbId: Optional[str] = None
    ramId: Optional[str] = None
    diskId: Optional[str] = None
    psuId: Optional[str] = None
    caseId: Optional[str] = None
    coolId: Optional[str] = None
    monId: Optional[str] = None
    totalPrice: float
    status: str = Field(default="draft")
    evaluation: str = Field(default="{}")  # Store as JSON string
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    title: Optional[str] = None
    description: Optional[str] = None
    items: str = Field(default="{}") # Added to store hardware IDs as JSON
    tags: str = Field(default="[]") # Added to store tags as JSON
    isRecommended: bool = Field(default=False)
    views: int = Field(default=0)
    likes: int = Field(default=0)

class UsedItem(SQLModel, table=True):
    __tablename__ = "used_items"
    id: str = Field(primary_key=True)
    type: str = Field(default="personal")  # 'personal' or 'official'
    sellerId: str
    sellerName: str
    contact: Optional[str] = None
    category: str
    brand: str
    model: str
    price: float
    originalPrice: Optional[float] = None
    condition: str
    images: str = Field(default="[]")  # Store as JSON string (List[str])
    description: str
    status: str = Field(default="pending")
    inspectionReport: Optional[str] = Field(default="null")  # Store as JSON string
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    soldAt: Optional[int] = None

class Setting(SQLModel, table=True):
    __tablename__ = "settings"
    key: str = Field(primary_key=True)
    value: str  # JSON string

class RecycleRequest(SQLModel, table=True):
    __tablename__ = "recycle_requests"
    id: str = Field(primary_key=True)
    userId: Optional[str] = None
    userName: Optional[str] = None
    description: str
    wechat: str
    image: Optional[str] = None
    status: str = Field(default="pending")
    isRead: bool = Field(default=False)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Order(SQLModel, table=True):
    __tablename__ = "orders"
    id: str = Field(primary_key=True)
    userId: str
    planId: str
    amount: int  # in cents
    status: str = Field(default="pending") # 'pending', 'paid', 'failed'
    payMethod: str # 'wechat', 'alipay'
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    paidAt: Optional[str] = None

class DailyStat(SQLModel, table=True):
    __tablename__ = "daily_stats"
    date: str = Field(primary_key=True)  # YYYY-MM-DD
    aiGenerations: int = Field(default=0)
    newConfigs: int = Field(default=0)
    newUsers: int = Field(default=0)

class SMSVerification(SQLModel, table=True):
    __tablename__ = "sms_verifications"
    id: Optional[int] = Field(default=None, primary_key=True)
    mobile: str = Field(index=True)
    code: str
    expiresAt: datetime
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class EmailVerification(SQLModel, table=True):
    __tablename__ = "email_verifications"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    code: str
    expiresAt: datetime
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class EmailSettings(SQLModel, table=True):
    __tablename__ = "email_settings"
    id: Optional[int] = Field(default=1, primary_key=True)
    smtpServer: str = Field(default="smtp.qq.com")
    smtpPort: int = Field(default=465)
    smtpUser: str = ""
    smtpPassword: str = ""
    senderName: str = Field(default="小鱼装机平台")
    useSSL: bool = Field(default=True)

class InvitationCode(SQLModel, table=True):
    __tablename__ = "invitation_codes"
    code: str = Field(primary_key=True)
    creatorId: str = Field(index=True) # Admin ID or User ID (if user generated)
    maxUses: int = Field(default=3)
    usedCount: int = Field(default=0)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    status: str = Field(default="active") # active, disabled

class ChatSettings(SQLModel, table=True):
    __tablename__ = "chat_settings"
    id: int = Field(default=1, primary_key=True)
    welcomeMessage: str = Field(default="您好！有什么可以帮您？")
    quickReplies: str = Field(default="[]") # JSON list of strings
    workingHours: str = Field(default="9:00 - 18:00")
    autoReply: str = Field(default="当前非工作时间，我们会尽快回复您。")
    enabled: bool = Field(default=True)

class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_sessions"
    id: str = Field(primary_key=True)
    userId: Optional[str] = Field(default=None, index=True)
    userParserId: Optional[str] = Field(default=None, index=True) # For guest tracking
    userName: str
    userAvatar: Optional[str] = None
    lastMessage: Optional[str] = None
    lastMessageTime: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    unreadCount: int = Field(default=0) # Admin unread count
    status: str = Field(default="active") # active, closed
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"
    id: Optional[int] = Field(default=None, primary_key=True)
    sessionId: str = Field(index=True)
    sender: str # 'user', 'admin', 'system'
    content: str
    type: str = Field(default="text") # 'text', 'image', 'product', 'order'
    isRead: bool = Field(default=False)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Article(SQLModel, table=True):
    __tablename__ = "articles"
    id: Optional[str] = Field(default=None, primary_key=True)
    title: str
    summary: str
    content: str  # Markdown/HTML
    coverImage: Optional[str] = None
    isPinned: bool = Field(default=False)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


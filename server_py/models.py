from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, create_engine, Session, select
import json

# --- Models ---

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(primary_key=True)
    username: str = Field(unique=True, index=True)
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
    status: str = Field(default="active")
    sortOrder: int = Field(default=100)
    specs: str = Field(default="{}")  # Store as JSON string
    image: Optional[str] = None # Matches frontend 'image'
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    isDiscount: bool = Field(default=False)
    isRecommended: bool = Field(default=False)
    isNew: bool = Field(default=False)

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
    contact: str
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

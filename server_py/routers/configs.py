from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Config, User
from .auth import get_current_user, get_current_user_optional, get_current_admin
import uuid
import json
from datetime import datetime

router = APIRouter()

def _parse_config(config: Config, current_user: Optional[User] = None) -> dict:
    c_dict = config.model_dump()
    for field in ["tags", "items", "evaluation", "showcaseImages"]:
        if isinstance(c_dict.get(field), str):
            try:
                c_dict[field] = json.loads(c_dict[field])
            except:
                c_dict[field] = [] if field in ["tags", "showcaseImages"] else {}
                
    # Filter showcase if not approved and not owner/admin
    is_owner = current_user and current_user.id == config.userId
    is_admin = current_user and current_user.role == "admin"
    if c_dict.get("showcaseStatus") not in ["approved", "none"] and not is_owner and not is_admin:
        c_dict["showcaseImages"] = []
        c_dict["showcaseMessage"] = None
        
    return c_dict

@router.get("/", response_model=dict)
@router.get("", response_model=dict)
async def get_configs(
    cpu_id: Optional[str] = None,
    gpu_id: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = "published", # Default to published for client
    sort_by: str = "recommend", # recommend, hot, new
    is_recommended: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = select(Config)
    if status != "all":
        query = query.where(Config.status == status)
    
    if cpu_id: query = query.where(Config.cpuId == cpu_id)
    if gpu_id: query = query.where(Config.gpuId == gpu_id)
    if min_price is not None: query = query.where(Config.totalPrice >= min_price)
    if max_price is not None: query = query.where(Config.totalPrice <= max_price)
    if is_recommended is not None: query = query.where(Config.isRecommended == is_recommended)
    if tag:
        if tag == "showcase":
            query = query.where(Config.showcaseStatus == "approved")
        else:
            escaped_tag = json.dumps(tag, ensure_ascii=True).strip('"')
            query = query.where(
                (Config.tags.like(f'%"{tag}"%')) | 
                (Config.tags.like(f'%"{escaped_tag}"%'))
            )
    if search:
        query = query.where(
            (Config.title.like(f"%{search}%")) | 
            (Config.userName.like(f"%{search}%"))
        )

    # Sorting
    if sort_by == "new":
        query = query.order_by(Config.createdAt.desc())
    elif sort_by == "hot":
        # Hot = likes*2 + views
        query = query.order_by((Config.likes * 2 + Config.views).desc())
    else: # recommend
        # Recommended first, then by date, with sortOrder taking highest precedence
        query = query.order_by(Config.sortOrder.desc(), Config.isRecommended.desc(), Config.createdAt.desc())

    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(Config)
    if status != "all":
        count_query = count_query.where(Config.status == status)
    
    if cpu_id: count_query = count_query.where(Config.cpuId == cpu_id)
    if gpu_id: count_query = count_query.where(Config.gpuId == gpu_id)
    if min_price is not None: count_query = count_query.where(Config.totalPrice >= min_price)
    if max_price is not None: count_query = count_query.where(Config.totalPrice <= max_price)
    if is_recommended is not None: count_query = count_query.where(Config.isRecommended == is_recommended)
    if tag: 
        if tag == "showcase":
            count_query = count_query.where(Config.showcaseStatus == "approved")
        else:
            escaped_tag = json.dumps(tag, ensure_ascii=True).strip('"')
            count_query = count_query.where(
                (Config.tags.like(f'%"{tag}"%')) | 
                (Config.tags.like(f'%"{escaped_tag}"%'))
            )
    if search:
        count_query = count_query.where(
            (Config.title.like(f"%{search}%")) | 
            (Config.userName.like(f"%{search}%"))
        )
    total = session.scalar(count_query)

    offset = (page - 1) * page_size
    configs = session.exec(query.offset(offset).limit(page_size)).all()
    
    return {
        "items": [_parse_config(c, current_user) for c in configs],
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.post("/{config_id}/share", response_model=dict)
async def share_config(
    config_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置未找到")
    
    if config.userId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作")

    config.status = "published"
    config.updatedAt = datetime.utcnow().isoformat()
    session.add(config)
    session.commit()
    session.refresh(config)
    return _parse_config(config)

@router.get("/admin", response_model=List[dict])
async def get_admin_configs(session: Session = Depends(get_session), admin: User = Depends(get_current_admin)):
    """Admin only: Get all configs"""
    configs = session.exec(select(Config).order_by(Config.createdAt.desc())).all()
    return [_parse_config(c, admin) for c in configs]

@router.get("/user/{user_id}", response_model=dict)
async def get_user_configs(
    user_id: str, 
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session)
):
    """Get configs for a specific user with pagination"""
    from sqlalchemy import func
    total = session.scalar(select(func.count()).select_from(Config).where(Config.userId == user_id))
    
    offset = (page - 1) * page_size
    configs = session.exec(select(Config).where(Config.userId == user_id).order_by(Config.createdAt.desc()).offset(offset).limit(page_size)).all()
    
    return {
        "items": [_parse_config(c, current_user) for c in configs],
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.post("/")
@router.post("", response_model=dict)
async def create_config(
    config_data: dict, 
    session: Session = Depends(get_session),
    user: Optional[User] = Depends(get_current_user_optional)
):
    # Generate serial number if not provided
    serial_number = config_data.get("serial_number")
    if not serial_number:
        serial_number = f"CFG-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

    user_id = user.id if user else "guest"
    user_name = user.username if user else (config_data.get("userName") or "游客")

    new_config = Config(
        id=str(uuid.uuid4()),
        userId=user_id,
        userName=user_name,
        serialNumber=serial_number,
        cpuId=config_data.get("cpuId"),
        gpuId=config_data.get("gpuId"),
        mbId=config_data.get("mbId"),
        ramId=config_data.get("ramId"),
        diskId=config_data.get("diskId"),
        psuId=config_data.get("psuId"),
        caseId=config_data.get("caseId"),
        coolId=config_data.get("coolId"),
        monId=config_data.get("monId"),
        totalPrice=config_data.get("totalPrice"),
        title=config_data.get("title", "未命名配置"),
        description=config_data.get("description", ""),
        status=config_data.get("status", "draft"),
        evaluation=json.dumps(config_data.get("evaluation", {}), ensure_ascii=False) if isinstance(config_data.get("evaluation"), dict) else config_data.get("evaluation", "{}"),
        items=json.dumps(config_data.get("items", {}), ensure_ascii=False),
        tags=json.dumps(config_data.get("tags", []), ensure_ascii=False),
        isRecommended=config_data.get("isRecommended", False)
    )
    session.add(new_config)
    session.commit()
    session.refresh(new_config)
    return _parse_config(new_config, user)

@router.get("/{config_id}", response_model=dict)
async def get_config(
    config_id: str, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置未找到")
    return _parse_config(config, current_user)

@router.put("/{config_id}", response_model=dict)
async def update_config(
    config_id: str,
    config_data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置未找到")

    if config.userId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作")

    for key, value in config_data.items():
        if hasattr(config, key):
            if key in ["items", "tags", "evaluation"] and isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)
            setattr(config, key, value)

    config.updatedAt = datetime.utcnow().isoformat()
    session.add(config)
    session.commit()
    session.refresh(config)
    return _parse_config(config, user)

@router.delete("/{config_id}")
async def delete_config(
    config_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置未找到")

    # Check ownership or admin
    if config.userId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权删除该配置")

    session.delete(config)
    session.commit()
    return {"message": "配置已删除"}

from pydantic import BaseModel

class ShowcaseSubmitRequest(BaseModel):
    images: List[str]
    message: Optional[str] = None

@router.put("/{config_id}/showcase", response_model=dict)
async def submit_showcase(
    config_id: str,
    data: ShowcaseSubmitRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """用户提交或更新晒单"""
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置未找到")
        
    if config.userId != user.id:
        raise HTTPException(status_code=403, detail="只能为自己的配置提交晒单")

    config.showcaseImages = json.dumps(data.images, ensure_ascii=False)
    config.showcaseMessage = data.message
    config.showcaseStatus = "pending" # 重置为待审核
    config.updatedAt = datetime.utcnow().isoformat()
    
    session.add(config)
    session.commit()
    session.refresh(config)
    return _parse_config(config, user)

class ShowcaseAuditRequest(BaseModel):
    status: str # 'approved', 'rejected'

@router.put("/admin/{config_id}/showcase/audit", response_model=dict)
async def audit_showcase(
    config_id: str,
    data: ShowcaseAuditRequest,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """管理员审核晒单"""
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置未找到")
        
    if data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="无效的审核状态")

    config.showcaseStatus = data.status
    config.updatedAt = datetime.utcnow().isoformat()
    
    session.add(config)
    session.commit()
    session.refresh(config)
    return _parse_config(config, admin)


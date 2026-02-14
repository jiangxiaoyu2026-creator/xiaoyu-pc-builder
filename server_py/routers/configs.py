from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from db import get_session
from models import Config, User
from .auth import get_current_user, get_current_user_optional, get_current_admin
import uuid
import json
from datetime import datetime

router = APIRouter()

def _parse_config(config: Config) -> dict:
    c_dict = config.model_dump()
    for field in ["tags", "items", "evaluation"]:
        if isinstance(c_dict.get(field), str):
            try:
                c_dict[field] = json.loads(c_dict[field])
            except:
                c_dict[field] = [] if field == "tags" else {}
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
    session: Session = Depends(get_session)
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
        query = query.where(Config.tags.like(f'%"{tag}"%'))
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
        # Recommended first, then by date
        query = query.order_by(Config.isRecommended.desc(), Config.createdAt.desc())

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
    if tag: count_query = count_query.where(Config.tags.like(f'%"{tag}"%'))
    if search:
        count_query = count_query.where(
            (Config.title.like(f"%{search}%")) | 
            (Config.userName.like(f"%{search}%"))
        )
    total = session.scalar(count_query)

    offset = (page - 1) * page_size
    configs = session.exec(query.offset(offset).limit(page_size)).all()
    
    return {
        "items": [_parse_config(c) for c in configs],
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
    return [_parse_config(c) for c in configs]

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
        "items": [_parse_config(c) for c in configs],
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
        evaluation=config_data.get("evaluation", "{}"),
        items=json.dumps(config_data.get("items", {})),
        tags=json.dumps(config_data.get("tags", [])),
        isRecommended=config_data.get("isRecommended", False)
    )
    session.add(new_config)
    session.commit()
    session.refresh(new_config)
    return _parse_config(new_config)

@router.get("/{config_id}", response_model=dict)
async def get_config(config_id: str, session: Session = Depends(get_session)):
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置未找到")
    return _parse_config(config)

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
                value = json.dumps(value)
            setattr(config, key, value)

    config.updatedAt = datetime.utcnow().isoformat()
    session.add(config)
    session.commit()
    session.refresh(config)
    return _parse_config(config)

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

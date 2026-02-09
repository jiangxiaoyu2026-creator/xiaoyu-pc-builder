from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Config, User
from .auth import get_current_user
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[Config])
async def get_configs(session: Session = Depends(get_session)):
    return session.exec(select(Config)).all()

@router.post("/")
async def create_config(
    config_data: dict, 
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    # Generate serial number if not provided
    serial_number = config_data.get("serial_number")
    if not serial_number:
        serial_number = f"CFG-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

    new_config = Config(
        id=str(uuid.uuid4()),
        userId=user.id,
        userName=user.username,
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
        status=config_data.get("status", "draft"),
        evaluation=config_data.get("evaluation", "{}"),
        items=json.dumps(config_data.get("items", {})),
        tags=json.dumps(config_data.get("tags", [])),
        isRecommended=config_data.get("isRecommended", False)
    )
    session.add(new_config)
    session.commit()
    session.refresh(new_config)
    return new_config

@router.get("/{config_id}")
async def get_config(config_id: str, session: Session = Depends(get_session)):
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return config

@router.delete("/{config_id}")
async def delete_config(
    config_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    config = session.get(Config, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    # Check ownership or admin
    if config.userId != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this config")
    
    session.delete(config)
    session.commit()
    return {"message": "Config deleted"}

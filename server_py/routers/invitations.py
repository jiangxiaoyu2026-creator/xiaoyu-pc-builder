from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import random, string, uuid
from datetime import datetime

from ..db import get_session
from ..models import User, InvitationCode
from .auth import get_current_admin

router = APIRouter()

@router.post("/batch-generate")
async def batch_generate(
    data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: Batch generate invitation codes"""
    count = data.get("count", 1)
    max_uses = data.get("maxUses", 3)
    
    if count < 1 or count > 100:
        raise HTTPException(status_code=400, detail="生成数量必须在 1 到 100 之间")
        
    created_codes = []
    
    for _ in range(count):
        code_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        # Ensure uniqueness (simple check, could be improved)
        while session.get(InvitationCode, code_str):
             code_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
             
        new_code = InvitationCode(
            code=code_str,
            creatorId=admin.id,
            maxUses=max_uses,
            status="active"
        )
        session.add(new_code)
        created_codes.append(new_code)
        
    session.commit()
    
    return {"message": f"Generated {count} codes", "codes": [c.code for c in created_codes]}

@router.get("/list", response_model=dict)
async def list_codes(
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: List invitation codes"""
    offset = (page - 1) * page_size
    
    statement = select(InvitationCode).order_by(InvitationCode.createdAt.desc()).offset(offset).limit(page_size)
    results = session.exec(statement).all()
    
    # Get total count (simplified)
    # Note: efficient count usually leads to separate query or subquery
    total_statement = select(InvitationCode)
    total = len(session.exec(total_statement).all()) 
    
    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size
    }

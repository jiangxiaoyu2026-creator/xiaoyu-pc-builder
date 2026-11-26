import asyncio
import base64
import hashlib
import json
import os
import secrets
from typing import Optional
from weakref import WeakValueDictionary

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..db import get_session
from ..models import ConfigPoster
from ..services.poster_code import get_poster_code, get_poster_env
from .auth import _RateLimiter

router = APIRouter()
_creation_limit = _RateLimiter(max_requests=20, window_seconds=60)
_generation_locks = WeakValueDictionary()


class PosterPart(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    category: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=512)
    quantity: int = Field(ge=1, le=99)
    unitPrice: float = Field(ge=0, le=10**12)
    slotId: Optional[str] = Field(default=None, min_length=1, max_length=128)
    productId: Optional[str] = Field(default=None, min_length=1, max_length=128)
    categoryKey: Optional[str] = Field(default=None, min_length=1, max_length=64)
    customName: Optional[str] = Field(default=None, max_length=512)
    customPrice: Optional[float] = Field(default=None, ge=0, le=10**12)


class PosterSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    title: str = Field(min_length=1, max_length=128)
    parts: list[PosterPart] = Field(min_length=1, max_length=100)
    totalPrice: float = Field(ge=0, le=10**15)
    serviceFeeRate: float = Field(ge=0, le=100)
    discountName: str = Field(max_length=128)
    discountRate: Optional[float] = Field(default=None, ge=0)


def _code_response(poster: ConfigPoster):
    mime = "image/png" if poster.codeImage.startswith(b"\x89PNG") else "image/jpeg"
    encoded = base64.b64encode(poster.codeImage).decode("ascii")
    return {"scene": poster.scene, "codeImage": f"data:{mime};base64,{encoded}"}


@router.post("")
async def create_poster(data: PosterSnapshot, request: Request, session: Session = Depends(get_session)):
    snapshot = data.model_dump(exclude_none=True)
    cache_key = json.dumps([os.getenv("WECHAT_APP_ID", ""), get_poster_env(), snapshot], sort_keys=True)
    fingerprint = hashlib.sha256(cache_key.encode()).hexdigest()
    lookup = select(ConfigPoster).where(ConfigPoster.fingerprint == fingerprint)
    async with _generation_locks.setdefault(fingerprint, asyncio.Lock()):
        existing = session.exec(lookup).first()
        if existing:
            return _code_response(existing)
        session.rollback()  # Release the DB connection before calling WeChat.
        client_ip = request.client.host if request.client else "unknown"
        if not _creation_limit.check(client_ip):
            raise HTTPException(status_code=429, detail="生成海报过于频繁，请稍后再试")
        scene = secrets.token_urlsafe(18)
        image = await get_poster_code(scene)
        poster = ConfigPoster(scene=scene, fingerprint=fingerprint, snapshot=snapshot, codeImage=image)
        session.add(poster)
        try:
            session.commit()
        except IntegrityError:
            # Another worker may have completed the same poster while WeChat was responding.
            session.rollback()
            existing = session.exec(lookup).first()
            if existing is None:
                raise
            return _code_response(existing)
        return _code_response(poster)


@router.get("/{scene}", response_model=PosterSnapshot, response_model_exclude_none=True)
def get_poster(scene: str, session: Session = Depends(get_session)):
    snapshot = session.exec(select(ConfigPoster.snapshot).where(ConfigPoster.scene == scene)).first()
    if snapshot is None:
        raise HTTPException(status_code=404, detail="未找到这张配置单")
    return snapshot

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, SQLModel
from typing import List, Optional, Dict, Any
from ..db import get_session
from ..models import Article, User
from .auth import get_current_admin
from datetime import datetime
import uuid

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
def get_articles(
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session)
):
    offset = (page - 1) * page_size
    # Order by isPinned descending, then createdAt descending
    statement = select(Article).order_by(Article.isPinned.desc(), Article.createdAt.desc()).offset(offset).limit(page_size)
    results = session.exec(statement).all()
    
    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(Article)
    total = session.scalar(count_query)
    
    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/{id}", response_model=Article)
def get_article(id: str, session: Session = Depends(get_session)):
    article = session.get(Article, id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

class ArticleCreate(SQLModel):
    title: str
    summary: str
    content: str
    coverImage: Optional[str] = None
    isPinned: bool = False

class ArticleUpdate(SQLModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    coverImage: Optional[str] = None
    isPinned: Optional[bool] = None

@router.post("/", response_model=Article)
def create_article(
    article_in: ArticleCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    article = Article.model_validate(article_in)
    article.id = str(uuid.uuid4())
    article.createdAt = datetime.utcnow().isoformat()
    article.updatedAt = datetime.utcnow().isoformat()
    
    session.add(article)
    session.commit()
    session.refresh(article)
    return article

@router.put("/{id}", response_model=Article)
def update_article(
    id: str,
    article_in: ArticleUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    db_article = session.get(Article, id)
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    article_data = article_in.model_dump(exclude_unset=True)
    for key, value in article_data.items():
        setattr(db_article, key, value)
            
    db_article.updatedAt = datetime.utcnow().isoformat()
    session.add(db_article)
    session.commit()
    session.refresh(db_article)
    return db_article

@router.delete("/{id}")
def delete_article(
    id: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    article = session.get(Article, id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    session.delete(article)
    session.commit()
    return {"ok": True}

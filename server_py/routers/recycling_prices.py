from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from sqlalchemy import func, or_
from typing import Optional
from ..db import get_session
from ..models import RecyclingPrice, User
from .auth import get_current_admin
from datetime import datetime
import os

router = APIRouter()

# --- 品类映射 ---
CATEGORY_LABELS = {
    "gpu": "显卡",
    "cpu": "处理器",
    "motherboard": "主板",
    "ram": "内存",
    "disk": "硬盘",
    "psu": "电源",
    "case": "机箱",
    "monitor": "显示器",
    "cooler": "散热",
    "peripheral": "外设",
}

# ========== 公开接口（客户端估价用） ==========

@router.get("/categories")
async def get_categories(session: Session = Depends(get_session)):
    """获取所有可用品类"""
    cats = session.exec(select(RecyclingPrice.category).distinct()).all()
    return [{"code": c, "label": CATEGORY_LABELS.get(c, c)} for c in sorted(cats) if c]

@router.get("/estimate")
async def estimate_price(
    category: Optional[str] = None,
    keyword: str = "",
    session: Session = Depends(get_session)
):
    """客户端自助估价：根据品类+关键词模糊搜索，只返回回收价"""
    if not keyword.strip():
        return {"items": [], "total": 0}
    
    query = select(RecyclingPrice)
    if category and category != "all":
        query = query.where(RecyclingPrice.category == category)
    
    # 多词搜索
    keywords = keyword.strip().split()
    for kw in keywords:
        query = query.where(RecyclingPrice.model.ilike(f"%{kw}%"))
    
    # 优先显示有效期活跃的
    query = query.order_by(
        RecyclingPrice.validity.desc(),  # active first
        RecyclingPrice.recyclePrice.desc()
    ).limit(20)
    
    items = session.exec(query).all()
    
    # 返回字段扩展包含闲鱼价，前端供主播/管理员查看
    return {
        "items": [{
            "id": item.id,
            "category": item.category,
            "categoryLabel": CATEGORY_LABELS.get(item.category, item.category),
            "model": item.model,
            "recyclePrice": item.recyclePrice,
            "resalePrice": item.resalePrice,
            "validity": item.validity,
        } for item in items],
        "total": len(items)
    }

# ========== 管理接口（后台管理用） ==========

@router.get("/admin")
async def get_admin_recycling_prices(
    page: int = 1,
    page_size: int = 50,
    category: Optional[str] = None,
    validity: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """后台管理：分页列表 + 品类筛选 + 搜索"""
    query = select(RecyclingPrice)
    count_query = select(func.count()).select_from(RecyclingPrice)
    
    if category and category != "all":
        query = query.where(RecyclingPrice.category == category)
        count_query = count_query.where(RecyclingPrice.category == category)
    
    if validity and validity != "all":
        query = query.where(RecyclingPrice.validity == validity)
        count_query = count_query.where(RecyclingPrice.validity == validity)
    
    if search:
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            query = query.where(RecyclingPrice.model.ilike(search_term))
            count_query = count_query.where(RecyclingPrice.model.ilike(search_term))
    
    total = session.scalar(count_query) or 0
    
    offset = (page - 1) * page_size
    items = session.exec(
        query.order_by(RecyclingPrice.category, RecyclingPrice.model)
        .offset(offset).limit(page_size)
    ).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "categories": CATEGORY_LABELS,
    }

@router.get("/admin/stats")
async def get_recycling_stats(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """后台统计概览：各品类数量、平均利润率等"""
    stats = []
    for code, label in CATEGORY_LABELS.items():
        count = session.scalar(
            select(func.count()).select_from(RecyclingPrice)
            .where(RecyclingPrice.category == code)
        ) or 0
        
        active_count = session.scalar(
            select(func.count()).select_from(RecyclingPrice)
            .where(RecyclingPrice.category == code)
            .where(RecyclingPrice.validity == "active")
        ) or 0
        
        avg_recycle = session.scalar(
            select(func.avg(RecyclingPrice.recyclePrice))
            .where(RecyclingPrice.category == code)
        ) or 0
        
        avg_resale = session.scalar(
            select(func.avg(RecyclingPrice.resalePrice))
            .where(RecyclingPrice.category == code)
        ) or 0
        
        avg_profit = round(avg_resale - avg_recycle, 2) if avg_resale and avg_recycle else 0
        avg_margin = round((avg_profit / avg_resale * 100), 1) if avg_resale else 0
        
        stats.append({
            "code": code,
            "label": label,
            "total": count,
            "activeCount": active_count,
            "avgRecyclePrice": round(avg_recycle, 2),
            "avgResalePrice": round(avg_resale, 2),
            "avgProfit": avg_profit,
            "avgMargin": avg_margin,
        })
    
    total = session.scalar(select(func.count()).select_from(RecyclingPrice)) or 0
    
    return {"categoryStats": stats, "totalItems": total}

@router.post("/admin")
async def create_recycling_price(
    data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """手动新增单条回收价"""
    item = RecyclingPrice(
        category=data.get("category", "gpu"),
        model=data.get("model", ""),
        recyclePrice=float(data.get("recyclePrice", 0)),
        resalePrice=float(data.get("resalePrice", 0)),
        livePrice=float(data.get("livePrice", 0)) if data.get("livePrice") else None,
        newPrice=float(data.get("newPrice", 0)) if data.get("newPrice") else None,
        validity=data.get("validity", "active"),
        updatedBy=admin.username,
        note=data.get("note"),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.put("/admin/{item_id}")
async def update_recycling_price(
    item_id: int,
    data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """编辑回收价"""
    item = session.get(RecyclingPrice, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录未找到")
    
    for key in ["category", "model", "recyclePrice", "resalePrice", "livePrice", 
                 "newPrice", "validity", "note", "imageUrl"]:
        if key in data:
            val = data[key]
            if key in ("recyclePrice", "resalePrice", "livePrice", "newPrice") and val is not None:
                val = float(val)
            setattr(item, key, val)
    
    item.updatedBy = admin.username
    item.updatedAt = datetime.utcnow().isoformat()
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.delete("/admin/{item_id}")
async def delete_recycling_price(
    item_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    item = session.get(RecyclingPrice, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录未找到")
    session.delete(item)
    session.commit()
    return {"success": True}

@router.post("/admin/import")
async def import_from_excel(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """通过后台上传 Excel 文件进行导入"""
    import tempfile, openpyxl
    
    SHEET_MAP = {
        "处理器": "cpu", "主板": "motherboard", "内存": "ram",
        "硬盘": "disk", "显卡": "gpu", "电源": "psu",
        "机箱": "case", "显示器": "monitor", "散热": "cooler", "外设": "peripheral",
    }
    
    # Save uploaded file to temp
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsm") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        wb = openpyxl.load_workbook(tmp_path, read_only=True, data_only=True)
        total_new = 0
        total_updated = 0
        
        # Track items already processed in this import batch
        seen_in_import = {}
        
        for sheet_name, category in SHEET_MAP.items():
            if sheet_name not in wb.sheetnames:
                continue
            ws = wb[sheet_name]
            for row in ws.iter_rows(min_row=2, max_row=10000):
                cells = {}
                for c in row:
                    try:
                        if c.value is not None:
                            cells[c.column] = c.value
                    except:
                        pass
                
                model_name = cells.get(1)
                if not model_name or not str(model_name).strip():
                    continue
                model_name = str(model_name).strip()
                
                recycle_price = float(cells.get(2, 0) or 0)
                resale_price = float(cells.get(3, 0) or 0)
                if recycle_price == 0 and resale_price == 0:
                    continue
                
                validity_text = str(cells.get(4, ""))
                validity = "active" if validity_text in ("一周内", "一月内", "半月内", "三天内", "长期有效") else "expired"
                
                live_col = 14 if sheet_name == "处理器" else 12
                live_price = float(cells.get(live_col, 0) or 0) if cells.get(live_col) else None
                new_price = float(cells.get(7, 0) or 0) if cells.get(7) else None
                
                updated_at = cells.get(5)
                if isinstance(updated_at, datetime):
                    updated_at = updated_at.isoformat()
                else:
                    updated_at = str(updated_at) if updated_at else datetime.utcnow().isoformat()
                
                key = (category, model_name)
                
                if key in seen_in_import:
                    existing = seen_in_import[key]
                else:
                    existing = session.exec(
                        select(RecyclingPrice)
                        .where(RecyclingPrice.category == category)
                        .where(RecyclingPrice.model == model_name)
                    ).first()
                    if existing:
                        seen_in_import[key] = existing
                
                if existing:
                    existing.recyclePrice = recycle_price
                    existing.resalePrice = resale_price
                    existing.livePrice = live_price
                    existing.newPrice = new_price
                    existing.validity = validity
                    existing.updatedAt = updated_at
                    existing.updatedBy = admin.username
                    session.add(existing)
                    if key not in seen_in_import:
                        total_updated += 1
                else:
                    new_item = RecyclingPrice(
                        category=category, model=model_name,
                        recyclePrice=recycle_price, resalePrice=resale_price,
                        livePrice=live_price, newPrice=new_price,
                        validity=validity, updatedAt=updated_at,
                        updatedBy=admin.username,
                        note=str(cells.get(10, "")) if cells.get(10) else None,
                        imageUrl=str(cells.get(11, "")) if cells.get(11) else None,
                    )
                    session.add(new_item)
                    seen_in_import[key] = new_item
                    total_new += 1
            
            session.commit()
        
        wb.close()
        return {"success": True, "newCount": total_new, "updatedCount": total_updated}
    finally:
        os.unlink(tmp_path)

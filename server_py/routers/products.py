from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Hardware, User, PriceHistory
from .auth import get_current_admin
from ..services.ai_service import AiService
from ..services.price_safety import PriceSafetyError, sanitize_previous_price, validate_price_change
from pydantic import BaseModel
import uuid
import json
import logging
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

def _missing_local_upload(image: Optional[str]) -> bool:
    if not image or not image.startswith("/uploads/"):
        return False

    upload_root = os.path.abspath(UPLOAD_DIR)
    relative_path = image[len("/uploads/"):].lstrip("/")
    file_path = os.path.abspath(os.path.join(upload_root, relative_path))
    if not file_path.startswith(upload_root + os.sep):
        return True

    return not os.path.isfile(file_path)

def _dump_public_product(hw: Hardware) -> dict:
    data = hw.model_dump()
    if _missing_local_upload(data.get("image")):
        data["image"] = None
    data["previousPrice"] = sanitize_previous_price(hw.price, hw.previousPrice)
    return data

@router.get("/", response_model=dict)
@router.get("", response_model=dict)
async def get_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    is_recommended: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session)
):
    # Only return sellable products for public API; 0 means unpriced/archived.
    query = select(Hardware).where(Hardware.status == "active", Hardware.price > 0)
    
    if category:
        query = query.where(Hardware.category == category)
    if brand:
        query = query.where(Hardware.brand == brand)
    if is_recommended is not None:
        query = query.where(Hardware.isRecommended == is_recommended)
    
    if search:
        from sqlmodel import or_
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            # Use coalesce to handle potential NULL values in database
            from sqlalchemy import func
            query = query.where(or_(
                func.coalesce(Hardware.brand, "").ilike(search_term),
                func.coalesce(Hardware.model, "").ilike(search_term)
            ))
        
    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(Hardware).where(Hardware.status == "active", Hardware.price > 0)
    if category: count_query = count_query.where(Hardware.category == category)
    if brand: count_query = count_query.where(Hardware.brand == brand)
    if is_recommended is not None: count_query = count_query.where(Hardware.isRecommended == is_recommended)
    if search:
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            count_query = count_query.where(or_(
                func.coalesce(Hardware.brand, "").ilike(search_term),
                func.coalesce(Hardware.model, "").ilike(search_term)
            ))
    total = session.scalar(count_query)

    offset = (page - 1) * page_size
    results = session.exec(query.order_by(Hardware.sortOrder).offset(offset).limit(page_size)).all()
    
    products = [_dump_public_product(hw) for hw in results]
        
    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size
    }

class BatchProductsRequest(BaseModel):
    ids: List[str]

@router.get("/batch", response_model=List[dict])
@router.post("/batch", response_model=List[dict])
async def get_products_batch(
    request: Optional[BatchProductsRequest] = None,
    ids: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """批量获取指定 ID 的产品详情（用于配置单展示）
    支持 POST (JSON body) 或 GET (query param 'ids' as comma-separated string)
    """
    target_ids = []
    if request and request.ids:
        target_ids = request.ids
    elif ids:
        target_ids = [i.strip() for i in ids.split(",") if i.strip()]
        
    if not target_ids:
        return []
        
    from sqlmodel import select
    query = select(Hardware).where(Hardware.id.in_(target_ids))
    results = session.exec(query).all()
    
    # Diagnostic logging
    found_ids = {hw.id for hw in results}
    missing_ids = [pid for pid in target_ids if pid not in found_ids]
    if missing_ids:
        print(f"DIAGNOSTIC - Batch Products Missing: {missing_ids}")
    
    products = [_dump_public_product(hw) for hw in results]
    
    # 保持请求中的顺序
    id_map = {p["id"]: p for p in products}
    ordered_products = [id_map[pid] for pid in target_ids if pid in id_map]
    
    return ordered_products

@router.get("/admin", response_model=dict)
async def get_admin_products(
    page: int = 1,
    page_size: int = 20,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    search: Optional[str] = None,
    sort_key: Optional[str] = "sortOrder",
    sort_dir: Optional[str] = "asc",
    filter_ai: bool = False,
    session: Session = Depends(get_session), 
    admin: User = Depends(get_current_admin)
):
    """Admin only: Get all products including archived ones with pagination and filtering"""
    from sqlalchemy import func, or_, asc, desc
    
    query = select(Hardware)
    
    if category and category != 'all':
        query = query.where(Hardware.category == category)
    
    if brand and brand != 'all':
        query = query.where(Hardware.brand == brand)
    
    if filter_ai:
        query = query.where(or_(Hardware.imageSource == 'ai_suggested', Hardware.specsSource == 'ai_suggested'))
    
    if search:
        print(f"DEBUG: Search query: '{search}'")
        # Support multi-keyword search (e.g., "MSI 迫" -> matches MSI brand and 迫击炮 model)
        keywords = search.strip().split()
        print(f"DEBUG: Keywords: {keywords}")
        for kw in keywords:
            search_term = f"%{kw}%"
            query = query.where(or_(
                func.coalesce(Hardware.brand, "").ilike(search_term),
                func.coalesce(Hardware.model, "").ilike(search_term)
            ))
        
    # Count total for the filtered query
    count_query = select(func.count()).select_from(Hardware)
    if category and category != 'all':
        count_query = count_query.where(Hardware.category == category)
    if brand and brand != 'all':
        count_query = count_query.where(Hardware.brand == brand)
    if filter_ai:
        count_query = count_query.where(or_(Hardware.imageSource == 'ai_suggested', Hardware.specsSource == 'ai_suggested'))
    if search:
        keywords = search.strip().split()
        for kw in keywords:
            search_term = f"%{kw}%"
            count_query = count_query.where(or_(
                func.coalesce(Hardware.brand, "").ilike(search_term),
                func.coalesce(Hardware.model, "").ilike(search_term)
            ))
        
    total = session.scalar(count_query)
    
    # Sort Logic
    sort_column = getattr(Hardware, sort_key) if hasattr(Hardware, sort_key) else Hardware.sortOrder
    
    # 组合排序：主排序 -> 权重排序 -> ID（确保分页稳定）
    if sort_dir == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # 始终将权重作为第二排序（除非权重本身就是主排序），ID 作为最后保底
    if sort_key != "sortOrder":
        query = query.order_by(asc(Hardware.sortOrder))
    
    query = query.order_by(Hardware.id)

    offset = (page - 1) * page_size
    results = session.exec(query.offset(offset).limit(page_size)).all()
    
    products = [hw.model_dump() for hw in results]
        
    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.post("/admin/autofill-images")
def autofill_images(
    limit: int = 50,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: Automatically find images for products that don't have one.
    Limit added to prevent long-running request timeouts.
    """
    # 查找所有没有图片的产品, 限制数量以防超时
    statement = select(Hardware).where(Hardware.image == None).limit(limit)
    products_missing_images = session.exec(statement).all()
    
    if not products_missing_images:
        return {"message": "没有需要补全图片的产品", "count": 0}
        
    ai_service = AiService(session)
    count = 0
    updated_ids = []
    
    for p in products_missing_images:
        url = ai_service.suggest_image_url(p.brand, p.model)
        if url:
            p.image = url
            # 标记为 AI 建议，方便用户审核
            p.imageSource = "ai_suggested"
            p.updatedAt = datetime.utcnow().isoformat()
            session.add(p)
            count += 1
            updated_ids.append(p.id)
            
    session.commit()
    return {
        "message": f"成功为 {count} 个产品补全了 AI 建议图片",
        "count": count,
        "updated_ids": updated_ids
    }

@router.post("/admin/autofill-specs")
def autofill_specs(
    limit: int = 50,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: Automatically fill in missing product specifications using AI.
    Limit added to prevent timeouts.
    """
    # 核心逻辑：找出 specs 为空的产品（不管 specsSource 是什么）
    # 只有 specs 真正有内容（长度>4 即非 '{}' / 'null' / ''）且是用户手动填的，才跳过
    from sqlalchemy import or_, func, cast, String, and_
    
    statement = select(Hardware).where(
        Hardware.status == "active"
    ).where(
        or_(
            Hardware.specs == None,
            cast(Hardware.specs, String) == '{}',
            cast(Hardware.specs, String) == '',
            func.length(cast(Hardware.specs, String)) <= 4,
        )
    ).limit(limit)
    products = session.exec(statement).all()
    
    if not products:
        return {"message": "没有需要补全参数的产品", "count": 0}
        
    ai_service = AiService(session)
    filled_count = 0
    
    for product in products:
        suggested_specs = ai_service.suggest_specs(product.category, product.brand, product.model)
        if suggested_specs:
            product.specs = suggested_specs
            product.specsSource = 'ai_suggested'
            product.updatedAt = datetime.utcnow().isoformat()
            session.add(product)
            filled_count += 1
            
    session.commit()
    return {"message": f"成功为 {filled_count} 个商品补全了 AI 建议参数", "filled_count": filled_count}

@router.get("/counts/admin", response_model=dict)
async def get_admin_product_counts(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: Get counts of products grouped by category"""
    from sqlalchemy import func
    query = select(Hardware.category, func.count()).select_from(Hardware).group_by(Hardware.category)
    results = session.exec(query).all()
    
    counts = {category: count for category, count in results if category}
    
    # Also get total count
    total_query = select(func.count()).select_from(Hardware)
    total = session.scalar(total_query)
    counts['total'] = total or 0
    
    return counts

@router.get("/brands", response_model=List[str])
async def get_brands(
    category: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get all distinct brands, optionally filtered by category"""
    from sqlalchemy import distinct
    
    query = select(distinct(Hardware.brand)).where(Hardware.brand != None)
    
    if category and category != 'all':
        query = query.where(Hardware.category == category)
        
    brands = session.exec(query).all()
    # Filter out empty strings if any and sort
    return sorted([b for b in brands if b])

@router.get("/specs/values", response_model=List[str])
async def get_spec_values(
    category: str,
    key: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """Admin only: Get all distinct values for a specific spec key in a category"""
    # SQLite doesn't have a simple way to distinct on JSON keys via SQLModel easily without raw SQL
    # Since the product count is usually small, we can fetch and process in Python
    # or use SQLAlchemy's func.json_extract if we want to be more efficient.
    from sqlalchemy import func
    
    # Using json_extract for efficiency if supported by the DB (SQLite/MariaDB/Postgres all support it)
    # Hardware.specs is a string, so we might need to cast or use specific JSON functions
    statement = select(Hardware).where(Hardware.category == category)
    products = session.exec(statement).all()
    
    values = set()
    for p in products:
        try:
            specs = json.loads(p.specs) if isinstance(p.specs, str) else (p.specs or {})
            val = specs.get(key)
            if val is not None and val != "":
                values.add(str(val))
        except:
            continue
            
    return sorted(list(values))

# 前端不允许直接覆盖的受保护字段（只能由后端逻辑维护）
PROTECTED_FIELDS = {'previousPrice', 'createdAt', 'id'}

def _validate_price_change(
    product: Hardware,
    old_price: float,
    new_price: float,
    force: bool = False,
    allow_zero_archive: bool = False,
):
    try:
        validate_price_change(
            old_price,
            new_price,
            force=force,
            allow_zero_archive=allow_zero_archive,
        )
    except PriceSafetyError as exc:
        logger.warning(
            "Rejected unsafe price change: %s %s %s->%s",
            product.brand,
            product.model,
            old_price,
            new_price,
        )
        raise HTTPException(status_code=400, detail=str(exc))

def _serialize_specs(specs) -> dict:
    """确保 specs 是字典（适应 JSON 字段）"""
    if specs is None:
        return {}
    if isinstance(specs, dict):
        return specs
    if isinstance(specs, str):
        try:
            return json.loads(specs)
        except Exception:
            return {}
    return {}

def _log_price_change(session: Session, product: Hardware, old_price: float, new_price: float):
    """智能记录价格变动：2小时内的变动合并为一条记录"""
    if old_price == new_price or old_price is None:
        return
        
    
    product.previousPrice = old_price
    change_pct = ((new_price - old_price) / old_price * 100) if old_price > 0 else 0
    
    # 查找该商品最近的一条价格记录
    recent = session.exec(
        select(PriceHistory)
        .where(PriceHistory.hardwareId == product.id)
        .order_by(PriceHistory.changedAt.desc())  # type: ignore
        .limit(1)
    ).first()
    
    merge_window = timedelta(minutes=15)
    
    if recent:
        try:
            recent_time = datetime.fromisoformat(recent.changedAt)
            now_cst = datetime.utcnow() + timedelta(hours=8)
            if (now_cst - recent_time).total_seconds() >= 0 and now_cst - recent_time < merge_window:
                # 2小时内：更新现有记录，保留原始 oldPrice
                recent.newPrice = new_price
                recent.changeAmount = round(new_price - recent.oldPrice, 2)
                recent.changePercent = round(
                    ((new_price - recent.oldPrice) / recent.oldPrice * 100) if recent.oldPrice > 0 else 0, 2
                )
                recent.changedAt = now_cst.isoformat()
                session.add(recent)
                return
        except (ValueError, TypeError):
            pass  # 解析失败则创建新记录
    
    # 超过2小时或无历史记录：创建新记录
    ph = PriceHistory(
        hardwareId=product.id,
        hardwareName=f"{product.brand} {product.model}",
        category=product.category,
        oldPrice=old_price,
        newPrice=new_price,
        changeAmount=round(new_price - old_price, 2),
        changePercent=round(change_pct, 2),
        changedAt=(datetime.utcnow() + timedelta(hours=8)).isoformat()
    )
    session.add(ph)

@router.post("/")
@router.post("")
async def create_product(
    product_data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    product_id = product_data.get("id") or str(uuid.uuid4())
    specs_value = _serialize_specs(product_data.get("specs"))

    existing = session.get(Hardware, product_id)
    if existing:
        old_price = existing.price
        for key, value in product_data.items():
            if key in PROTECTED_FIELDS:
                continue  # 跳过受保护字段，防止前端覆盖
            if key == "specs":
                value = _serialize_specs(value)
            if hasattr(existing, key):
                setattr(existing, key, value)
        existing.updatedAt = (datetime.utcnow() + timedelta(hours=8)).isoformat()
        new_price = existing.price
        # 如果更新了成本或利润，且本次没有显式提供售价，则联动计算
        if any(k in product_data for k in ["costPrice", "profitType", "profitValue"]):
            if "price" not in product_data or product_data.get("price") == 0:
                if existing.profitType == "fixed":
                    existing.price = existing.costPrice + existing.profitValue
                elif existing.profitType == "percent":
                    existing.price = existing.costPrice * (1 + existing.profitValue / 100)
                new_price = existing.price
        _validate_price_change(
            existing,
            old_price,
            new_price,
            product_data.get("force_price_update") is True,
            allow_zero_archive=True,
        )
        if existing.price == 0:
            existing.status = "archived"
        # 智能记录价格变动（15分钟合并）
        _log_price_change(session, existing, old_price, new_price)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    new_product = Hardware(
        id=product_id,
        category=product_data.get("category"),
        brand=product_data.get("brand"),
        model=product_data.get("model"),
        price=product_data.get("price"),
        status=product_data.get("status", "active"),
        sortOrder=product_data.get("sortOrder", 100),
        specs=specs_value,
        costPrice=product_data.get("costPrice", 0.0),
        profitType=product_data.get("profitType", "fixed"),
        profitValue=product_data.get("profitValue", 0.0),
        image=product_data.get("image"),
        isDiscount=product_data.get("isDiscount", False),
        isRecommended=product_data.get("isRecommended", False),
        isNew=product_data.get("isNew", False),
        updatedAt=datetime.utcnow().isoformat()
    )

    if new_product.price == 0:
        new_product.status = "archived"

    # 自动计算逻辑：如果提供了 costPrice 且 price 为 0 或 None，则尝试计算
    if (new_product.price == 0 or new_product.price is None) and new_product.costPrice > 0:
        if new_product.profitType == "fixed":
            new_product.price = new_product.costPrice + new_product.profitValue
        elif new_product.profitType == "percent":
            new_product.price = new_product.costPrice * (1 + new_product.profitValue / 100)
    session.add(new_product)
    session.commit()
    session.refresh(new_product)
    return new_product

@router.put("/{product_id}")
async def update_product(
    product_id: str,
    product_data: dict,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    product = session.get(Hardware, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="产品未找到")

    old_price = product.price
    for key, value in product_data.items():
        if key in PROTECTED_FIELDS:
            continue  # 跳过受保护字段，防止前端覆盖
        if key == "specs":
            value = _serialize_specs(value)
        if hasattr(product, key):
            setattr(product, key, value)
            
    product.updatedAt = (datetime.utcnow() + timedelta(hours=8)).isoformat()

    # 如果更新了成本或利润，且没有显式更新售价（或者售价为0），则重新计算售价
    # 注意：这里我们假设如果用户在 UI 上手动改了售价，则以售价为准；如果改的是成本/利润，则联动。
    # 为了简化逻辑，我们检查输入数据中是否包含成本或利润字段
    if any(k in product_data for k in ["costPrice", "profitType", "profitValue"]):
        # 只有当 price 没有在本次请求中被显式修改，或者 price 被设为 0 时，才执行自动联动
        if "price" not in product_data or product_data.get("price") == 0:
            if product.profitType == "fixed":
                product.price = product.costPrice + product.profitValue
            elif product.profitType == "percent":
                product.price = product.costPrice * (1 + product.profitValue / 100)

    new_price = product.price
    _validate_price_change(
        product,
        old_price,
        new_price,
        product_data.get("force_price_update") is True,
        allow_zero_archive=True,
    )
    if product.price == 0:
        product.status = "archived"
        
    # 智能记录价格变动（15分钟合并）
    _log_price_change(session, product, old_price, new_price)

    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    product = session.get(Hardware, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="产品未找到")

    session.delete(product)
    session.commit()
    return {"message": "产品已删除"}


# ═══════════════════════════════════════════════════════════
# 京东联盟 CPS 推广链接管理
# ═══════════════════════════════════════════════════════════

class JDBindRequest(BaseModel):
    product_id: str
    jd_url: str  # 京东链接、SKU ID 或联盟商品ID

class JDBatchBindRequest(BaseModel):
    bindings: List[dict]  # [{"product_id": "xxx", "jd_url": "yyy"}, ...]

@router.post("/admin/bind-jd")
async def bind_jd_link(
    request: JDBindRequest,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """为单个产品绑定京东推广链接"""
    from ..services.jd_union_service import bind_product_jd_link

    product = session.get(Hardware, request.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="产品未找到")

    result = bind_product_jd_link(request.jd_url)

    if result["success"]:
        # 更新产品的 specs 字段，写入京东链接
        specs = _serialize_specs(product.specs)
        specs["jd_url"] = result["click_url"]
        specs["jd_sku_id"] = result.get("jd_sku_id", "")
        specs["jd_page_url"] = result.get("jd_page_url", "")
        product.specs = specs
        product.updatedAt = datetime.utcnow().isoformat()
        session.add(product)
        session.commit()
        session.refresh(product)

        return {
            "success": True,
            "message": f"已为 {product.brand} {product.model} 生成京东推广链接",
            "click_url": result["click_url"],
            "product": product.model_dump()
        }
    else:
        return {
            "success": False,
            "message": result.get("error", "绑定失败"),
            "original_url": result.get("original_url", "")
        }


@router.post("/admin/batch-bind-jd")
async def batch_bind_jd_links(
    request: JDBatchBindRequest,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """批量为产品绑定京东推广链接"""
    from ..services.jd_union_service import bind_product_jd_link

    results = {"success": 0, "failed": 0, "details": []}

    for binding in request.bindings:
        pid = binding.get("product_id", "")
        jd_url = binding.get("jd_url", "")

        if not pid or not jd_url:
            results["failed"] += 1
            results["details"].append({"product_id": pid, "success": False, "error": "参数缺失"})
            continue

        product = session.get(Hardware, pid)
        if not product:
            results["failed"] += 1
            results["details"].append({"product_id": pid, "success": False, "error": "产品不存在"})
            continue

        result = bind_product_jd_link(jd_url)
        if result["success"]:
            specs = _serialize_specs(product.specs)
            specs["jd_url"] = result["click_url"]
            specs["jd_sku_id"] = result.get("jd_sku_id", "")
            specs["jd_page_url"] = result.get("jd_page_url", "")
            product.specs = specs
            product.updatedAt = datetime.utcnow().isoformat()
            session.add(product)
            results["success"] += 1
            results["details"].append({
                "product_id": pid,
                "success": True,
                "name": f"{product.brand} {product.model}"
            })
        else:
            results["failed"] += 1
            results["details"].append({
                "product_id": pid,
                "success": False,
                "error": result.get("error", "生成失败")
            })

    session.commit()
    return results


@router.get("/admin/search-jd")
async def search_jd_products_api(
    keyword: str = "",
    elite_id: int = 22,
    cid1: Optional[int] = None,
    page: int = 1,
    admin: User = Depends(get_current_admin)
):
    """搜索京东联盟商品（京粉精选频道）"""
    from ..services.jd_union_service import search_jd_products
    return search_jd_products(keyword=keyword, elite_id=elite_id, cid1=cid1, page=page)


@router.get("/admin/jd-bindstats")
async def get_jd_bind_stats(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """获取京东链接绑定统计"""
    from sqlalchemy import func

    total = session.scalar(select(func.count()).select_from(Hardware).where(Hardware.status == "active"))

    # 统计已绑定京东链接的产品数（specs JSON 中包含 jd_url）
    all_active = session.exec(select(Hardware).where(Hardware.status == "active")).all()
    bound_count = 0
    for hw in all_active:
        specs = _serialize_specs(hw.specs)
        if specs.get("jd_url"):
            bound_count += 1

    return {
        "total": total or 0,
        "bound": bound_count,
        "unbound": (total or 0) - bound_count
    }

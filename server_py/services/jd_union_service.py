"""
京东联盟 CPS 推广服务
功能：
1. 生成推广链接（带佣金追踪的 clickURL）
2. 从京粉精选频道搜索商品
3. 获取京东类目树
"""
import json
import hashlib
import logging
import os
import requests
import urllib3
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
logger = logging.getLogger(__name__)

# 京东联盟 API 配置
JD_APP_KEY = os.getenv("JD_APP_KEY", "")
JD_APP_SECRET = os.getenv("JD_APP_SECRET", "")
JD_SITE_ID = os.getenv("JD_SITE_ID", "")
JD_API_URL = "https://router.jd.com/api"


def _generate_sign(params: dict, secret: str) -> str:
    """京东联盟 MD5 签名算法"""
    sorted_keys = sorted(params.keys())
    param_str = secret
    for key in sorted_keys:
        if key != 'sign':
            param_str += key + str(params[key])
    param_str += secret
    return hashlib.md5(param_str.encode('utf-8')).hexdigest().upper()


def _call_jd_api(method: str, param_json_obj: dict) -> Optional[dict]:
    """统一的京东联盟 API 调用"""
    if not JD_APP_KEY or not JD_APP_SECRET or not JD_SITE_ID:
        logger.warning("JD Union API is not configured; set JD_APP_KEY, JD_APP_SECRET and JD_SITE_ID")
        return None

    param_json = json.dumps(param_json_obj)
    params = {
        "method": method,
        "app_key": JD_APP_KEY,
        "timestamp": (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S"),
        "format": "json",
        "v": "1.0",
        "sign_method": "md5",
        "param_json": param_json
    }
    params["sign"] = _generate_sign(params, JD_APP_SECRET)

    try:
        r = requests.get(JD_API_URL, params=params, timeout=15, verify=False)
        if r.status_code == 200:
            return r.json()
        logger.error(f"JD API HTTP error: {r.status_code}")
    except Exception as e:
        logger.error(f"JD API request failed: {e}")
    return None


def generate_promotion_link(material_url: str) -> Optional[str]:
    """
    生成京东推广链接（带 CPS 佣金追踪）
    
    material_url: 联盟商品链接格式，如 https://jingfen.jd.com/detail/{itemId}.html
                  或者京东商品链接 https://item.jd.com/{skuId}.html
    
    Returns: 带佣金追踪的推广链接 clickURL，失败返回 None
    """
    data = _call_jd_api("jd.union.open.promotion.common.get", {
        "promotionCodeReq": {
            "materialId": material_url,
            "siteId": JD_SITE_ID,
            "sceneId": 1
        }
    })

    if not data:
        return None

    resp_key = "jd_union_open_promotion_common_get_response"
    if resp_key not in data:
        return None

    result_str = data[resp_key].get("result", "{}")
    result = json.loads(result_str)

    if result.get("code") == 200:
        click_url = result.get("data", {}).get("clickURL")
        if click_url:
            logger.info(f"✅ 推广链接生成成功: {material_url[:50]}...")
            return click_url

    error_msg = result.get("message", "未知错误")
    logger.warning(f"推广链接生成失败 ({result.get('code')}): {error_msg}")
    return None


def search_jd_products(keyword: str = "", elite_id: int = 22, 
                       cid1: Optional[int] = None, page: int = 1, 
                       page_size: int = 20) -> Dict[str, Any]:
    """
    从京粉精选频道搜索商品
    
    elite_id: 频道ID (22=热销, 27=金榜, 41=电脑组件等)
    cid1: 一级类目ID (670=电脑办公, 652=数码)
    
    Returns: {"items": [...], "total": N}
    """
    req = {
        "goodsReq": {
            "eliteId": elite_id,
            "pageIndex": page,
            "pageSize": min(page_size, 20),
            "sortName": "inOrderCount30Days",
            "sort": "desc",
            "siteId": JD_SITE_ID
        }
    }
    if cid1:
        req["goodsReq"]["cid1"] = cid1

    data = _call_jd_api("jd.union.open.goods.jingfen.query", req)
    if not data:
        return {"items": [], "total": 0}

    resp_key = "jd_union_open_goods_jingfen_query_response"
    if resp_key not in data:
        return {"items": [], "total": 0}

    result = json.loads(data[resp_key].get("result", "{}"))
    if result.get("code") != 200:
        return {"items": [], "total": 0}

    raw_items = result.get("data", [])
    total = result.get("totalCount", 0)

    items = []
    for item in raw_items:
        price_info = item.get("priceInfo", {})
        cat_info = item.get("categoryInfo", {})
        shop_info = item.get("shopInfo", {})
        
        # 过滤关键词匹配（如果提供了keyword）
        name = item.get("skuName", "")
        if keyword and not any(kw.lower() in name.lower() for kw in keyword.split()):
            continue

        items.append({
            "itemId": item.get("itemId", ""),
            "name": name,
            "price": price_info.get("lowestPrice"),
            "couponPrice": price_info.get("lowestCouponPrice"),
            "imageUrl": (item.get("imageInfo", {}).get("imageList") or [{}])[0].get("url", ""),
            "materialUrl": item.get("materialUrl", ""),
            "category": f"{cat_info.get('cid1Name', '')}/{cat_info.get('cid2Name', '')}/{cat_info.get('cid3Name', '')}",
            "shopName": shop_info.get("shopName", ""),
            "commission": item.get("commissionInfo", {}).get("commissionShare", 0),
            "orders30d": item.get("inOrderCount30Days", 0),
        })

    return {"items": items, "total": total}


def get_jd_categories(parent_id: int = 0, grade: int = 0) -> List[Dict[str, Any]]:
    """获取京东商品类目树"""
    data = _call_jd_api("jd.union.open.category.goods.get", {
        "req": {"parentId": parent_id, "grade": grade}
    })
    if not data:
        return []

    resp_key = "jd_union_open_category_goods_get_response"
    if resp_key not in data:
        return []

    result = json.loads(data[resp_key].get("result", "{}"))
    if result.get("code") != 200:
        return []

    return [{"id": c["id"], "name": c["name"], "grade": c.get("grade", 0)} 
            for c in result.get("data", [])]


def bind_product_jd_link(jd_url: str) -> Dict[str, Any]:
    """
    为产品绑定京东链接：输入京东链接/SKU，输出推广链接
    
    支持的输入格式:
    - 京东商品链接: https://item.jd.com/100114195705.html
    - 纯SKU ID: 100114195705
    - 京粉链接: https://jingfen.jd.com/detail/{itemId}.html
    - 联盟商品ID: VgDXlT9hVVVm...
    
    Returns: {"success": bool, "click_url": str, "jd_sku_id": str, ...}
    """
    jd_url = jd_url.strip()
    jd_sku_id = ""
    material_url = ""

    # 如果已经是生成的短链接或带货链接，直接放行
    if "u.jd.com" in jd_url or "union-click.jd.com" in jd_url:
        return {
            "success": True,
            "click_url": jd_url,
            "jd_sku_id": "",
            "original_url": jd_url,
            "jd_page_url": jd_url
        }

    # 解析输入格式
    if "item.jd.com" in jd_url:
        # 京东商品链接 → 提取 SKU ID
        import re
        match = re.search(r'(\d{9,15})', jd_url)
        if match:
            jd_sku_id = match.group(1)
        material_url = jd_url
    elif "jingfen.jd.com" in jd_url:
        # 已经是联盟商品链接格式
        material_url = jd_url if jd_url.startswith("http") else f"https://{jd_url}"
    elif jd_url.replace("-", "").isdigit():
        # 纯 SKU ID
        jd_sku_id = jd_url
        material_url = f"https://item.jd.com/{jd_url}.html"
    else:
        # 可能是联盟商品ID
        material_url = f"https://jingfen.jd.com/detail/{jd_url}.html"

    # 尝试生成推广链接
    # 策略1: 直接用 sceneId=1 和 jingfen 格式（已验证可用）
    click_url = generate_promotion_link(material_url)

    if not click_url and jd_sku_id:
        # 策略2: 如果是 SKU 链接失败，尝试用 item.jd.com 格式
        click_url = generate_promotion_link(f"https://item.jd.com/{jd_sku_id}.html")

    if click_url:
        return {
            "success": True,
            "click_url": click_url,
            "jd_sku_id": jd_sku_id,
            "original_url": material_url,
            "jd_page_url": f"https://item.jd.com/{jd_sku_id}.html" if jd_sku_id else material_url
        }

    return {
        "success": False,
        "error": "无法生成推广链接。请确保输入的是有效的京东商品链接或联盟商品ID。",
        "jd_sku_id": jd_sku_id,
        "original_url": material_url
    }

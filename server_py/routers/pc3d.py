from __future__ import annotations

import json
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..models import User
from .auth import get_current_admin

router = APIRouter()

ROOT_DIR = Path(__file__).resolve().parents[2]
MAPPING_FILE = "product-model-mapping.json"
DECISIONS_FILE = "model-filter-decisions.json"
MODEL_CATALOG_FILE = "model-catalog.json"
MODEL_REVIEW_FILE = "model-review-decisions.json"
MODEL_FILES_DIR = "model-files"
PERSISTENT_DATA_DIR = ROOT_DIR / "data" / "pc3d"
SEEDED_DATA_FILES = [MAPPING_FILE, DECISIONS_FILE, MODEL_CATALOG_FILE, MODEL_REVIEW_FILE, "assets.json"]


class ProductIdRequest(BaseModel):
    product_id: str


class AssetProductLinkRequest(BaseModel):
    asset_id: str
    product_id: str


class ModelLinkRequest(BaseModel):
    asset_id: str
    product_id: str
    relation: str = "similar"


class ModelAssetRequest(BaseModel):
    asset_id: str


def _timestamp() -> str:
    return datetime.utcnow().isoformat(timespec="milliseconds") + "Z"


def _pc3d_data_dir() -> Path:
    env_dir = os.getenv("PC3D_DATA_DIR")
    if env_dir:
        candidate = Path(env_dir)
        if not (candidate / MAPPING_FILE).exists():
            _seed_data_dir(candidate)
        if (candidate / MAPPING_FILE).exists():
            return candidate

    if not (PERSISTENT_DATA_DIR / MAPPING_FILE).exists():
        _seed_data_dir(PERSISTENT_DATA_DIR)
    if (PERSISTENT_DATA_DIR / MAPPING_FILE).exists():
        return PERSISTENT_DATA_DIR

    for candidate in [ROOT_DIR / "dist" / "data" / "pc3d", ROOT_DIR / "public" / "data" / "pc3d"]:
        if (candidate / MAPPING_FILE).exists():
            return candidate
    return PERSISTENT_DATA_DIR


def _seed_data_dir(target: Path) -> None:
    sources = [ROOT_DIR / "dist" / "data" / "pc3d", ROOT_DIR / "public" / "data" / "pc3d"]
    source = next((candidate for candidate in sources if (candidate / MAPPING_FILE).exists()), None)
    if not source:
        return
    target.mkdir(parents=True, exist_ok=True)
    for filename in SEEDED_DATA_FILES:
        source_file = source / filename
        target_file = target / filename
        if source_file.exists() and not target_file.exists():
            shutil.copy2(source_file, target_file)


def _read_json(path: Path, fallback: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text("utf-8"))
    except FileNotFoundError:
        return fallback


def _write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    tmp_path.replace(path)


def _mapping_path() -> Path:
    return _pc3d_data_dir() / MAPPING_FILE


def _decisions_path() -> Path:
    return _pc3d_data_dir() / DECISIONS_FILE


def _model_catalog_path() -> Path:
    return _pc3d_data_dir() / MODEL_CATALOG_FILE


def _model_review_path() -> Path:
    return _pc3d_data_dir() / MODEL_REVIEW_FILE


def _catalog_source_root() -> Path | None:
    env_root = os.getenv("PC3D_SOURCE_ROOT")
    candidates = [Path(env_root)] if env_root else []
    candidates.append(Path("/Users/mac/Documents/爬虫"))
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _safe_relative_path(raw_path: str) -> Path | None:
    if not raw_path:
        return None
    path = Path(raw_path)
    if path.is_absolute() or ".." in path.parts:
        return None
    return path


def _model_file_candidates(asset: Dict[str, Any]) -> list[Path]:
    asset_id = str(asset.get("asset_id") or "").strip()
    if not asset_id:
        return []

    data_dir = _pc3d_data_dir()
    category = str(asset.get("category") or "unknown").strip() or "unknown"
    candidates = [
        data_dir / MODEL_FILES_DIR / f"{asset_id}.glb",
        data_dir / MODEL_FILES_DIR / category / f"{asset_id}.glb",
    ]

    for bundled_dir in [
        data_dir / "models",
        ROOT_DIR / "dist" / "data" / "pc3d" / "models",
        ROOT_DIR / "public" / "data" / "pc3d" / "models",
    ]:
        if bundled_dir.exists():
            candidates.extend(bundled_dir.glob(f"*{asset_id}*.glb"))

    preferred = _safe_relative_path(str(asset.get("preferred_glb_path") or ""))
    if preferred:
        candidates.append(data_dir / MODEL_FILES_DIR / preferred.name)
        source_root = _catalog_source_root()
        if source_root:
            candidates.append(source_root / preferred)
    return candidates


def _resolve_model_file(asset: Dict[str, Any]) -> Path | None:
    for candidate in _model_file_candidates(asset):
        if candidate.is_file():
            return candidate
    return None


def _model_file_metadata(asset: Dict[str, Any]) -> Dict[str, Any]:
    path = _resolve_model_file(asset)
    if not path:
        return {
            "served_model_url": f"/api/pc3d/model-file/{asset.get('asset_id')}" if asset.get("asset_id") else "",
            "served_model_available": False,
            "served_model_size": 0,
        }
    return {
        "served_model_url": f"/api/pc3d/model-file/{asset.get('asset_id')}",
        "served_model_available": True,
        "served_model_size": path.stat().st_size,
    }


def _read_mapping() -> Dict[str, Any]:
    mapping = _read_json(_mapping_path(), {})
    if not mapping:
        raise HTTPException(status_code=404, detail="3D 模型映射文件不存在")
    return mapping


def _read_decisions() -> Dict[str, Any]:
    return _read_json(_decisions_path(), {"version": 1, "updated_at": "", "decisions": {}})


def _read_model_catalog() -> Dict[str, Any]:
    catalog = _read_json(_model_catalog_path(), {})
    if not catalog:
        fallback_path = ROOT_DIR / "public" / "data" / "pc3d" / MODEL_CATALOG_FILE
        catalog = _read_json(fallback_path, {})
    if not catalog:
        return {"generated_at": "", "total_assets": 0, "assets": []}
    return catalog


def _read_model_review() -> Dict[str, Any]:
    return _read_json(_model_review_path(), {"version": 1, "updated_at": "", "assets": {}})


def _recalculate_mapping(mapping: Dict[str, Any]) -> Dict[str, Any]:
    by_match_kind: Dict[str, int] = {}
    by_category_match: Dict[str, Dict[str, int]] = {}
    by_asset: Dict[str, int] = {}
    mappings: Dict[str, Any] = {}

    for product in mapping.get("products", []):
        kind = product.get("match_kind") or "none"
        category = product.get("category") or "unknown"
        by_match_kind[kind] = by_match_kind.get(kind, 0) + 1
        by_category_match.setdefault(category, {})
        by_category_match[category][kind] = by_category_match[category].get(kind, 0) + 1

        asset_id = product.get("asset_id") or ""
        if asset_id:
            by_asset[asset_id] = by_asset.get(asset_id, 0) + 1

        product_id = product.get("product_id")
        if product_id:
            mappings[product_id] = {
                "asset_id": asset_id,
                "match_kind": kind,
                "review_status": product.get("review_status") or "unmapped",
                "confidence": product.get("confidence") or 0,
                "reason": product.get("reason") or "",
                "risk": product.get("risk") or "",
            }

    mapping["summary"] = {
        **(mapping.get("summary") or {}),
        "total_products": len(mapping.get("products", [])),
        "by_match_kind": by_match_kind,
        "by_category_match": by_category_match,
        "by_asset": by_asset,
    }
    mapping["mappings"] = mappings
    return mapping


def _mark_approved(product: Dict[str, Any], reason_prefix: str = "后台默认关联，待后续人工审核确认") -> Dict[str, Any]:
    reason = product.get("reason") or "先关联已有候选模型"
    if not reason.startswith("后台默认关联") and not reason.startswith("后台审核确认"):
        reason = f"{reason_prefix}：{reason}"
    return {
        **product,
        "match_kind": "exact",
        "match_label": "默认可用",
        "review_status": "manual_approved",
        "confidence": max(float(product.get("confidence") or 0), 85),
        "reason": reason,
    }


def _mark_rejected(product: Dict[str, Any]) -> Dict[str, Any]:
    original_asset_label = product.get("asset_label") or product.get("asset_source_name") or ""
    return {
        **product,
        "asset_id": "",
        "asset_label": "",
        "asset_source_name": "",
        "asset_model_url": "",
        "match_kind": "none",
        "match_label": "已剔除",
        "review_status": "unmapped",
        "confidence": 0,
        "reason": f"后台审核标记不可用{f'：{original_asset_label}' if original_asset_label else ''}",
        "risk": "",
    }


def _record_decision(
    decisions: Dict[str, Any],
    action: str,
    product: Dict[str, Any],
    original: Dict[str, Any] | None = None,
) -> None:
    product_id = str(product.get("product_id") or "")
    decisions.setdefault("decisions", {})
    previous = decisions["decisions"].get(product_id) or {}
    decisions["decisions"][product_id] = {
        "action": action,
        "product_id": product.get("product_id"),
        "category": product.get("category"),
        "category_label": product.get("category_label"),
        "brand": product.get("brand"),
        "model": product.get("model"),
        "asset_id": product.get("asset_id"),
        "asset_label": product.get("asset_label"),
        "match_kind": product.get("match_kind"),
        "review_status": product.get("review_status"),
        "confidence": product.get("confidence"),
        "reason": product.get("reason"),
        "risk": product.get("risk"),
        "decided_at": _timestamp(),
        "original": previous.get("original") or original or product,
    }
    decisions["updated_at"] = _timestamp()


def _find_product_index(mapping: Dict[str, Any], product_id: str) -> int:
    for index, product in enumerate(mapping.get("products", [])):
        if str(product.get("product_id")) == str(product_id):
            return index
    raise HTTPException(status_code=404, detail="找不到产品")


def _find_asset(mapping: Dict[str, Any], asset_id: str) -> Dict[str, Any]:
    for asset in mapping.get("assets", []):
        if str(asset.get("asset_id")) == str(asset_id):
            return asset
    catalog = _read_model_catalog()
    for asset in catalog.get("assets", []):
        if str(asset.get("asset_id")) == str(asset_id):
            return asset
    raise HTTPException(status_code=404, detail="找不到 3D 模型")


def _model_asset_label(asset: Dict[str, Any]) -> str:
    return " ".join(
        part for part in [
            asset.get("brand_label") or asset.get("brand_cn") or asset.get("brand_en") or asset.get("manufacturer"),
            asset.get("model_name") or asset.get("buildcores_name"),
        ]
        if part
    ).strip() or str(asset.get("asset_id") or "")


def _normalize_match_text(value: Any) -> str:
    return re.sub(r"[^0-9a-zA-Z\u4e00-\u9fff]+", "", str(value or "")).lower()


def _split_model_examples(value: Any) -> list[str]:
    if isinstance(value, list):
        raw_parts = value
    else:
        raw_parts = re.split(r"[|｜;；\n]+", str(value or ""))
    return [str(part).strip() for part in raw_parts if str(part).strip()]


def _asset_brand(asset: Dict[str, Any]) -> str:
    return str(asset.get("brand_label") or asset.get("brand_cn") or asset.get("brand_en") or asset.get("manufacturer") or "")


def _asset_exact_match_keys(asset: Dict[str, Any]) -> set[tuple[str, str, str]]:
    category = str(asset.get("category") or "")
    brand = _normalize_match_text(_asset_brand(asset))
    if not category or not brand:
        return set()
    keys = set()
    for name in [asset.get("model_name"), asset.get("buildcores_name")]:
        normalized_name = _normalize_match_text(name)
        if normalized_name:
            keys.add((category, brand, normalized_name))
    return keys


def _tokenize_model_text(value: Any) -> list[str]:
    return re.findall(r"[0-9a-zA-Z]+|[\u4e00-\u9fff]+", str(value or "").lower())


def _mainboard_model_keys(value: Any) -> set[str]:
    tokens = _tokenize_model_text(value)
    if not tokens:
        return set()

    skip_tokens = {
        "asus",
        "华硕",
        "msi",
        "微星",
        "gigabyte",
        "技嘉",
        "sapphire",
        "蓝宝石",
        "motherboard",
        "mainboard",
        "主板",
        "amd",
        "intel",
        "am4",
        "am5",
        "lga1700",
        "lga1851",
        "atx",
        "eatx",
        "matx",
        "micro",
        "mini",
        "itx",
        "wi",
        "fi",
        "wifi",
        "wifi6",
        "wifi6e",
        "wifi7",
        "wlan",
        "ax",
        "ac",
        "rev",
        "revision",
        "版",
        "二手",
    }

    cleaned: list[str] = []
    seen_repeating_chipsets: set[str] = set()
    has_chipset = False
    for token in tokens:
        if token in skip_tokens:
            continue
        if re.fullmatch(r"(?:rev)?[0-9]+(?:\.[0-9]+)?x?", token):
            continue
        if re.fullmatch(r"[0-9]+内存", token):
            continue
        if re.fullmatch(r"[abzhx][0-9]{3,4}[em]?", token) or re.fullmatch(r"trx[0-9]{2}", token):
            has_chipset = True
            if token in seen_repeating_chipsets:
                continue
            seen_repeating_chipsets.add(token)
        cleaned.append(token)

    if not has_chipset or len(cleaned) < 2:
        return set()

    keys = {_normalize_match_text(" ".join(cleaned))}
    colorless = [token for token in cleaned if token not in {"white", "black", "silver", "w", "b", "白", "黑", "银", "白色", "黑色", "银色"}]
    if len(colorless) >= 2:
        keys.add(_normalize_match_text(" ".join(colorless)))

    unique_tokens = []
    for token in cleaned:
        if token not in unique_tokens:
            unique_tokens.append(token)
    if len(unique_tokens) >= 2:
        keys.add(_normalize_match_text(" ".join(sorted(unique_tokens))))
    return {key for key in keys if key}


def _asset_mainboard_loose_keys(asset: Dict[str, Any]) -> set[tuple[str, str, str]]:
    category = str(asset.get("category") or "")
    brand = _normalize_match_text(_asset_brand(asset))
    if category != "mainboard" or not brand:
        return set()
    keys = set()
    for name in [asset.get("model_name"), asset.get("buildcores_name")]:
        for normalized_name in _mainboard_model_keys(name):
            keys.add((category, brand, normalized_name))
    return keys


def _product_match_keys(product: Dict[str, Any]) -> set[tuple[str, str, str]]:
    category = str(product.get("category") or "")
    brand = _normalize_match_text(product.get("brand"))
    model = product.get("model")
    if not category or not brand:
        return set()
    keys = set()
    normalized_model = _normalize_match_text(model)
    if normalized_model:
        keys.add((category, brand, normalized_model))
    if category == "mainboard":
        for normalized_model in _mainboard_model_keys(model):
            keys.add((category, brand, normalized_model))
    return keys


def _text_has_any(text: str, patterns: list[str]) -> bool:
    return any(pattern in text for pattern in patterns)


def _mainboard_feature_penalty(product: Dict[str, Any], asset: Dict[str, Any]) -> int:
    product_text = _normalize_match_text(product.get("model"))
    asset_text = _normalize_match_text(" ".join(
        str(part or "") for part in [
            asset.get("model_name"),
            asset.get("buildcores_name"),
            asset.get("part_numbers"),
        ]
    ))
    if not product_text or not asset_text:
        return 0

    penalty = 0
    feature_groups = [
        (["wifi7"], 16),
        (["wifi6e"], 10),
        (["wifi6"], 8),
        (["ddr4", "d4"], 18),
        (["ddr5", "d5"], 18),
    ]
    for patterns, weight in feature_groups:
        product_has = _text_has_any(product_text, patterns)
        asset_has = _text_has_any(asset_text, patterns)
        if product_has and not asset_has:
            penalty += weight
        elif asset_has and not product_has:
            penalty += max(1, weight // 4)

    product_white = _text_has_any(product_text, ["白", "white"])
    asset_white = _text_has_any(asset_text, ["白", "white"]) or bool(re.search(r"(?:^|[^a-z0-9])w(?:[^a-z0-9]|$)", str(asset.get("model_name") or "").lower()))
    if product_white and not asset_white:
        penalty += 12
    elif asset_white and not product_white:
        penalty += 2

    product_black = _text_has_any(product_text, ["黑", "black"])
    asset_black = _text_has_any(asset_text, ["黑", "black"])
    if product_black and not asset_black:
        penalty += 8
    elif asset_black and not product_black:
        penalty += 1

    return penalty


def _ram_appearance_family(value: Any) -> str:
    text = _normalize_match_text(value)
    if not text:
        return ""
    if "皇家戟" in text or "royal" in text:
        return "gskill_royal"
    if "幻锋戟" in text or "幻风戟" in text or "tridentz5" in text:
        return "gskill_trident_z5"
    if "超级野兽" in text:
        return "kingston_fury_beast_plus"
    if "野兽" in text or "furybeast" in text:
        return "kingston_fury_beast"
    if "马甲条" in text or "vengeance" in text:
        return "corsair_vengeance"
    if "dw100" in text or "blackopaldw100" in text:
        return "biwin_dw100"
    if "dx100" in text:
        return "biwin_dx100"
    if "hx100" in text:
        return "biwin_hx100"
    for family in ["星刃", "白刃", "黑刃", "银爵", "黑爵"]:
        if family in text:
            return f"kingbank_{family}"
    return ""


def _ram_visual_flags(value: Any) -> str:
    text = _normalize_match_text(value)
    flags = []
    if "无灯" in text or "lpx" in text:
        flags.append("no_rgb")
    elif "灯" in text or "rgb" in text or "皇家戟" in text or "幻锋戟" in text or "幻风戟" in text:
        flags.append("rgb")
    if "白" in text or "white" in text:
        flags.append("white")
    if "银" in text or "silver" in text:
        flags.append("silver")
    if "黑" in text or "black" in text:
        flags.append("black")
    return "+".join(sorted(set(flags)))


def _ram_appearance_key(brand: str, value: Any) -> tuple[str, str, str] | None:
    family = _ram_appearance_family(value)
    if not family:
        return None
    return ("ram", _normalize_match_text(brand), f"{family}:{_ram_visual_flags(value)}")


def _fan_appearance_family(value: Any) -> str:
    text = _normalize_match_text(value)
    if not text:
        return ""
    has_140 = "140" in text
    has_120 = "120" in text or not has_140
    has_lcd = "lcd" in text or "屏幕" in text or "带屏" in text
    if has_lcd and not ("tl" in text or "4代" in text):
        return "lianli_lcd140" if has_140 else "lianli_lcd120"
    if "cl" in text and has_120:
        return "lianli_cl120"
    if "slinf" in text or "infinity" in text or "积木风扇3代" in text or "3代无线" in text:
        return "lianli_slinf140" if has_140 else "lianli_slinf120"
    if "sl140" in text:
        return "lianli_sl140"
    if "sl120" in text:
        return "lianli_sl120"
    if "tl" in text or "4代" in text:
        if has_lcd:
            return "lianli_tl_lcd140" if has_140 else "lianli_tl_lcd120"
        return "lianli_tl140" if has_140 else "lianli_tl120"
    return ""


def _fan_visual_flags(value: Any) -> str:
    text = _normalize_match_text(value)
    flags = []
    if "白" in text or "white" in text:
        flags.append("white")
    if "黑" in text or "black" in text:
        flags.append("black")
    if "反叶" in text or "reverse" in text:
        flags.append("reverse")
    return "+".join(sorted(set(flags)))


def _fan_appearance_key(brand: str, value: Any) -> tuple[str, str, str] | None:
    family = _fan_appearance_family(value)
    if not family:
        return None
    return ("fan", _normalize_match_text(brand), f"{family}:{_fan_visual_flags(value)}")


def _product_appearance_key(product: Dict[str, Any]) -> tuple[str, str, str] | None:
    category = str(product.get("category") or "")
    brand = str(product.get("brand") or "")
    model = product.get("model")
    if category == "ram":
        return _ram_appearance_key(brand, model)
    if category == "fan":
        return _fan_appearance_key(brand, model)
    return None


def _asset_appearance_keys(asset: Dict[str, Any]) -> set[tuple[str, str, str]]:
    category = str(asset.get("category") or "")
    brand = _asset_brand(asset)
    primary_texts = [asset.get("model_name"), asset.get("buildcores_name")]
    for text in primary_texts:
        key = None
        if category == "ram":
            key = _ram_appearance_key(brand, text)
        elif category == "fan":
            key = _fan_appearance_key(brand, text)
        if key:
            return {key}
    return set()


def _appearance_key_for_category(category: str, brand: str, value: Any) -> tuple[str, str, str] | None:
    if category == "ram":
        return _ram_appearance_key(brand, value)
    if category == "fan":
        return _fan_appearance_key(brand, value)
    return None


def _asset_example_match_keys(asset: Dict[str, Any]) -> set[tuple[str, str, str]]:
    category = str(asset.get("category") or "")
    brand = _normalize_match_text(_asset_brand(asset))
    if not category or not brand:
        return set()
    keys = set()
    for example in _split_model_examples(asset.get("local_product_examples")):
        normalized = _normalize_match_text(example)
        if normalized:
            keys.add((category, brand, normalized))
        if category == "mainboard":
            for loose_key in _mainboard_model_keys(example):
                keys.add((category, brand, loose_key))
    return keys


def _relation_label(relation: str) -> tuple[str, str, int]:
    if relation == "exact":
        return "精准可用", "模型型号与后台型号一致", 95
    if relation == "appearance":
        return "同外观可用", "同品牌同外观系列，容量、频率、时序不影响外观", 90
    return "相似复用", "后台人工选择的相似模型", 82


def _manual_link_product(product: Dict[str, Any], asset: Dict[str, Any], relation: str = "exact") -> Dict[str, Any]:
    asset_label = _model_asset_label(asset)
    product_category = product.get("category") or ""
    asset_category = asset.get("category") or ""
    category_risk = ""
    if product_category and asset_category and product_category != asset_category:
        category_risk = f"模型分类 {asset_category} 与产品分类 {product_category} 不一致，请复核"
    match_label, reason_text, confidence = _relation_label(relation)
    served_model_url = f"/api/pc3d/model-file/{asset.get('asset_id')}" if _resolve_model_file(asset) else ""

    return {
        **product,
        "asset_id": asset.get("asset_id") or "",
        "asset_label": asset_label,
        "asset_source_name": asset.get("buildcores_name") or asset_label,
        "asset_model_url": served_model_url or asset.get("model_url") or asset.get("interactive_model_url") or "",
        "asset_model_available": bool(served_model_url),
        "match_kind": "exact",
        "match_label": match_label,
        "model_relation": relation,
        "review_status": "manual_approved",
        "confidence": max(float(product.get("confidence") or 0), confidence),
        "reason": f"后台手动关联模型：{asset_label}（{reason_text}）",
        "risk": category_risk,
    }


def _mapping_with_model_availability(mapping: Dict[str, Any], catalog: Dict[str, Any]) -> Dict[str, Any]:
    assets_by_id = {str(asset.get("asset_id") or ""): asset for asset in catalog.get("assets", [])}
    products = []
    for product in mapping.get("products", []):
        asset_id = str(product.get("asset_id") or "")
        next_product = {**product}
        if asset_id:
            asset = assets_by_id.get(asset_id)
            if asset:
                model_file = _model_file_metadata(asset)
                next_product["asset_model_available"] = bool(model_file["served_model_available"])
                if model_file["served_model_available"]:
                    next_product["asset_model_url"] = model_file["served_model_url"]
            else:
                next_product["asset_model_available"] = False
        else:
            next_product["asset_model_available"] = False
        next_product["customer_visible_3d"] = bool(
            next_product.get("match_kind") == "exact"
            and next_product.get("review_status") in {"auto_exact", "manual_approved"}
            and next_product.get("asset_id")
            and next_product.get("asset_model_available")
        )
        products.append(next_product)
    return {**mapping, "products": products}


def _model_catalog_with_review(mapping: Dict[str, Any], catalog: Dict[str, Any], review: Dict[str, Any]) -> Dict[str, Any]:
    products_by_id = {str(product.get("product_id")): product for product in mapping.get("products", []) if product.get("product_id")}
    product_links_by_asset: Dict[str, list[Dict[str, Any]]] = {}
    for product in mapping.get("products", []):
        asset_id = str(product.get("asset_id") or "")
        if not asset_id:
            continue
        product_links_by_asset.setdefault(asset_id, []).append({
            "product_id": product.get("product_id"),
            "category": product.get("category"),
            "category_label": product.get("category_label"),
            "brand": product.get("brand"),
            "model": product.get("model"),
            "price": product.get("price"),
            "relation": product.get("match_label") or product.get("match_kind") or "正式映射",
            "source": "published",
        })

    reviewed_assets = review.get("assets") or {}
    by_status = {"linked": 0, "unlinked": 0, "excluded": 0}
    by_category: Dict[str, Dict[str, int]] = {}
    assets = []

    for asset in catalog.get("assets", []):
        asset_id = str(asset.get("asset_id") or "")
        item_review = reviewed_assets.get(asset_id) or {}
        draft_links = []
        for link in item_review.get("links") or []:
            product = products_by_id.get(str(link.get("product_id") or ""))
            draft_links.append({
                "product_id": link.get("product_id"),
                "category": product.get("category") if product else "",
                "category_label": product.get("category_label") if product else "",
                "brand": product.get("brand") if product else "",
                "model": product.get("model") if product else "",
                "price": product.get("price") if product else 0,
                "relation": link.get("relation") or "similar",
                "source": "review",
                "linked_at": link.get("linked_at"),
            })
        published_links = product_links_by_asset.get(asset_id, [])
        linked_products = published_links + draft_links
        review_status = "excluded" if item_review.get("status") == "excluded" else ("linked" if linked_products else "unlinked")
        category = asset.get("category") or "unknown"
        by_status[review_status] = by_status.get(review_status, 0) + 1
        by_category.setdefault(category, {"linked": 0, "unlinked": 0, "excluded": 0})
        by_category[category][review_status] = by_category[category].get(review_status, 0) + 1
        model_file = _model_file_metadata(asset)
        external_model_url = asset.get("model_url") or asset.get("interactive_model_url") or ""
        assets.append({
            **asset,
            **model_file,
            "external_model_url": external_model_url,
            "model_url": model_file["served_model_url"] if model_file["served_model_available"] else external_model_url,
            "review_status": review_status,
            "linked_count": len(linked_products),
            "linked_products": linked_products,
            "excluded_reason": item_review.get("reason") or "",
            "review_updated_at": item_review.get("updated_at") or "",
        })

    return {
        **catalog,
        "assets": assets,
        "total_assets": len(assets),
        "summary": {
            "by_status": by_status,
            "by_category": by_category,
        },
    }


def _category_sync(mapping: Dict[str, Any], catalog: Dict[str, Any] | None = None) -> Dict[str, Any]:
    assets = (catalog or {}).get("assets") or mapping.get("assets", [])
    products = mapping.get("products", [])
    assets_by_id = {asset.get("asset_id"): asset for asset in assets}
    asset_category_counts: Dict[str, int] = {}
    product_category_rows: Dict[str, Dict[str, Any]] = {}

    for asset in assets:
        category = asset.get("category") or "unknown"
        asset_category_counts[category] = asset_category_counts.get(category, 0) + 1

    for product in products:
        category = product.get("category") or "unknown"
        row = product_category_rows.setdefault(category, {
            "product_category": category,
            "product_category_label": product.get("category_label") or category,
            "product_count": 0,
            "linked_count": 0,
            "unmapped_count": 0,
            "asset_categories": {},
            "asset_count": asset_category_counts.get(category, 0),
        })
        row["product_count"] += 1
        if product.get("asset_id"):
            row["linked_count"] += 1
            asset = assets_by_id.get(product.get("asset_id")) or {}
            asset_category = asset.get("category") or product.get("category") or "unknown"
            row["asset_categories"][asset_category] = row["asset_categories"].get(asset_category, 0) + 1
        else:
            row["unmapped_count"] += 1

    rows = list(product_category_rows.values())
    rows.sort(key=lambda row: row["product_category_label"])
    return {
        "rows": rows,
        "asset_category_counts": asset_category_counts,
        "product_category_count": len(product_category_rows),
        "asset_category_count": len(asset_category_counts),
    }


def _draft_links_by_product(review: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    links_by_product: Dict[str, Dict[str, Any]] = {}
    for asset_id, item_review in (review.get("assets") or {}).items():
        for link in item_review.get("links") or []:
            product_id = str(link.get("product_id") or "")
            if product_id:
                links_by_product[product_id] = {**link, "asset_id": str(asset_id)}
    return links_by_product


def _asset_summary(asset: Dict[str, Any] | None) -> Dict[str, Any] | None:
    if not asset:
        return None
    return {
        "asset_id": asset.get("asset_id") or "",
        "category": asset.get("category") or "",
        "brand": _asset_brand(asset),
        "label": _model_asset_label(asset),
        "model_name": asset.get("model_name") or "",
        "buildcores_name": asset.get("buildcores_name") or "",
    }


def _add_index_candidate(
    index: Dict[tuple[str, str, str], list[Dict[str, Any]]],
    key: tuple[str, str, str] | None,
    asset: Dict[str, Any],
    relation: str,
    priority: int,
    reason: str,
) -> None:
    if not key or not all(key):
        return
    index.setdefault(key, []).append({
        "asset": asset,
        "relation": relation,
        "priority": priority,
        "reason": reason,
    })


def _build_match_indexes(catalog: Dict[str, Any], review: Dict[str, Any]) -> Dict[str, Dict[tuple[str, str, str], list[Dict[str, Any]]]]:
    indexes: Dict[str, Dict[tuple[str, str, str], list[Dict[str, Any]]]] = {
        "exact": {},
        "example": {},
        "appearance": {},
    }
    excluded_assets = review.get("assets") or {}
    for asset in catalog.get("assets", []):
        asset_id = str(asset.get("asset_id") or "")
        if excluded_assets.get(asset_id, {}).get("status") == "excluded":
            continue
        if not _resolve_model_file(asset):
            continue

        base_exact_keys = _asset_exact_match_keys(asset)
        base_loose_keys = _asset_mainboard_loose_keys(asset)
        for key in base_exact_keys:
            _add_index_candidate(indexes["exact"], key, asset, "exact", 0, "模型名称与后台型号完全一致")
        for key in base_loose_keys:
            _add_index_candidate(indexes["exact"], key, asset, "exact", 1, "主板型号归一后一致，已忽略品牌、WiFi、DDR、版号等非外观噪音")

        base_appearance_keys = _asset_appearance_keys(asset)
        for key in _asset_example_match_keys(asset):
            category = key[0]
            relation = "appearance" if category in {"ram", "fan"} else "exact"
            priority = 1 if category in {"ram", "fan"} else 0
            reason = "模型库本地示例命中，同品牌同外观复用" if relation == "appearance" else "模型库本地示例命中，型号归一后一致"
            if relation == "appearance":
                example_text = next((example for example in _split_model_examples(asset.get("local_product_examples")) if _normalize_match_text(example) == key[2]), "")
                example_appearance_key = _appearance_key_for_category(category, _asset_brand(asset), example_text)
                if example_appearance_key not in base_appearance_keys:
                    continue
            elif category == "mainboard" and key not in base_exact_keys and key not in base_loose_keys:
                continue
            elif category != "mainboard" and key not in base_exact_keys:
                continue
            _add_index_candidate(indexes["example"], key, asset, relation, priority, reason)

        for key in _asset_appearance_keys(asset):
            _add_index_candidate(indexes["appearance"], key, asset, "appearance", 2, "同品牌同外观系列，忽略容量、频率、时序等非外观参数")

    return indexes


def _candidate_rank(product: Dict[str, Any], candidate: Dict[str, Any]) -> tuple[int, int]:
    priority = int(candidate.get("priority", 99))
    if str(product.get("category") or "") == "mainboard":
        # Mainboard matching is intentionally loose by model family, but WiFi7,
        # white/black, and DDR generation still distinguish otherwise similar SKUs.
        return (_mainboard_feature_penalty(product, candidate.get("asset") or {}), priority)
    return (priority, 0)


def _best_candidates(product: Dict[str, Any], candidates: list[Dict[str, Any]]) -> tuple[list[Dict[str, Any]], bool]:
    by_asset: Dict[str, Dict[str, Any]] = {}
    for candidate in candidates:
        asset_id = str(candidate.get("asset", {}).get("asset_id") or "")
        if not asset_id:
            continue
        previous = by_asset.get(asset_id)
        if not previous or _candidate_rank(product, candidate) < _candidate_rank(product, previous):
            by_asset[asset_id] = candidate
    if not by_asset:
        return [], False
    ranked = sorted(by_asset.values(), key=lambda candidate: (
        _candidate_rank(product, candidate),
        _model_asset_label(candidate.get("asset") or {}),
    ))
    best_rank = _candidate_rank(product, ranked[0])
    best = [candidate for candidate in ranked if _candidate_rank(product, candidate) == best_rank]
    if len(best) > 1 and all(candidate.get("relation") == "appearance" for candidate in best):
        best.sort(key=lambda candidate: _model_asset_label(candidate.get("asset") or {}))
        return [best[0]], False
    return best, len(best) > 1


def _match_suggestion_rows(mapping: Dict[str, Any], catalog: Dict[str, Any], review: Dict[str, Any]) -> Dict[str, Any]:
    assets_by_id = {str(asset.get("asset_id") or ""): asset for asset in catalog.get("assets", [])}
    review_links = _draft_links_by_product(review)
    indexes = _build_match_indexes(catalog, review)
    rows = []
    summary = {
        "total": 0,
        "direct": 0,
        "replace_candidate": 0,
        "review_conflict": 0,
        "existing": 0,
        "ambiguous": 0,
        "by_category": {},
        "by_relation": {},
    }

    for product in mapping.get("products", []):
        product_id = str(product.get("product_id") or "")
        category = str(product.get("category") or "")
        if not product_id or not category:
            continue

        candidates: list[Dict[str, Any]] = []
        for exact_key in _product_match_keys(product):
            candidates.extend(indexes["exact"].get(exact_key) or [])
            candidates.extend(indexes["example"].get(exact_key) or [])
        appearance_key = _product_appearance_key(product)
        if appearance_key:
            candidates.extend(indexes["appearance"].get(appearance_key) or [])

        best, ambiguous = _best_candidates(product, candidates)
        if not best:
            continue

        current_asset_id = str(product.get("asset_id") or "")
        current_asset = assets_by_id.get(current_asset_id)
        draft_link = review_links.get(product_id)
        draft_asset_id = str(draft_link.get("asset_id") or "") if draft_link else ""

        if ambiguous:
            status = "ambiguous"
            suggested = best[0]
        else:
            suggested = best[0]
            suggested_asset_id = str(suggested["asset"].get("asset_id") or "")
            if current_asset_id and current_asset_id == suggested_asset_id:
                status = "review_conflict" if draft_asset_id and draft_asset_id != suggested_asset_id else "existing"
            elif draft_asset_id and draft_asset_id != suggested_asset_id:
                status = "review_conflict"
            elif current_asset_id and current_asset_id != suggested_asset_id:
                status = "replace_candidate"
            else:
                status = "direct"

        relation = suggested.get("relation") or "similar"
        row = {
            "status": status,
            "product_id": product.get("product_id"),
            "category": product.get("category"),
            "category_label": product.get("category_label"),
            "brand": product.get("brand"),
            "model": product.get("model"),
            "price": product.get("price"),
            "current_asset": _asset_summary(current_asset),
            "draft_asset": _asset_summary(assets_by_id.get(draft_asset_id)),
            "suggested_asset": _asset_summary(suggested.get("asset")),
            "relation": relation,
            "reason": suggested.get("reason") or "",
            "confidence": _relation_label(relation)[2],
            "options": [_asset_summary(candidate.get("asset")) for candidate in best[:6]],
        }
        rows.append(row)

        summary["total"] += 1
        summary[status] = summary.get(status, 0) + 1
        category_counts = summary["by_category"].setdefault(category, {})
        category_counts[status] = category_counts.get(status, 0) + 1
        relation_counts = summary["by_relation"]
        relation_counts[relation] = relation_counts.get(relation, 0) + 1

    status_order = {"replace_candidate": 0, "review_conflict": 1, "direct": 2, "ambiguous": 3, "existing": 4}
    relation_order = {"exact": 0, "appearance": 1, "similar": 2}
    rows.sort(key=lambda row: (
        status_order.get(str(row.get("status")), 99),
        categorySortKey(str(row.get("category") or "")),
        relation_order.get(str(row.get("relation")), 9),
        f"{row.get('brand') or ''}{row.get('model') or ''}",
    ))
    return {"summary": summary, "suggestions": rows}


def categorySortKey(category: str) -> int:
    order = ["case", "mainboard", "gpu", "cooling", "power", "fan", "ram"]
    try:
        return order.index(category)
    except ValueError:
        return 99


def _remove_review_links_for_product(review: Dict[str, Any], product_id: str) -> None:
    for asset_id, item_review in list((review.get("assets") or {}).items()):
        before = item_review.get("links") or []
        links = [link for link in before if str(link.get("product_id") or "") != str(product_id)]
        if len(links) != len(before):
            review["assets"][asset_id] = {
                **item_review,
                "links": links,
                "updated_at": _timestamp(),
            }
    review["updated_at"] = _timestamp()


def _append_review_link(review: Dict[str, Any], asset_id: str, product_id: str, relation: str, admin_name: str, auto_key: str = "") -> bool:
    review.setdefault("assets", {})
    for existing_asset_id, existing_review in list(review.get("assets", {}).items()):
        if str(existing_asset_id) == str(asset_id):
            continue
        before_links = existing_review.get("links") or []
        next_links = [link for link in before_links if str(link.get("product_id") or "") != str(product_id)]
        if len(next_links) != len(before_links):
            review["assets"][existing_asset_id] = {
                **existing_review,
                "links": next_links,
                "updated_at": _timestamp(),
            }

    item_review = review["assets"].get(asset_id) or {}
    links = item_review.get("links") or []
    existing_index = next((index for index, link in enumerate(links) if str(link.get("product_id")) == str(product_id)), -1)
    next_link = {
        "product_id": product_id,
        "relation": relation,
        "linked_at": _timestamp(),
        "admin": admin_name,
    }
    if auto_key:
        next_link[auto_key] = True
    if existing_index >= 0:
        if links[existing_index].get("relation") == relation:
            return False
        links[existing_index] = {**links[existing_index], **next_link}
    else:
        links.append(next_link)
    review["assets"][asset_id] = {
        **item_review,
        "status": "active",
        "links": links,
        "updated_at": _timestamp(),
    }
    review["updated_at"] = _timestamp()
    return True


def _save(mapping: Dict[str, Any], decisions: Dict[str, Any]) -> None:
    _recalculate_mapping(mapping)
    _write_json(_mapping_path(), mapping)
    _write_json(_decisions_path(), decisions)


@router.get("/mapping")
def get_mapping() -> Dict[str, Any]:
    mapping = _read_mapping()
    catalog = _read_model_catalog()
    decisions = _read_decisions()
    enriched_mapping = _mapping_with_model_availability(mapping, catalog)
    return {
        **enriched_mapping,
        "decisions": decisions.get("decisions", {}),
            "category_sync": _category_sync(enriched_mapping, catalog),
        "data_dir": str(_pc3d_data_dir()),
    }


@router.get("/model-catalog")
def get_model_catalog() -> Dict[str, Any]:
    mapping = _read_mapping()
    catalog = _read_model_catalog()
    review = _read_model_review()
    return {
        **_model_catalog_with_review(mapping, catalog, review),
        "data_dir": str(_pc3d_data_dir()),
    }


@router.get("/model-match-suggestions")
def get_model_match_suggestions() -> Dict[str, Any]:
    mapping = _read_mapping()
    catalog = _read_model_catalog()
    review = _read_model_review()
    return {
        **_match_suggestion_rows(mapping, catalog, review),
        "data_dir": str(_pc3d_data_dir()),
    }


@router.get("/model-file/{asset_id}")
def get_model_file(asset_id: str):
    catalog = _read_model_catalog()
    asset = next((item for item in catalog.get("assets", []) if str(item.get("asset_id")) == str(asset_id)), None)
    if not asset:
        raise HTTPException(status_code=404, detail="找不到 3D 模型")

    model_path = _resolve_model_file(asset)
    if not model_path:
        raise HTTPException(status_code=404, detail="这个模型的本地 GLB 文件还没有同步到服务器")

    return FileResponse(
        model_path,
        media_type="model/gltf-binary",
        filename=f"{asset_id}.glb",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/sync-defaults")
def sync_defaults(admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    decisions = _read_decisions()
    changed = 0

    for product in mapping.get("products", []):
        if not product.get("asset_id"):
            continue
        if product.get("category") == "case" and product.get("review_status") != "auto_exact":
            continue
        if product.get("match_kind") == "exact" and product.get("review_status") in {"auto_exact", "manual_approved"}:
            continue
        _record_decision(decisions, "approved", product)
        product.update(_mark_approved(product))
        changed += 1

    for product_id, decision in list((decisions.get("decisions") or {}).items()):
        if decision.get("action") != "rejected":
            continue
        original = decision.get("original") or {}
        if not original.get("asset_id"):
            continue
        if original.get("category") == "case" and original.get("review_status") != "auto_exact":
            continue
        index = _find_product_index(mapping, product_id)
        next_product = _mark_approved(original)
        mapping["products"][index] = next_product
        _record_decision(decisions, "approved", next_product, original=original)
        changed += 1

    mapping["policy"] = (
        "Default-link confirmed non-case 3D assets only. Case candidates stay in needs_review until an admin confirms them, "
        "so the customer page falls back to product images instead of showing a questionable case model."
    )
    _save(mapping, decisions)
    return {"ok": True, "changed": changed, "summary": mapping["summary"], "admin": admin.username}


@router.post("/approve")
def approve_product(request: ProductIdRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    decisions = _read_decisions()
    index = _find_product_index(mapping, request.product_id)
    product = mapping["products"][index]
    if not product.get("asset_id"):
        raise HTTPException(status_code=400, detail="这个产品没有候选模型，不能标记可用")
    _record_decision(decisions, "approved", product)
    mapping["products"][index] = _mark_approved(product, reason_prefix="后台审核确认可用")
    _save(mapping, decisions)
    return {"ok": True, "product": mapping["products"][index], "admin": admin.username}


@router.post("/link")
def link_asset_to_product(request: AssetProductLinkRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    decisions = _read_decisions()
    asset = _find_asset(mapping, request.asset_id)
    index = _find_product_index(mapping, request.product_id)
    original = mapping["products"][index]
    next_product = _manual_link_product(original, asset)
    mapping["products"][index] = next_product
    _record_decision(decisions, "approved", next_product, original=original)
    _save(mapping, decisions)
    return {"ok": True, "product": next_product, "asset": asset, "admin": admin.username}


@router.post("/model-link")
def link_model_for_review(request: ModelLinkRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    catalog = _read_model_catalog()
    review = _read_model_review()
    asset = _find_asset(mapping, request.asset_id)
    product_index = _find_product_index(mapping, request.product_id)
    product = mapping["products"][product_index]
    relation = request.relation if request.relation in {"exact", "appearance", "similar"} else "similar"
    asset_id = str(asset.get("asset_id") or request.asset_id)
    _append_review_link(review, asset_id, str(product.get("product_id") or request.product_id), relation, admin.username)
    _write_json(_model_review_path(), review)
    return {
        "ok": True,
        "asset": asset,
        "product": product,
        "relation": relation,
        "catalog": _model_catalog_with_review(mapping, catalog, review)["summary"],
        "admin": admin.username,
    }


@router.post("/model-replace-product-asset")
def replace_product_model_asset(request: ModelLinkRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    decisions = _read_decisions()
    review = _read_model_review()
    asset = _find_asset(mapping, request.asset_id)
    index = _find_product_index(mapping, request.product_id)
    original = mapping["products"][index]
    relation = request.relation if request.relation in {"exact", "appearance", "similar"} else "appearance"
    next_product = _manual_link_product(original, asset, relation=relation)
    mapping["products"][index] = next_product
    _record_decision(decisions, "approved", next_product, original=original)
    _remove_review_links_for_product(review, str(request.product_id))
    _save(mapping, decisions)
    _write_json(_model_review_path(), review)
    return {
        "ok": True,
        "product": next_product,
        "asset": asset,
        "relation": relation,
        "admin": admin.username,
    }


@router.post("/model-auto-link-exact")
def auto_link_exact_models(admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    catalog = _read_model_catalog()
    review = _read_model_review()
    review.setdefault("assets", {})

    asset_candidates_by_key: Dict[tuple[str, str, str], list[Dict[str, Any]]] = {}
    for asset in catalog.get("assets", []):
        if (review.get("assets") or {}).get(str(asset.get("asset_id") or ""), {}).get("status") == "excluded":
            continue
        if not _resolve_model_file(asset):
            continue
        for key in _asset_exact_match_keys(asset):
            asset_candidates_by_key.setdefault(key, []).append(asset)

    existing_review_links: Dict[str, str] = {}
    for asset_id, item_review in (review.get("assets") or {}).items():
        for link in item_review.get("links") or []:
            product_id = str(link.get("product_id") or "")
            if product_id:
                existing_review_links[product_id] = str(asset_id)

    linked = 0
    upgraded = 0
    skipped_existing = 0
    skipped_conflict = 0
    skipped_ambiguous = 0
    by_category: Dict[str, int] = {}
    examples = []

    for product in mapping.get("products", []):
        product_id = str(product.get("product_id") or "")
        key = (
            str(product.get("category") or ""),
            _normalize_match_text(product.get("brand")),
            _normalize_match_text(product.get("model")),
        )
        if not product_id or not all(key):
            continue

        candidates = asset_candidates_by_key.get(key) or []
        if len(candidates) > 1:
            skipped_ambiguous += 1
            continue
        if not candidates:
            continue

        asset = candidates[0]
        asset_id = str(asset.get("asset_id") or "")
        published_asset_id = str(product.get("asset_id") or "")
        if published_asset_id and published_asset_id != asset_id:
            skipped_conflict += 1
            continue

        existing_asset_id = existing_review_links.get(product_id)
        if existing_asset_id and existing_asset_id != asset_id:
            skipped_conflict += 1
            continue

        item_review = review["assets"].get(asset_id) or {}
        links = item_review.get("links") or []
        existing_index = next((index for index, link in enumerate(links) if str(link.get("product_id")) == product_id), -1)
        if existing_index >= 0:
            if links[existing_index].get("relation") == "exact":
                skipped_existing += 1
                continue
            links[existing_index] = {
                **links[existing_index],
                "relation": "exact",
                "linked_at": _timestamp(),
                "admin": admin.username,
                "auto_exact": True,
            }
            upgraded += 1
        else:
            links.append({
                "product_id": product.get("product_id"),
                "relation": "exact",
                "linked_at": _timestamp(),
                "admin": admin.username,
                "auto_exact": True,
            })
            existing_review_links[product_id] = asset_id
            linked += 1

        review["assets"][asset_id] = {
            **item_review,
            "status": "active",
            "links": links,
            "updated_at": _timestamp(),
        }
        category = str(product.get("category") or "unknown")
        by_category[category] = by_category.get(category, 0) + 1
        if len(examples) < 12:
            examples.append({
                "asset_id": asset_id,
                "product_id": product.get("product_id"),
                "category": category,
                "brand": product.get("brand"),
                "model": product.get("model"),
            })

    review["updated_at"] = _timestamp()
    _write_json(_model_review_path(), review)
    return {
        "ok": True,
        "linked": linked,
        "upgraded": upgraded,
        "skipped_existing": skipped_existing,
        "skipped_conflict": skipped_conflict,
        "skipped_ambiguous": skipped_ambiguous,
        "by_category": by_category,
        "examples": examples,
        "catalog": _model_catalog_with_review(mapping, catalog, review)["summary"],
        "admin": admin.username,
    }


@router.post("/model-auto-link-smart")
def auto_link_smart_models(admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    decisions = _read_decisions()
    catalog = _read_model_catalog()
    review = _read_model_review()
    assets_by_id = {str(asset.get("asset_id") or ""): asset for asset in catalog.get("assets", [])}
    suggestions = _match_suggestion_rows(mapping, catalog, review)
    linked = 0
    replaced = 0
    skipped_existing = 0
    skipped_conflict = 0
    skipped_ambiguous = 0
    skipped_replace_candidate = 0
    skipped_non_exact = 0
    by_category: Dict[str, int] = {}
    by_relation: Dict[str, int] = {}
    examples = []

    for suggestion in suggestions.get("suggestions") or []:
        status = suggestion.get("status")
        relation = str(suggestion.get("relation") or "similar")
        asset = suggestion.get("suggested_asset") or {}
        asset_id = str(asset.get("asset_id") or "")
        product_id = str(suggestion.get("product_id") or "")
        if not asset_id or not product_id:
            continue
        if status == "existing":
            skipped_existing += 1
            continue
        if status == "ambiguous":
            skipped_ambiguous += 1
            continue
        if status == "replace_candidate":
            skipped_replace_candidate += 1
            continue
        if relation != "exact":
            skipped_non_exact += 1
            continue

        category = str(suggestion.get("category") or "unknown")
        if status == "direct":
            asset = assets_by_id.get(asset_id)
            if not asset:
                skipped_conflict += 1
                continue
            try:
                product_index = _find_product_index(mapping, product_id)
            except HTTPException:
                skipped_conflict += 1
                continue
            original = mapping["products"][product_index]
            if str(original.get("asset_id") or "") == asset_id:
                skipped_existing += 1
                continue
            next_product = _manual_link_product(original, asset, relation=relation)
            reason_text = _relation_label(relation)[1]
            next_product["reason"] = f"后台智能发布精确模型：{_model_asset_label(asset)}（{reason_text}）"
            mapping["products"][product_index] = next_product
            _record_decision(decisions, "approved", next_product, original=original)
            _remove_review_links_for_product(review, product_id)
            linked += 1
            action = "published"
        else:
            if status == "review_conflict":
                skipped_conflict += 1
            continue

        by_category[category] = by_category.get(category, 0) + 1
        by_relation[relation] = by_relation.get(relation, 0) + 1
        if len(examples) < 12:
            examples.append({
                "action": action,
                "asset_id": asset_id,
                "product_id": product_id,
                "category": category,
                "brand": suggestion.get("brand"),
                "model": suggestion.get("model"),
                "relation": relation,
            })

    _save(mapping, decisions)
    _write_json(_model_review_path(), review)
    next_catalog = _model_catalog_with_review(mapping, catalog, review)
    next_suggestions = _match_suggestion_rows(mapping, catalog, review)
    return {
        "ok": True,
        "linked": linked,
        "replaced": replaced,
        "skipped_existing": skipped_existing,
        "skipped_conflict": skipped_conflict,
        "skipped_ambiguous": skipped_ambiguous,
        "skipped_replace_candidate": skipped_replace_candidate,
        "skipped_non_exact": skipped_non_exact,
        "by_category": by_category,
        "by_relation": by_relation,
        "examples": examples,
        "catalog": next_catalog["summary"],
        "suggestions": next_suggestions["summary"],
        "admin": admin.username,
    }


@router.post("/model-unlink")
def unlink_model_for_review(request: AssetProductLinkRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    catalog = _read_model_catalog()
    review = _read_model_review()
    asset = _find_asset(mapping, request.asset_id)
    product_index = _find_product_index(mapping, request.product_id)
    product = mapping["products"][product_index]
    asset_id = str(asset.get("asset_id") or request.asset_id)
    review.setdefault("assets", {})
    item_review = review["assets"].get(asset_id) or {}
    before_links = item_review.get("links") or []
    links = [link for link in before_links if str(link.get("product_id")) != str(request.product_id)]
    review["assets"][asset_id] = {
        **item_review,
        "status": "active" if item_review.get("status") != "excluded" else item_review.get("status"),
        "links": links,
        "updated_at": _timestamp(),
        "admin": admin.username,
    }
    review["updated_at"] = _timestamp()
    _write_json(_model_review_path(), review)
    return {
        "ok": True,
        "removed": len(before_links) - len(links),
        "asset": asset,
        "product": product,
        "catalog": _model_catalog_with_review(mapping, catalog, review)["summary"],
        "admin": admin.username,
    }


@router.post("/model-exclude")
def exclude_model_asset(request: ModelAssetRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    catalog = _read_model_catalog()
    review = _read_model_review()
    asset = _find_asset(mapping, request.asset_id)
    asset_id = str(asset.get("asset_id") or request.asset_id)
    review.setdefault("assets", {})
    item_review = review["assets"].get(asset_id) or {}
    review["assets"][asset_id] = {
        **item_review,
        "status": "excluded",
        "links": [],
        "reason": "后台模型库手动排除",
        "updated_at": _timestamp(),
        "admin": admin.username,
    }
    review["updated_at"] = _timestamp()
    _write_json(_model_review_path(), review)
    return {
        "ok": True,
        "asset": asset,
        "catalog": _model_catalog_with_review(mapping, catalog, review)["summary"],
        "admin": admin.username,
    }


@router.post("/model-restore")
def restore_model_asset(request: ModelAssetRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    catalog = _read_model_catalog()
    review = _read_model_review()
    asset = _find_asset(mapping, request.asset_id)
    asset_id = str(asset.get("asset_id") or request.asset_id)
    review.setdefault("assets", {})
    item_review = review["assets"].get(asset_id) or {}
    review["assets"][asset_id] = {
        **item_review,
        "status": "active",
        "updated_at": _timestamp(),
        "admin": admin.username,
    }
    review["updated_at"] = _timestamp()
    _write_json(_model_review_path(), review)
    return {
        "ok": True,
        "asset": asset,
        "catalog": _model_catalog_with_review(mapping, catalog, review)["summary"],
        "admin": admin.username,
    }


@router.post("/reject")
def reject_product(request: ProductIdRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    decisions = _read_decisions()
    index = _find_product_index(mapping, request.product_id)
    product = mapping["products"][index]
    if not product.get("asset_id"):
        return {"ok": True, "already_unmapped": True, "product": product, "admin": admin.username}
    _record_decision(decisions, "rejected", product)
    mapping["products"][index] = _mark_rejected(product)
    _save(mapping, decisions)
    return {"ok": True, "product": mapping["products"][index], "admin": admin.username}


@router.post("/restore")
def restore_product(request: ProductIdRequest, admin: User = Depends(get_current_admin)) -> Dict[str, Any]:
    mapping = _read_mapping()
    decisions = _read_decisions()
    decision = (decisions.get("decisions") or {}).get(request.product_id)
    if not decision or not decision.get("original"):
        raise HTTPException(status_code=404, detail="找不到可恢复记录")
    index = _find_product_index(mapping, request.product_id)
    mapping["products"][index] = decision["original"]
    del decisions["decisions"][request.product_id]
    decisions["updated_at"] = _timestamp()
    _save(mapping, decisions)
    return {"ok": True, "product": mapping["products"][index], "admin": admin.username}

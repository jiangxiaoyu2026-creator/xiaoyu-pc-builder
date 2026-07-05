#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server_py.routers import pc3d  # noqa: E402


PUBLIC_DATA_DIR = ROOT / "public" / "data" / "pc3d"
DATA_DIR = ROOT / "data" / "pc3d"


def _copy_json_to_public(filename: str) -> None:
    source = DATA_DIR / filename
    target = PUBLIC_DATA_DIR / filename
    if source.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def _copy_model_file(asset: dict[str, Any]) -> Path:
    asset_id = str(asset.get("asset_id") or "")
    category = str(asset.get("category") or "unknown") or "unknown"
    source = pc3d._resolve_model_file(asset)
    if not source:
        raise FileNotFoundError(f"Missing GLB for {asset_id}")
    target = DATA_DIR / pc3d.MODEL_FILES_DIR / category / f"{asset_id}.glb"
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or target.stat().st_size != source.stat().st_size:
        shutil.copy2(source, target)
    return target


def publish_direct_exact(copy_model_files: bool, sync_public: bool, dry_run: bool) -> dict[str, Any]:
    mapping = pc3d._read_mapping()
    decisions = pc3d._read_decisions()
    catalog = pc3d._read_model_catalog()
    review = pc3d._read_model_review()
    assets_by_id = {str(asset.get("asset_id") or ""): asset for asset in catalog.get("assets", [])}
    suggestions = pc3d._match_suggestion_rows(mapping, catalog, review).get("suggestions") or []

    publishable = [
        suggestion for suggestion in suggestions
        if suggestion.get("status") in {"direct", "replace_candidate"} and suggestion.get("relation") == "exact"
    ]

    copied_assets: dict[str, str] = {}
    examples = []
    linked = 0
    replaced = 0

    for suggestion in publishable:
        asset_id = str((suggestion.get("suggested_asset") or {}).get("asset_id") or "")
        product_id = str(suggestion.get("product_id") or "")
        asset = assets_by_id.get(asset_id)
        if not asset or not product_id:
            continue

        if copy_model_files and asset_id not in copied_assets:
            target = _copy_model_file(asset)
            copied_assets[asset_id] = str(target)

        product_index = pc3d._find_product_index(mapping, product_id)
        original = mapping["products"][product_index]
        if str(original.get("asset_id") or "") == asset_id:
            continue

        next_product = pc3d._manual_link_product(original, asset, relation="exact")
        status = str(suggestion.get("status") or "")
        next_product["reason"] = f"本地脚本发布精确模型：{pc3d._model_asset_label(asset)}（模型型号与后台型号一致）"
        mapping["products"][product_index] = next_product
        pc3d._record_decision(decisions, "approved", next_product, original=original)
        pc3d._remove_review_links_for_product(review, product_id)
        if status == "replace_candidate":
            replaced += 1
        else:
            linked += 1

        if len(examples) < 20:
            examples.append({
                "action": "replaced" if status == "replace_candidate" else "published",
                "category": suggestion.get("category"),
                "brand": suggestion.get("brand"),
                "model": suggestion.get("model"),
                "asset_id": asset_id,
                "asset_label": pc3d._model_asset_label(asset),
            })

    pc3d._recalculate_mapping(mapping)
    summary = {
        "publishable": len(publishable),
        "linked": linked,
        "replaced": replaced,
        "unique_assets_copied": len(copied_assets),
        "copied_bytes": sum(Path(path).stat().st_size for path in copied_assets.values()) if copied_assets else 0,
        "mapping_summary": mapping.get("summary"),
        "examples": examples,
    }

    if dry_run:
        return {"dry_run": True, **summary}

    pc3d._write_json(pc3d._mapping_path(), mapping)
    pc3d._write_json(pc3d._decisions_path(), decisions)
    pc3d._write_json(pc3d._model_review_path(), review)

    if sync_public:
        for filename in [
            pc3d.MAPPING_FILE,
            pc3d.DECISIONS_FILE,
            pc3d.MODEL_CATALOG_FILE,
            pc3d.MODEL_REVIEW_FILE,
            "assets.json",
        ]:
            _copy_json_to_public(filename)

    return {"dry_run": False, **summary}


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish only direct exact PC 3D product-model matches.")
    parser.add_argument("--copy-model-files", action="store_true", help="Copy matching GLB files into data/pc3d/model-files for backend serving.")
    parser.add_argument("--no-sync-public", action="store_true", help="Do not copy JSON data files into public/data/pc3d.")
    parser.add_argument("--dry-run", action="store_true", help="Print the changes without writing JSON files.")
    args = parser.parse_args()

    result = publish_direct_exact(
        copy_model_files=args.copy_model_files,
        sync_public=not args.no_sync_public,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

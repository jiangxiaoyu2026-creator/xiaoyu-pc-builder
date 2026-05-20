#!/usr/bin/env python3
import json
import mimetypes
import os
import time
from pathlib import Path
from typing import Optional

import requests


BASE_URL = os.environ.get("DIYXX_API_BASE", "https://www.diyxx.com/api")
USERNAME = os.environ.get("DIYXX_USERNAME", "xiaoyu")
PASSWORD = os.environ.get("DIYXX_PASSWORD", "")
MANIFEST = Path("product_images_test/pcdiy_downloads/manifest.jsonl")
PROGRESS = Path("product_images_test/pcdiy_downloads/upload_progress.json")
LIMIT = int(os.environ.get("LIMIT", "0"))
OVERWRITE_REAL = os.environ.get("OVERWRITE_REAL", "0") == "1"


def is_missing_or_placeholder(image: Optional[str]) -> bool:
    if not image or image == "null":
        return True
    lowered = image.lower()
    return "bing.com" in lowered or "google.com" in lowered or "search" in lowered


def load_manifest() -> list[dict]:
    rows = []
    with MANIFEST.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                row = json.loads(line)
                if row.get("status") == "downloaded" and row.get("localFile"):
                    rows.append(row)
    return rows


def load_progress() -> dict:
    if not PROGRESS.exists():
        return {"uploaded": {}, "failed": {}, "skipped": {}}
    return json.loads(PROGRESS.read_text(encoding="utf-8"))


def save_progress(progress: dict) -> None:
    PROGRESS.write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")


def login(session: requests.Session) -> dict:
    if not PASSWORD:
        raise RuntimeError("请先设置 DIYXX_PASSWORD 环境变量")
    resp = session.post(
        f"{BASE_URL}/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    return resp.json().get("user", {})


def fetch_online_products(session: requests.Session) -> dict[str, dict]:
    resp = session.get(f"{BASE_URL}/products/admin?page_size=10000", timeout=60)
    resp.raise_for_status()
    return {p["id"]: p for p in resp.json().get("items", [])}


def upload_image(session: requests.Session, file_path: Path) -> str:
    mime = mimetypes.guess_type(file_path.name)[0] or "image/jpeg"
    with file_path.open("rb") as f:
        resp = session.post(
            f"{BASE_URL}/upload/image",
            files={"file": (file_path.name, f, mime)},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.json()["url"]


def patch_product_image(session: requests.Session, product_id: str, image_url: str) -> None:
    resp = session.put(
        f"{BASE_URL}/products/{product_id}",
        json={"image": image_url, "imageSource": "user"},
        timeout=30,
    )
    resp.raise_for_status()


def main() -> None:
    rows = load_manifest()
    progress = load_progress()
    already_uploaded = set(progress.get("uploaded", {}))
    session = requests.Session()
    user = login(session)
    online = fetch_online_products(session)

    candidates = []
    missing_online = 0
    existing_real = 0
    missing_file = 0
    for row in rows:
        pid = row["id"]
        product = online.get(pid)
        if not product:
            missing_online += 1
            progress.setdefault("skipped", {})[pid] = {"reason": "not_found_online", "model": row.get("model")}
            continue
        if pid in already_uploaded:
            continue
        if not OVERWRITE_REAL and not is_missing_or_placeholder(product.get("image")):
            existing_real += 1
            progress.setdefault("skipped", {})[pid] = {
                "reason": "online_already_has_real_image",
                "model": row.get("model"),
                "image": product.get("image"),
            }
            continue
        file_path = Path(row["localFile"])
        if not file_path.exists():
            missing_file += 1
            progress.setdefault("failed", {})[pid] = {"reason": "local_file_missing", "localFile": str(file_path)}
            continue
        candidates.append(row)

    if LIMIT > 0:
        candidates = candidates[:LIMIT]

    ok = 0
    failed = 0
    started = time.time()
    print(json.dumps({
        "user": user.get("username"),
        "online_total": len(online),
        "manifest_downloaded": len(rows),
        "to_upload": len(candidates),
        "already_uploaded": len(already_uploaded),
        "missing_online": missing_online,
        "existing_real_skipped": existing_real,
        "missing_file": missing_file,
        "overwrite_real": OVERWRITE_REAL,
    }, ensure_ascii=False, indent=2))

    for index, row in enumerate(candidates, 1):
        pid = row["id"]
        file_path = Path(row["localFile"])
        try:
            image_url = upload_image(session, file_path)
            patch_product_image(session, pid, image_url)
            progress.setdefault("uploaded", {})[pid] = {
                "model": row.get("model"),
                "category": row.get("category"),
                "localFile": str(file_path),
                "uploadedUrl": image_url,
                "sourceUrl": row.get("sourceUrl"),
                "uploadedAt": int(time.time()),
            }
            progress.get("failed", {}).pop(pid, None)
            ok += 1
        except Exception as exc:
            failed += 1
            progress.setdefault("failed", {})[pid] = {
                "model": row.get("model"),
                "category": row.get("category"),
                "localFile": str(file_path),
                "error": str(exc),
                "failedAt": int(time.time()),
            }
        if index % 10 == 0 or index == len(candidates):
            save_progress(progress)
            elapsed = time.time() - started
            print(f"PROGRESS {index}/{len(candidates)} ok={ok} failed={failed} elapsed={elapsed:.1f}s")

    save_progress(progress)
    print(json.dumps({
        "uploaded_this_run": ok,
        "failed_this_run": failed,
        "uploaded_total": len(progress.get("uploaded", {})),
        "failed_total": len(progress.get("failed", {})),
        "skipped_total": len(progress.get("skipped", {})),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

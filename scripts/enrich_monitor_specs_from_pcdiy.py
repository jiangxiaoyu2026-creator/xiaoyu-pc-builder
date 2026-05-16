#!/usr/bin/env python3
import json
import re
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "xiaoyu.db"
SOURCE_PATH = ROOT / "data" / "collected" / "pcdiy_extra_specs_latest.json"

BRAND_ALIASES = {
    "AOC": ["aoc"],
    "HKC": ["hkc"],
    "KTC": ["ktc"],
    "LG": ["lg"],
    "华硕": ["华硕", "asus"],
    "三星": ["三星", "samsung"],
    "小米": ["小米", "redmi", "mi"],
    "飞利浦": ["飞利浦", "philips"],
    "戴尔": ["戴尔", "dell"],
    "卓威": ["卓威", "zowie"],
    "明基": ["明基", "benq"],
    "微星": ["微星", "msi"],
    "泰坦军团": ["泰坦军团"],
    "雷神": ["雷神"],
    "蚂蚁电竞": ["蚂蚁电竞"],
    "优派": ["优派", "viewsonic"],
    "联合创新": ["联合创新", "innocn"],
}

PARAM_MAP = {
    "mianban": "panelType",
    "bili": "aspectRatio",
    "hdr": "hdr",
    "duibi": "contrastRatio",
    "xiangying": "responseTime",
    "jiekou": "ports",
    "liangdu": "brightness",
    "qulv": "curvature",
    "bigua": "vesaMount",
    "yinxiang": "speaker",
    "dizuo": "stand",
    "yanse": "color",
    "seshu": "colorDepth",
    "nengxiao": "energyEfficiency",
    "texing": "features",
    "shouhou": "warranty",
    "zhongliang": "weight",
    "lwh": "dimensions",
    "dianyuan": "powerType",
    "hdmi": "hdmi",
    "dp": "dp",
    "typec": "typec",
    "usb": "usb",
    "vga": "vga",
    "dvi": "dvi",
}

GENERIC_TOKENS = {
    "FAST", "IPS", "OLED", "QDOLED", "HDR", "HDR10", "HDR400", "TYPEC",
    "NANO", "MINI", "LED", "RGB", "MAX", "PRO", "PLUS", "CLASSIC",
}


def parse_specs(raw):
    value = raw
    for _ in range(3):
        if not isinstance(value, str):
            break
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            break
    return value if isinstance(value, dict) else {}


def text_blob(*parts):
    return " ".join(str(part or "") for part in parts)


def norm(text):
    text = str(text or "").lower().replace("×", "x")
    text = re.sub(r"[\s\-_/()（）\[\]【】]+", "", text)
    return re.sub(r"(显示器|电竞|英寸|寸|平面|无边框|曲面|屏|刷新率)", "", text)


def brand_matches(brand, title):
    title = str(title or "").lower()
    aliases = BRAND_ALIASES.get(brand, [str(brand).lower()])
    return any(alias.lower() in title for alias in aliases)


def strong_tokens(model):
    found = []
    for token in re.findall(r"[A-Za-z0-9]+", str(model or "").upper()):
        if token in GENERIC_TOKENS:
            continue
        if re.fullmatch(r"\d+[KGHZTBP]*", token):
            continue
        if len(token) < 4 or not re.search(r"[A-Z]", token) or not re.search(r"\d", token):
            continue
        found.append(token)
    return found


def source_has_token(source_text, token):
    tokens = re.findall(r"[A-Za-z0-9]+", source_text.upper())
    if len(token) == 4:
        return token in tokens
    return any(token in item for item in tokens)


def detect_resolution(*parts):
    text = text_blob(*parts).lower().replace("×", "x")
    if re.search(r"(?<![a-z0-9])5k(?=\d{2,3}(?!\d)|[^a-z0-9]|$)|5120\s*[x*]\s*(1440|2160)|5120", text):
        return "5K"
    if re.search(r"(?<![a-z0-9])4k(?=\d{2,3}(?!\d)|[^a-z0-9]|$)|3840\s*[x*]\s*2160|2160p|uhd", text):
        return "4K"
    if re.search(r"(?<![a-z0-9])2k(?=\d{2,3}(?!\d)|[^a-z0-9]|$)|2560\s*[x*]\s*1440|1440p|qhd", text):
        return "2K"
    if re.search(r"(?<![a-z0-9])1k(?=\d{2,3}(?!\d)|[^a-z0-9]|$)|1920\s*[x*]\s*1080|1080p|fhd", text):
        return "1K"
    return None


def detect_refresh(*parts):
    text = text_blob(*parts)
    values = [int(m.group(1)) for m in re.finditer(r"(\d{2,3})\s*(?:hz|赫兹)", text, re.I)]
    values.extend(int(m.group(1)) for m in re.finditer(r"[1254]k\s*(\d{2,3})(?!\d)", text, re.I))
    return max(values) if values else None


def detect_size(*parts):
    text = text_blob(*parts)
    match = re.search(r"(\d{2}(?:\.\d)?)\s*(?:英寸|寸)", text)
    if match:
        return float(match.group(1))
    for token in re.findall(r"[A-Za-z]*\d{2}[A-Za-z0-9]*", text):
        code = re.search(r"\d{2}", token)
        if not code:
            continue
        value = int(code.group(0))
        if 22 <= value <= 49:
            return float(value)
    return None


def as_size(value):
    if isinstance(value, (int, float)):
        return float(value)
    return detect_size(value)


def as_refresh(value):
    if isinstance(value, (int, float)):
        return int(value)
    return detect_refresh(value)


def compatible(local_specs, local_text, params):
    local_res = detect_resolution(local_text)
    source_res = detect_resolution(params.get("fenbian"), params.get("mingcheng"))
    if local_res and source_res and local_res != source_res:
        return False

    local_size = as_size(local_specs.get("screenSize")) or detect_size(local_text)
    source_size = detect_size(params.get("chicun"), params.get("size"), params.get("mingcheng"))
    if local_size and source_size and abs(float(local_size) - float(source_size)) > 1.1:
        return False

    return True


def find_source(local, sources):
    model = local["model"]
    tokens = strong_tokens(model)
    local_norm = norm(model)
    candidates = []

    for source in sources:
        source_text = text_blob(source.get("title"), source.get("params", {}).get("mingcheng"))
        if not brand_matches(local["brand"], source_text):
            continue
        source_norm = norm(source_text)
        score = 0
        if len(local_norm) >= 8 and local_norm in source_norm:
            score += 100
        token_hits = [token for token in tokens if source_has_token(source_text, token)]
        if token_hits:
            score += 70 + (len(token_hits) * 10)
        if score and compatible(parse_specs(local["specs"]), model, source.get("params", {})):
            candidates.append((score, source))

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1] if candidates else None


def clean_value(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
    return value or None


def build_specs(local, source):
    current = parse_specs(local["specs"])
    params = source.get("params", {}) if source else {}
    model_text = text_blob(local["model"])

    screen_size = as_size(current.get("screenSize")) or detect_size(params.get("chicun"), params.get("size"), model_text)
    detected_resolution = detect_resolution(params.get("fenbian"), current.get("resolutionRaw"), model_text)
    resolution = current.get("resolution")
    skip_current_keys = set()
    if detected_resolution:
        resolution = detected_resolution
    elif resolution == "5K":
        resolution = None
        skip_current_keys.add("resolution")
    refresh = as_refresh(current.get("refreshRate")) or detect_refresh(params.get("shuaxin"), model_text)

    enriched = {}
    if screen_size is not None:
        enriched["screenSize"] = float(screen_size)
    if resolution:
        enriched["resolution"] = resolution
    if refresh is not None:
        enriched["refreshRate"] = int(refresh)

    for key, value in current.items():
        if key in skip_current_keys:
            continue
        if key not in enriched:
            enriched[key] = value

    if params:
        raw_values = {
            "screenSizeRaw": clean_value(params.get("chicun") or params.get("size")),
            "resolutionRaw": clean_value(params.get("fenbian")),
            "refreshRateRaw": clean_value(params.get("shuaxin")),
        }
        for key, value in raw_values.items():
            if value and key not in enriched:
                enriched[key] = value

        for source_key, target_key in PARAM_MAP.items():
            value = clean_value(params.get(source_key))
            if value and target_key not in enriched:
                enriched[target_key] = value

        enriched["pcdiyProductId"] = source.get("id")
        enriched["pcdiyTitle"] = source.get("title")

    return enriched


def main():
    if not DB_PATH.exists():
        raise SystemExit(f"DB not found: {DB_PATH}")
    if not SOURCE_PATH.exists():
        raise SystemExit(f"Source not found: {SOURCE_PATH}")

    data = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    sources = [item for item in data.get("products", []) if item.get("sourceCategory") == "monitor"]

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "select id, brand, model, specs from hardware where category = 'monitor'"
    ).fetchall()

    matched = 0
    updated = 0
    missing_before = {"screenSize": 0, "resolution": 0, "refreshRate": 0}
    missing_after = {"screenSize": 0, "resolution": 0, "refreshRate": 0}

    for row in rows:
        local = dict(row)
        before = parse_specs(local["specs"])
        before_text = text_blob(local["model"], json.dumps(before, ensure_ascii=False))
        for key in missing_before:
            if key not in before or before[key] in ("", None):
                if key == "screenSize" and detect_size(before_text):
                    continue
                if key == "resolution" and detect_resolution(before_text):
                    continue
                if key == "refreshRate" and detect_refresh(before_text):
                    continue
                missing_before[key] += 1

        source = find_source(local, sources)
        if source:
            matched += 1
        after = build_specs(local, source)
        after_text = text_blob(local["model"], json.dumps(after, ensure_ascii=False))
        for key in missing_after:
            if key not in after or after[key] in ("", None):
                if key == "screenSize" and detect_size(after_text):
                    continue
                if key == "resolution" and detect_resolution(after_text):
                    continue
                if key == "refreshRate" and detect_refresh(after_text):
                    continue
                missing_after[key] += 1

        new_specs = json.dumps(after, ensure_ascii=False, separators=(",", ":"))
        if new_specs != local["specs"]:
            conn.execute("update hardware set specs = ? where id = ?", (new_specs, local["id"]))
            updated += 1

    conn.commit()
    conn.close()

    print(json.dumps({
        "localMonitors": len(rows),
        "sourceMonitors": len(sources),
        "matchedSourceRows": matched,
        "updatedRows": updated,
        "missingBefore": missing_before,
        "missingAfter": missing_after,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

from collections import defaultdict, deque
from csv import DictReader
from io import StringIO
from pathlib import Path
from time import monotonic
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "leaderboards" / "outputs"
MAX_LIMIT = 120
MAX_CANDIDATES = 8
RATE_WINDOW_SECONDS = 60
RATE_LIMIT = 120
RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1", "[::1]"}
GPU_COMPOSITE_MIN_FULL_GROUPS = 3
GPU_COMPOSITE_GROUP_FACTORS = {
    1: 0.35,
    2: 0.65,
}

CATEGORIES = [
    {"id": "cpu", "label": "CPU", "shortLabel": "CPU", "description": "桌面与工作站处理器的单核、多核、渲染与综合跑分"},
    {"id": "gpu", "label": "GPU", "shortLabel": "GPU", "description": "显卡理论性能、生产力渲染、3DMark 与游戏帧率"},
    {"id": "soc", "label": "SoC", "shortLabel": "SoC", "description": "手机与移动平台的综合、CPU 与浮点性能排行"},
    {"id": "router", "label": "路由器", "shortLabel": "路由", "description": "路由器芯片性能与 Wi-Fi 世代榜单"},
]

BOARDS = [
    {"id": "cpu-r23-multi", "category": "cpu", "title": "Cinebench R23 多核", "shortTitle": "R23 多核", "file": "topcpu_ranking.csv", "metricLabel": "Cinebench R23 多核", "unit": "pts", "group": "Cinebench", "rows": 713},
    {"id": "cpu-r23-single", "category": "cpu", "title": "Cinebench R23 单核", "shortTitle": "R23 单核", "file": "cpu_cinebench_r23_single.csv", "metricLabel": "Cinebench R23 单核", "unit": "pts", "group": "Cinebench", "rows": 711},
    {"id": "cpu-geekbench6-single", "category": "cpu", "title": "Geekbench 6 单核", "shortTitle": "GB6 单核", "file": "cpu_geekbench6_single.csv", "metricLabel": "Geekbench 6 单核", "unit": "pts", "group": "Geekbench", "rows": 1000},
    {"id": "cpu-geekbench6-multi", "category": "cpu", "title": "Geekbench 6 多核", "shortTitle": "GB6 多核", "file": "cpu_geekbench6_multi.csv", "metricLabel": "Geekbench 6 多核", "unit": "pts", "group": "Geekbench", "rows": 1000},
    {"id": "cpu-cinebench2024-single", "category": "cpu", "title": "Cinebench 2024 单核", "shortTitle": "CB2024 单核", "file": "cpu_cinebench2024_single.csv", "metricLabel": "Cinebench 2024 单核", "unit": "pts", "group": "Cinebench", "rows": 302},
    {"id": "cpu-cinebench2024-multi", "category": "cpu", "title": "Cinebench 2024 多核", "shortTitle": "CB2024 多核", "file": "cpu_cinebench2024_multi.csv", "metricLabel": "Cinebench 2024 多核", "unit": "pts", "group": "Cinebench", "rows": 298},
    {"id": "cpu-cinebench2024-gpu", "category": "cpu", "title": "Cinebench 2024 GPU", "shortTitle": "CB2024 GPU", "file": "cpu_cinebench2024_gpu.csv", "metricLabel": "Cinebench 2024 GPU", "unit": "pts", "group": "Cinebench", "rows": 7},
    {"id": "cpu-cinebench2026-single", "category": "cpu", "title": "Cinebench 2026 单核", "shortTitle": "CB2026 单核", "file": "cpu_cinebench2026_single.csv", "metricLabel": "Cinebench 2026 单核", "unit": "pts", "group": "Cinebench", "rows": 202},
    {"id": "cpu-cinebench2026-multi", "category": "cpu", "title": "Cinebench 2026 多核", "shortTitle": "CB2026 多核", "file": "cpu_cinebench2026_multi.csv", "metricLabel": "Cinebench 2026 多核", "unit": "pts", "group": "Cinebench", "rows": 207},
    {"id": "cpu-blender", "category": "cpu", "title": "Blender CPU", "shortTitle": "Blender", "file": "cpu_blender_cpu.csv", "metricLabel": "Blender CPU", "unit": "pts", "group": "渲染", "rows": 646},
    {"id": "cpu-geekbench5-single", "category": "cpu", "title": "Geekbench 5 单核", "shortTitle": "GB5 单核", "file": "cpu_geekbench5_single.csv", "metricLabel": "Geekbench 5 单核", "unit": "pts", "group": "Geekbench", "rows": 681},
    {"id": "cpu-geekbench5-multi", "category": "cpu", "title": "Geekbench 5 多核", "shortTitle": "GB5 多核", "file": "cpu_geekbench5_multi.csv", "metricLabel": "Geekbench 5 多核", "unit": "pts", "group": "Geekbench", "rows": 681},
    {"id": "cpu-passmark-single", "category": "cpu", "title": "PassMark 单核", "shortTitle": "PassMark 单核", "file": "cpu_passmark_single.csv", "metricLabel": "PassMark 单核", "unit": "pts", "group": "PassMark", "rows": 639},
    {"id": "cpu-passmark-multi", "category": "cpu", "title": "PassMark 多核", "shortTitle": "PassMark 多核", "file": "cpu_passmark_multi.csv", "metricLabel": "PassMark 多核", "unit": "pts", "group": "PassMark", "rows": 639},
    {"id": "gpu-fp32", "category": "gpu", "title": "FP32 浮点性能", "shortTitle": "FP32", "file": "topgpu_ranking.csv", "metricLabel": "FP32 算力", "group": "理论性能", "rows": 1000},
    {"id": "gpu-ai-tops", "category": "gpu", "title": "AI 算力 TOPS", "shortTitle": "AI TOPS", "file": "gpu_ai_tops.csv", "metricLabel": "AI 算力", "unit": "TOPS", "group": "理论性能", "rows": 157},
    {"id": "gpu-timespy", "category": "gpu", "title": "3DMark Time Spy", "shortTitle": "Time Spy", "file": "gpu_3dmark_time_spy.csv", "metricLabel": "3DMark Time Spy", "unit": "pts", "group": "3DMark", "rows": 626},
    {"id": "gpu-timespy-extreme", "category": "gpu", "title": "3DMark Time Spy Extreme", "shortTitle": "Time Spy E", "file": "gpu_3dmark_time_spy_e.csv", "metricLabel": "3DMark Time Spy Extreme", "unit": "pts", "group": "3DMark", "rows": 496},
    {"id": "gpu-speed-way", "category": "gpu", "title": "3DMark Speed Way", "shortTitle": "Speed Way", "file": "gpu_3dmark_speed_way.csv", "metricLabel": "3DMark Speed Way", "unit": "pts", "group": "3DMark", "rows": 223},
    {"id": "gpu-blender", "category": "gpu", "title": "Blender GPU", "shortTitle": "Blender", "file": "gpu_blender.csv", "metricLabel": "Blender GPU", "unit": "pts", "group": "生产力", "rows": 340},
    {"id": "gpu-octanebench", "category": "gpu", "title": "OctaneBench", "shortTitle": "Octane", "file": "gpu_octanebench.csv", "metricLabel": "OctaneBench", "unit": "pts", "group": "生产力", "rows": 195},
    {"id": "gpu-tombraider-2160p", "category": "gpu", "title": "古墓丽影暗影 2160p", "shortTitle": "古墓 4K", "file": "gpu_tombraider_2160p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 119},
    {"id": "gpu-tombraider-1440p", "category": "gpu", "title": "古墓丽影暗影 1440p", "shortTitle": "古墓 2K", "file": "gpu_tombraider_1440p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 120},
    {"id": "gpu-tombraider-1080p", "category": "gpu", "title": "古墓丽影暗影 1080p", "shortTitle": "古墓 1080p", "file": "gpu_tombraider_1080p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 120},
    {"id": "gpu-cyberpunk-2160p", "category": "gpu", "title": "赛博朋克 2077 2160p", "shortTitle": "赛博 4K", "file": "gpu_cyberpunk_2160p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 53},
    {"id": "gpu-cyberpunk-1440p", "category": "gpu", "title": "赛博朋克 2077 1440p", "shortTitle": "赛博 2K", "file": "gpu_cyberpunk_1440p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 58},
    {"id": "gpu-cyberpunk-1080p", "category": "gpu", "title": "赛博朋克 2077 1080p", "shortTitle": "赛博 1080p", "file": "gpu_cyberpunk_1080p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 53},
    {"id": "gpu-bf5-2160p", "category": "gpu", "title": "战地 5 2160p", "shortTitle": "战地 4K", "file": "gpu_bf5_2160p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 77},
    {"id": "gpu-bf5-1440p", "category": "gpu", "title": "战地 5 1440p", "shortTitle": "战地 2K", "file": "gpu_bf5_1440p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 77},
    {"id": "gpu-bf5-1080p", "category": "gpu", "title": "战地 5 1080p", "shortTitle": "战地 1080p", "file": "gpu_bf5_1080p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 80},
    {"id": "gpu-gta5-2160p", "category": "gpu", "title": "GTA5 2160p", "shortTitle": "GTA5 4K", "file": "gpu_gta5_2160p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 89},
    {"id": "gpu-gta5-1440p", "category": "gpu", "title": "GTA5 1440p", "shortTitle": "GTA5 2K", "file": "gpu_gta5_1440p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 94},
    {"id": "gpu-gta5-1080p", "category": "gpu", "title": "GTA5 1080p", "shortTitle": "GTA5 1080p", "file": "gpu_gta5_1080p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 95},
    {"id": "gpu-horizon-1080p", "category": "gpu", "title": "地平线西之绝境 1080p", "shortTitle": "地平线 1080p", "file": "gpu_horizon_1080p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 30},
    {"id": "gpu-horizon-1440p", "category": "gpu", "title": "地平线西之绝境 1440p", "shortTitle": "地平线 2K", "file": "gpu_horizon_1440p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 30},
    {"id": "gpu-horizon-2160p", "category": "gpu", "title": "地平线西之绝境 2160p", "shortTitle": "地平线 4K", "file": "gpu_horizon_2160p.csv", "metricLabel": "平均帧率", "unit": "FPS", "group": "游戏帧率", "rows": 29},
    {"id": "soc-antutu", "category": "soc", "title": "安兔兔 10", "shortTitle": "安兔兔", "file": "soc_antutu.csv", "metricLabel": "安兔兔 10", "unit": "pts", "group": "综合", "rows": 245},
    {"id": "soc-geekbench6-single", "category": "soc", "title": "Geekbench 6 单核", "shortTitle": "GB6 单核", "file": "soc_geekbench6_single.csv", "metricLabel": "Geekbench 6 单核", "unit": "pts", "group": "CPU", "rows": 265},
    {"id": "soc-geekbench6-multi", "category": "soc", "title": "Geekbench 6 多核", "shortTitle": "GB6 多核", "file": "soc_geekbench6_multi.csv", "metricLabel": "Geekbench 6 多核", "unit": "pts", "group": "CPU", "rows": 265},
    {"id": "soc-fp32", "category": "soc", "title": "FP32 浮点", "shortTitle": "FP32", "file": "soc_fp32.csv", "metricLabel": "FP32 浮点", "unit": "pts", "group": "理论性能", "rows": 248},
    {"id": "router-dmips", "category": "router", "title": "DMIPS 总榜", "shortTitle": "DMIPS", "file": "router_dmips.csv", "metricLabel": "DMIPS", "unit": "pts", "group": "芯片性能", "rows": 203},
    {"id": "router-wifi7", "category": "router", "title": "Wi-Fi 7", "shortTitle": "Wi-Fi 7", "file": "router_wifi7.csv", "metricLabel": "Wi-Fi 7", "unit": "pts", "group": "无线规格", "rows": 61},
    {"id": "router-wifi6", "category": "router", "title": "Wi-Fi 6", "shortTitle": "Wi-Fi 6", "file": "router_wifi6.csv", "metricLabel": "Wi-Fi 6", "unit": "pts", "group": "无线规格", "rows": 100},
    {"id": "router-wifi5", "category": "router", "title": "Wi-Fi 5", "shortTitle": "Wi-Fi 5", "file": "router_wifi5.csv", "metricLabel": "Wi-Fi 5", "unit": "pts", "group": "无线规格", "rows": 42},
]

BOARD_BY_ID = {board["id"]: board for board in BOARDS}


class CompareRequest(BaseModel):
    boardId: str
    firstName: str
    secondName: str


class CategoryCompareRequest(BaseModel):
    category: str
    firstName: str = ""
    secondName: str = ""


def _check_rate_limit(request: Request) -> None:
    client_host = request.client.host if request.client else "unknown"
    host_header = request.headers.get("host", "").split(":")[0]
    if client_host in {"127.0.0.1", "::1"} and host_header in LOCAL_HOSTS:
        return

    client_key = request.client.host if request.client else "unknown"
    now = monotonic()
    bucket = RATE_BUCKETS[client_key]

    while bucket and now - bucket[0] > RATE_WINDOW_SECONDS:
        bucket.popleft()

    if len(bucket) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")

    bucket.append(now)


def _public_board(board: dict) -> dict:
    return {key: value for key, value in board.items() if key != "file"}


def _to_number(value: str) -> float:
    try:
        return float("".join(ch for ch in value if ch.isdigit() or ch in ".-"))
    except ValueError:
        return 0.0


def _normalize_name(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


def _format_specs(row: dict, headers: list[str], board: dict) -> dict:
    rank = row.get("排名", "")
    name = row.get("名称", "")
    score_header = headers[2] if len(headers) > 2 else "跑分"
    unit = row.get("单位") or board.get("unit")
    detail_url = row.get("详情页") or None
    excluded = {"排名", "名称", score_header, "单位", "详情页"}
    specs = [
        f"{header}: {row.get(header)}"
        for header in headers
        if header not in excluded and row.get(header)
    ][:4]

    score_text = row.get(score_header, "")
    return {
        "rank": int(_to_number(rank)) if rank else 0,
        "name": name,
        "score": _to_number(score_text),
        "scoreText": score_text,
        "unit": unit,
        "detailUrl": detail_url,
        "specs": specs,
        "specMap": {header: row.get(header, "") for header in headers if row.get(header, "")},
    }


def _load_rows(board: dict) -> list[dict]:
    file_path = (DATA_DIR / board["file"]).resolve()
    data_root = DATA_DIR.resolve()

    if not str(file_path).startswith(str(data_root)):
        raise HTTPException(status_code=400, detail="无效榜单")

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="榜单数据不存在")

    text = file_path.read_text(encoding="utf-8-sig")
    reader = DictReader(StringIO(text))
    headers = reader.fieldnames or []
    return [_format_specs(row, headers, board) for row in reader]


def _filter_rows(rows: list[dict], search: Optional[str]) -> list[dict]:
    keyword = (search or "").strip().lower()
    if not keyword:
        return rows

    return [
        row for row in rows
        if keyword in " ".join([
            row.get("name", ""),
            row.get("scoreText", ""),
            row.get("unit") or "",
            *row.get("specs", []),
        ]).lower()
    ]


def _find_row(rows: list[dict], name: str) -> Optional[dict]:
    keyword = name.strip().lower()
    if not keyword:
        return None

    for row in rows:
        if row["name"].lower() == keyword:
            return row

    for row in rows:
        if keyword in row["name"].lower():
            return row

    return None


def _find_exact_row(rows: list[dict], name: str) -> Optional[dict]:
    keyword = name.strip().lower()
    normalized_keyword = _normalize_name(name)
    if not keyword:
        return None

    for row in rows:
        if row["name"].lower() == keyword or _normalize_name(row["name"]) == normalized_keyword:
            return row

    return None


def _matches_name(name: str, keyword: str) -> bool:
    keyword = keyword.strip().lower()
    if not keyword:
        return False

    normalized_keyword = _normalize_name(keyword)
    normalized_name = _normalize_name(name)
    return keyword in name.lower() or bool(normalized_keyword and normalized_keyword in normalized_name)


def _candidate_match_score(name: str, keyword: str) -> int:
    keyword = keyword.strip().lower()
    name_lower = name.lower()
    normalized_keyword = _normalize_name(keyword)
    normalized_name = _normalize_name(name)

    if name_lower == keyword:
        return 0
    if normalized_name == normalized_keyword:
        return 1
    if normalized_keyword and normalized_name.endswith(normalized_keyword):
        return 2
    if name_lower.startswith(keyword):
        return 3
    if normalized_keyword and normalized_name.startswith(normalized_keyword):
        return 4
    if keyword in name_lower:
        return 5
    return 6


def _category_boards(category: str) -> list[dict]:
    boards = [board for board in BOARDS if board["category"] == category]
    if not boards:
        raise HTTPException(status_code=404, detail="分类不存在")
    return boards


def _category_label(category: str) -> str:
    meta = next((item for item in CATEGORIES if item["id"] == category), None)
    return meta["label"] if meta else category.upper()


def _gpu_composite_group_factor(group_count: int) -> float:
    if group_count >= GPU_COMPOSITE_MIN_FULL_GROUPS:
        return 1.0
    return GPU_COMPOSITE_GROUP_FACTORS.get(group_count, 0.0)


def _build_composite_rows(category: str) -> list[dict]:
    boards = _category_boards(category)
    group_total = len({board["group"] for board in boards}) or 1
    by_name: dict[str, dict] = {}

    for board in boards:
        rows = _load_rows(board)
        top_score = max((row["score"] for row in rows), default=0) or 1

        for row in rows:
            name = row.get("name")
            score = row.get("score", 0)
            if not name or score <= 0:
                continue

            normalized_score = (score / top_score) * 100
            item = by_name.setdefault(name, {
                "name": name,
                "scoreTotal": 0.0,
                "groupScores": {},
                "boardCount": 0,
                "bestRank": row.get("rank") or 999999,
                "specs": row.get("specs", []),
                "topBoardTitles": [],
            })

            item["scoreTotal"] += normalized_score
            item["groupScores"].setdefault(board["group"], []).append(normalized_score)
            item["boardCount"] += 1
            item["bestRank"] = min(item["bestRank"], row.get("rank") or 999999)
            if not item["specs"] and row.get("specs"):
                item["specs"] = row["specs"]
            if row.get("rank", 999999) <= 3 and board["shortTitle"] not in item["topBoardTitles"]:
                item["topBoardTitles"].append(board["shortTitle"])

    composite_rows = []
    for item in by_name.values():
        group_scores = {
            group: sum(scores) / len(scores)
            for group, scores in item["groupScores"].items()
            if scores
        }
        group_count = len(group_scores)
        base_score = item["scoreTotal"] / len(boards)
        coverage_factor = 1.0

        if category == "gpu" and group_count:
            base_score = sum(group_scores.values()) / group_count
            coverage_factor = _gpu_composite_group_factor(group_count)

        score = base_score * coverage_factor
        specs = [
            *([f"覆盖指标组: {group_count}/{group_total}"] if category == "gpu" else []),
            f"覆盖榜单: {item['boardCount']}/{len(boards)}",
            f"最佳排名: #{item['bestRank']}",
            *([f"前三项目: {' / '.join(item['topBoardTitles'][:2])}"] if item["topBoardTitles"] else []),
            *item["specs"][:2],
        ]
        composite_rows.append({
            "rank": 0,
            "name": item["name"],
            "score": score,
            "scoreText": f"{score:.1f}",
            "unit": "综合分",
            "detailUrl": None,
            "specs": specs,
            "specMap": {
                "覆盖榜单": str(item["boardCount"]),
                "覆盖指标组": f"{group_count}/{group_total}",
                "最佳排名": str(item["bestRank"]),
                "综合分": f"{score:.1f}",
                "基础综合分": f"{base_score:.1f}",
                "覆盖折减": f"{coverage_factor:.2f}",
            },
        })

    return [
        {**row, "rank": index + 1}
        for index, row in enumerate(sorted(composite_rows, key=lambda item: item["score"], reverse=True))
    ]


def _find_candidates(category: str, keyword: str, limit: int = MAX_CANDIDATES) -> list[dict]:
    keyword = keyword.strip()
    if not keyword:
        return []

    candidates: dict[str, dict] = {}
    for board in _category_boards(category):
        for row in _load_rows(board):
            name = row["name"]
            if not _matches_name(name, keyword):
                continue

            candidate = candidates.setdefault(name, {
                "name": name,
                "boardCount": 0,
                "bestRank": row["rank"] or 999999,
                "specs": row["specs"],
                "matchScore": _candidate_match_score(name, keyword),
            })
            candidate["boardCount"] += 1
            candidate["bestRank"] = min(candidate["bestRank"], row["rank"] or 999999)
            candidate["matchScore"] = min(candidate["matchScore"], _candidate_match_score(name, keyword))
            if not candidate["specs"] and row["specs"]:
                candidate["specs"] = row["specs"]

    ordered = sorted(
        candidates.values(),
        key=lambda item: (item["matchScore"], -item["boardCount"], item["bestRank"], item["name"]),
    )

    return [
        {key: value for key, value in item.items() if key != "matchScore"}
        for item in ordered[:limit]
    ]


def _get_board(board_id: str) -> dict:
    board = BOARD_BY_ID.get(board_id)
    if not board:
        raise HTTPException(status_code=404, detail="榜单不存在")
    return board


@router.get("/catalog")
async def get_catalog(request: Request):
    _check_rate_limit(request)
    return {
        "categories": CATEGORIES,
        "boards": [_public_board(board) for board in BOARDS],
    }


@router.post("/compare")
async def compare_leaderboard(request: Request, data: CompareRequest):
    _check_rate_limit(request)
    board = _get_board(data.boardId)
    rows = _load_rows(board)
    first = _find_row(rows, data.firstName)
    second = _find_row(rows, data.secondName)

    delta = None
    if first and second:
        gap = first["score"] - second["score"]
        base = second["score"] or 1
        delta = {
            "gap": gap,
            "percent": (gap / base) * 100,
            "leader": first["name"] if gap >= 0 else second["name"],
        }

    return {
        "board": _public_board(board),
        "first": first,
        "second": second,
        "delta": delta,
    }


@router.post("/compare-category")
async def compare_category_leaderboards(request: Request, data: CategoryCompareRequest):
    _check_rate_limit(request)
    boards = _category_boards(data.category)
    first_candidates = _find_candidates(data.category, data.firstName)
    second_candidates = _find_candidates(data.category, data.secondName)
    first_resolved = first_candidates[0] if first_candidates else None
    second_resolved = second_candidates[0] if second_candidates else None
    first_name = first_resolved["name"] if first_resolved else data.firstName
    second_name = second_resolved["name"] if second_resolved else data.secondName
    metrics = []

    for board in boards:
        rows = _load_rows(board)
        first = _find_exact_row(rows, first_name) if first_resolved else None
        second = _find_exact_row(rows, second_name) if second_resolved else None
        if not first and not second:
            continue

        delta = None
        if first and second:
            gap = first["score"] - second["score"]
            base = second["score"] or 1
            delta = {
                "gap": gap,
                "percent": (gap / base) * 100,
                "leader": first["name"] if gap >= 0 else second["name"],
            }

        metrics.append({
            "board": _public_board(board),
            "first": first,
            "second": second,
            "delta": delta,
        })

    return {
        "category": data.category,
        "firstQuery": data.firstName,
        "secondQuery": data.secondName,
        "firstResolved": first_resolved,
        "secondResolved": second_resolved,
        "firstCandidates": first_candidates,
        "secondCandidates": second_candidates,
        "metrics": metrics,
    }


@router.get("/composite/{category}")
async def get_composite_leaderboard(
    request: Request,
    category: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(90, ge=1, le=MAX_LIMIT),
    search: Optional[str] = Query(None, max_length=80),
):
    _check_rate_limit(request)
    all_rows = _build_composite_rows(category)
    rows = _filter_rows(all_rows, search)
    page_rows = rows[offset:offset + limit]
    label = _category_label(category)

    return {
        "board": {
            "id": f"{category}-composite",
            "category": category,
            "title": f"{label} 综合榜单",
            "shortTitle": "综合榜单",
            "metricLabel": "指标组归一分" if category == "gpu" else "归一化平均分",
            "unit": "综合分",
            "group": "综合榜单",
            "rows": len(all_rows),
        },
        "items": page_rows,
        "total": len(rows),
        "offset": offset,
        "limit": limit,
        "topScore": max((row["score"] for row in rows), default=0),
    }


@router.get("/{board_id}")
async def get_leaderboard(
    request: Request,
    board_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(90, ge=1, le=MAX_LIMIT),
    search: Optional[str] = Query(None, max_length=80),
):
    _check_rate_limit(request)
    board = _get_board(board_id)
    rows = _filter_rows(_load_rows(board), search)
    page_rows = rows[offset:offset + limit]

    return {
        "board": _public_board(board),
        "items": page_rows,
        "total": len(rows),
        "offset": offset,
        "limit": limit,
        "topScore": max((row["score"] for row in rows), default=0),
    }

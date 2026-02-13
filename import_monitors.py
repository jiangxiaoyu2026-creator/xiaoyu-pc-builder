
import sqlite3
import uuid
import json
from datetime import datetime
import re

# Database path
DB_PATH = "data/xiaoyu.db"

# Monitor data: (Price, Brand, Model)
monitors_data = [
    # Image 1
    (380, "HKC", "V2211 21.5寸 1k 60hz va"),
    (390, "HKC", "S24M 24寸 1k 60hz va"),
    (550, "HKC", "S27M 27寸 1k 60hz va"),
    (450, "HKC", "V241B 24寸 1k 100hz ips"),
    (520, "HKC", "V271B 27寸 1k 100hz ips"),
    (800, "HKC", "V3218 32寸 1k 60hz ips"),
    (550, "HKC", "S2416Q 24寸 2k 60hz ips"),
    (0, "HKC", "S2716Q 27寸 2k 60hz ips"),
    (850, "华硕", "VG259QSA 24.5寸 1920*1080 200HZ IPS"),
    (1250, "华硕", "VG258QM 24.5寸 1920*1080 280HZ TN"),
    (1250, "华硕", "VG259QM 24.5寸 1920*1080 280HZ IPS(FAST)"),
    (1250, "华硕", "VG27AQL5A-W 27寸 2K 210HZ IPS"),
    (999, "华硕", "VG27AQSA 27寸 2K 210HZ"),
    (1100, "华硕", "VG27AQSA-L 27寸 2K 210HZ IPS(FAST)"),
    (1150, "华硕", "VG27AQL5A 27寸 2K 210HZ IPS(FAST)"),
    (1250, "华硕", "VG27VQM 27寸 曲面 1920*1080 240HZ HVA"),
    (1450, "华硕", "VG27AQMSA 27寸 2K 300HZ IPS(FAST)"),
    (0, "华硕", "VG27AQML1A-W 27寸 2K 260HZ IPS"),
    (1550, "华硕", "VG27AQML5A 27寸 2K 300HZ IPS(FAST)"),
    (1650, "华硕", "VG27AQMS2A-W 27寸 2K 300HZ IPS(FAST)"),
    (1750, "华硕", "VG34WQML5A 34寸 2K 250HZ IPS(FAST)"),
    (1450, "华硕", "VG34VQL3A 34寸 曲面 4K 160HZ HVA"),
    (1800, "华硕", "XG259CMS 24.5寸 1920*1080 310HZ IPS(FAST)"),
    (2700, "华硕", "XG259QNS 24.5寸 1920*1080 380HZ IPS(FAST)黑色"),
    (2800, "华硕", "XG259QNS-W 24.5寸 1920*1080 380HZ IPS(FAST)白色"),
    (0, "华硕", "XG27ACS 27寸 2K 180HZ IPS(FAST)黑色"),
    (1450, "华硕", "XG27ACS 27寸 2K 180HZ IPS(FAST)白色"),
    (1450, "华硕", "XG27ACG 27寸 2K 180HZ IPS(FAST)黑色"),
    (1550, "华硕", "XG27ACG 27寸 2K 180HZ IPS(FAST)白色"),
    (1950, "华硕", "XG27UCS 27寸 4K 160HZ IPS(FAST)"),
    (2300, "华硕", "XG27UCG 27寸 双模 IPS(FAST)黑色"),
    (2350, "华硕", "XG27UCG-W 27寸 双模 IPS(FAST)白色"),
    (5500, "华硕", "PG248QP 24.1寸 1920*1080 540HZ TN"),
    (7500, "华硕", "PG32UCDMR 32寸 4K 240HZ OLED"),
    (950, "HKC", "T2752U 27寸 平面 无边框 4K IPS屏 升降底座"),
    (999, "HKC", "T3252U 32寸 平面 4K 垂直旋转底座(3840*2160)"),
    (1130, "HKC", "CG343U 34寸 带弧度 4K R1000三面无边 21:9比例 165HZ"),
    (530, "HKC", "G25H1经典 24.5寸 平面 1K 180HZ Fast IPS屏"),
    (750, "HKC", "G25H3 24.5寸 平面 1K 300HZ Fast IPS屏 HDR400"),
    (680, "HKC", "G27H3D 27寸 平面 1K 240HZ(超频) Fast IPS屏 HDR400"),
    (700, "HKC", "G24H2D 23.8寸 平面 2K 180HZ Fast IPS屏 HDR400"),
    (780, "HKC", "G27H2 27寸 平面 2K 180HZ Fast IPS屏 HDR400"),
    (1080, "HKC", "G27H4D 27寸 平面 2K 275HZ Fast IPS屏 HDR400"),
    (1300, "HKC", "G27H7 27寸 平面 4K 160HZ Fast IPS屏 HDR400"),
    (1350, "HKC", "G27H7 PRO 27寸 平面 4K 160HZ 可切换 1K 320HZ(双模式) Fast IPS"),
    (520, "AOC", "24G15N 23.8寸 VA屏 1K 180HZ 支持壁挂"),
    (0, "AOC", "24G4 23.8寸 Fast IPS屏 1K 180HZ 支持升降旋转"),
    (820, "AOC", "25G40BE 24.5寸 Fast IPS屏 1K 180HZ 不支持升降"),
    (570, "AOC", "25G40E 24.5寸 Fast IPS屏 1K 180HZ 支持壁挂"),
    (820, "AOC", "27G4H 27寸 IPS屏 1K 200HZ 支持升降旋转"),
    (940, "AOC", "25G3ZM 24.5寸 VA屏 1K 240HZ 支持升降旋转"),
    (750, "AOC", "27G11ZE2 27寸 Fast IPS屏 1K 240HZ 支持壁挂"),
    (680, "AOC", "27G40E 27寸 Fast IPS屏 1K 180HZ 支持壁挂"),
    (820, "AOC", "27G11ZE3 27寸 Fast IPS屏 1K 260HZ 不支持升降"),
    (810, "AOC", "27G4 27寸 Fast IPS屏 1K 180HZ 支持升降旋转"),
    (999, "AOC", "27G4Z 27寸 VA屏 1K 300HZ 支持升降旋转"),
    (0, "AOC", "C27G2X 27寸 曲面VA屏 1K 165HZ 支持壁挂"),
    (1099, "AOC", "C32G2E 31.5寸 曲面VA屏 1K 165HZ 支持壁挂"),
    (1130, "AOC", "C32G2ZE 31.5寸 曲面VA屏 1K 240HZ 支持壁挂"),
    (1020, "AOC", "Q27G2X 27寸 Fast VA屏 2K 180HZ 支持壁挂"),
    (1450, "AOC", "Q25G4S 24.5寸 IPS屏 2K 300HZ 支持升降旋转"),
    (970, "AOC", "Q27G40ZE 27寸 Fast IPS屏 2K 260HZ"),
    (780, "AOC", "Q27G40E 27寸 Fast IPS屏 2K 180HZ"),
    (0, "AOC", "Q27G11E 27寸 IPS屏 2K 180HZ 支持壁挂"),
    (1430, "AOC", "Q27G11SE 27寸 Fast IPS屏 2K 300HZ 支持壁挂"),
    (999, "AOC", "Q27G2H 27寸 IPS屏 2K 200HZ 支持丝控"),
    (1399, "AOC", "Q27G2E 27寸 IPS屏 2K 240HZ 支持四个方向调节"),
    (1560, "AOC", "Q27G2N 27寸 Fast IPS屏 2K 260HZ 支持升降旋转"),
    (1330, "AOC", "Q32G3SF 31.5寸 VA屏 2K 165HZ 不带音箱"),
    (1550, "AOC", "Q32G11ZE 31.5寸 Fast VA屏 2K 240HZ 支持壁挂"),
    (1540, "AOC", "CQ32G3SF 31.5寸 VA曲面屏 2K 165HZ 支持壁挂"),
    (1230, "AOC", "CQ32G4E 31.5寸 VA曲面屏 2K 180HZ 支持壁挂"),
    (1280, "AOC", "CQ32G3S 31.5寸 VA曲面屏 2K 165HZ 支持升降"),
    (1750, "AOC", "CQ32G10 31.5寸 VA曲面屏 2K 240HZ 支持升降旋转"),
    (1570, "AOC", "CU34G3X 34寸 VA曲面 4K 180HZ 支持壁挂"),
    (1850, "AOC", "U27G10 27寸 IPS屏 4K 160HZ 支持升降"),
    (3450, "AOC", "U32G3X 31.5寸 IPS屏 4K 144HZ 支持升降旋转"),
    (5100, "AOC", "AG246FK 24.1寸 Fast TN屏 1K 540HZ 支持升降"),
    (2499, "AOC", "AG274FZ 27寸 IPS屏 1K 280HZ 支持升降"),
    (2750, "AOC", "AG275FS 27寸 IPS屏 1K 360HZ 支持升降"),
    (1299, "AOC", "AG323QCXP 31.5寸 曲面VA屏 2K 165HZ 支持旋转"),
    (1550, "AOC", "AG275QXP 27寸 Nano IPS屏 2K 180HZ 支持升降"),
    (1350, "AOC", "AG275QXE 27寸 Fast IPS屏 2K 170HZ 支持升降"),
    (1399, "AOC", "AG275QXW 27寸 Fast IPS屏 2K 180HZ 支持升降"),
    (1799, "AOC", "AG275QZE 27寸 IPS屏 2K 260HZ 升降旋转"),
    (1899, "AOC", "AG275QZW 27寸 IPS屏 2K 260HZ 升降旋转"),
    (3100, "AOC", "AG276QZD 27寸 OLED屏 2K 140HZ 支持升降"),
    (2550, "AOC", "AG276UX 27寸 Fast IPS 4K 160HZ 支持升降"),
    (3850, "AOC", "AG493QCX 49寸 曲面VA屏 4K 144HZ 支持升降"),
    (5300, "AOC", "AG493UCX2 49寸 曲面VA屏 5K 165HZ 支持升降"),
    (2550, "AOC", "AG275UXM 27寸 mini LED IPS 4K 160HZ 支持升降"),
    (1120, "飞利浦", "27M2N5510J 27寸 IPS 2K180HZ 支持升降旋转"),
    (960, "飞利浦", "27M2N5510L 27寸 IPS 2K180 支持升降旋转"),
    (1720, "飞利浦", "27M2N5510P 27寸 白色 IPS 2K240 支持升降"),
    (1570, "飞利浦", "27M2N5510P 27寸 IPS 2K240 支持升降"),
    (660, "飞利浦", "27M2N3200F 27寸 IPS 1K180 支持升降"),
    (1080, "飞利浦", "27M2N5501 27寸 白色 IPS 2K180 支持升降"),
    (1770, "飞利浦", "27M3N5840 27寸 IPS 4K160 支持升降"),
    (1030, "AOC", "Q27G4/WS 27寸 IPS 2K200HZ 支持升降旋转"),
    (1230, "AOC", "Q27G40SE 27寸 Fast IPS 2K 300HZ 支持升降"),
    # Image 2
    (1330, "AOC", "Q27G3S2 IPS 2K300HZ 支持升降旋转"),
    (330, "HPC", "H259P 1K 100HZ VA 直面"),
    (520, "HPC", "H259FVS 1K 300HZ"),
    (399, "HPC", "H259FVX 1K 180HZ"),
    (630, "HPC", "HH27QPX 2K 180HZ"),
    (420, "HKC", "V2418M VA 100HZ"),
    (420, "HKC", "V2518M VA 100HZ"),
    (500, "HKC", "V2718M VA 100HZ"),
    (530, "HKC", "S2716 IPS 100HZ"),
    (550, "HKC", "V2718 IPS 100HZ"),
    (650, "HKC", "V2718Q 27寸平面 无边框 2K IPS屏 100HZ"),
    (1280, "HKC", "T2755U 27寸4K 75HZ可以变频1K 144HZ"),
    (1500, "HKC", "CG345UK 34寸 4K 240HZ RGB灯效"),
    (1250, "HKC", "G27H4D PRO 27寸 2K 320HZ Fast IPS屏"),
    (580, "HKC", "G24H3D 23.8寸平面 1K 240HZ(超频) 原生200HZ HDR400"),
    (780, "HKC", "G25H3PRO 24.5寸平面 1k 320HA(超频) HDR400"),
    (1200, "HKC", "G25H5 24.5寸平面 1k 400hz(超频) Fast IPS屏 HDR400"),
    (650, "HKC", "G27H1经典版 27寸平面 1K 200HZ Fast IPS屏"),
    (700, "HKC", "G24H2经典版 23.8寸平面 2K 180HZ Fast IPS屏"),
    (800, "HKC", "G27H2D PRO 27寸平面 2K 220HZ Fast IPS屏"),
    (1250, "HKC", "G25H4PRO 24.5寸平面 2K 320HZ FAST IPS屏"),
    (1050, "HKC", "G27H4D 27寸平面2K 275HZ(超频) Fast IPS屏"),
    (1300, "HKC", "G27H4PRO 27寸平面2K 320HZ(超频) Fast IPS屏"),
    (1200, "HKC", "TG27Q4 白 Fast IPS电竞 2K 275Hz (240超频) HDR400"),
    (2600, "HKC", "GS27QTS OLED电竞 2K 280HZ 带90瓦TYPE-C"),
    (3150, "HKC", "GS27QES OLED电竞 2K 320HZ 带90瓦TYPE-C"),
    (3999, "HKC", "OG27QH OLED电竞 2K 480HZ 带90瓦TYPE-C"),
    (4650, "HKC", "GS27QH OLED电竞 2K 500HZ 带90瓦TYPE-C"),
    (5999, "HKC", "GS49UK OLED电竞 5K 240HZ 32:9比例 R1800曲率"),
    (850, "华硕", "VA27AQ 2K 75HZ"),
    (1400, "华硕", "VY27UQ 4K 60HZ"),
    (2900, "华硕", "XG259QNG IPS 1920*1080 380HZ"),
    (2999, "华硕", "XG259QNG-W IPS 1920*1080 380HZ"),
    (1650, "华硕", "XG27ACMES IPS 2K 255HZ黑色"),
    (1750, "华硕", "XG27ACMES-W IPS 2K 255HZ白色"),
    (1800, "华硕", "XG27ACMEG IPS 2K 260HZ黑色"),
    (1900, "华硕", "XG27ACMEG-W IPS 2K 260HZ白色"),
    (3750, "华硕", "XG27AQWMG OLED 2K 280HZ"),
    (2700, "华硕", "XG27ACMS 2K 320HZ"),
    (5200, "华硕", "XG27AQDNG OLED 2K 360HZ"),
    (7200, "华硕", "XG27AQDPG OLED 2K 500HZ"),
    (5400, "华硕", "XG27UCDMG OLED 4K 240HZ"),
    (3750, "华硕", "XG32UCG 4K双模式"),
    (5400, "华硕", "XG32UCWG 4K双模式"),
    (6200, "华硕", "XG32UCWMG OLES双模式"),
    (6900, "华硕", "PG27UCDM 4K 240HZ"),
    (1380, "HKC", "G25H5PRO 24.5寸平面 1K 420HZ(超频) Fast IPS屏"),
    (699, "HKC", "G27H1 27寸平面 1K 200HZ Fast IPS屏 HDR400"),
    (750, "HKC", "G24H2 23.8寸平面 2K 180HZ Fast IPS屏 HDR400"),
    (800, "HKC", "G24H2W白色 23.8寸平面 2K 180HZ Fast IPS屏"),
    (800, "HKC", "G27H2PRO 27寸平面 2K 200HZ Fast IPS屏 HDR400"),
    (830, "HKC", "G27H2PRO MAX 27寸平面 2K 220HZ(超频) Fast IPS屏")
]

def parse_specs(model):
    m = model.lower()
    size = ""
    res = ""
    refresh = ""
    panel = ""
    
    # Size
    size_match = re.search(r'(\d+(?:\.\d+)?)\s*寸', m)
    if size_match:
        size = size_match.group(0)
    
    # Resolution
    if "4k" in m or "3840*2160" in m:
        res = "4K"
    elif "5k" in m:
        res = "5K"
    elif "2k" in m or "2560*1440" in m or "1920*1080" not in m and "1k" not in m and ("27" in m or "32" in m) and "ips" in m:
        # Heuristic for 2k
        if "2k" in m: res = "2K"
    elif "1k" in m or "1920*1080" in m:
        res = "1080P"
        
    # Refresh rate
    hz_match = re.search(r'(\d+)\s*hz', m, re.IGNORECASE)
    if hz_match:
        refresh = hz_match.group(1) + "Hz"
        
    # Panel type
    if "ips" in m: panel = "IPS"
    elif "va" in m: panel = "VA"
    elif "oled" in m: panel = "OLED"
    elif "tn" in m: panel = "TN"
    
    return {
        "size": size,
        "resolution": res,
        "refreshRate": refresh,
        "panelType": panel
    }

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    seen = set()
    
    for price, brand, model in monitors_data:
        # Avoid exact duplicates in the data list
        key = (brand, model)
        if key in seen:
            continue
        seen.add(key)
        
        id = str(uuid.uuid4())
        specs = parse_specs(model)
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, "monitor", brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} Monitor products.")

if __name__ == "__main__":
    import_data()

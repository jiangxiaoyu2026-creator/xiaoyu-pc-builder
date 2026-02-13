
import sqlite3
import uuid
import json
from datetime import datetime

# Database path
DB_PATH = "data/xiaoyu.db"

# Data list: (Price, Brand, Model)
mbs_data = [
    # Image 1
    (2300, "华硕", "ROG Z790-A GAMING WIFI-S"),
    (1950, "华硕", "TUF Z790-PLUS WIFI D5"),
    (1500, "华硕", "Z790-AYW WIFI-W"),
    (1540, "华硕", "Z790-AYW OC WIFI"),
    (1340, "华硕", "PRIME Z790-P WIFI"),
    (1250, "华硕", "PRIME Z790-P"),
    (1750, "华硕", "ROG B760-A GAMING WIFI D5"),
    (1130, "华硕", "TUF B760M-PLUS WIFI D5"),
    (770, "华硕", "PRIME B760M-AYW WIFI D4"),
    (0, "微星", "MPG Z790 CARBON WIFI DDR5 现货"),
    (0, "微星", "MPG Z790 EDGE TI MAX WIFI DDR5 刀锋钛"),
    (1370, "微星", "PRO Z790-A MAX WIFI DDR5"),
    (1250, "微星", "Z790 GAMING PLUS WIFI DDR5"),
    (1280, "微星", "PRO Z790-P WIFI DDR5"),
    (1200, "微星", "PRO Z790-P II"),
    (1150, "微星", "B760I EDGE WIFI DDR5 迷你刀锋"),
    (1030, "微星", "B760M MORTAR WIFI II 迫击炮 DDR5"),
    (860, "微星", "PRO B760M-A DDR4 WIFI"),
    (800, "微星", "B760M GAMING WIFI DDR5"),
    (0, "微星", "PRO H610M-E D4"),
    (0, "技嘉", "Z790 AORUS XTREME X 大师 X"),
    (4150, "技嘉", "Z790 AORUS MASTER X 超级雕 X"),
    (2700, "技嘉", "Z790 AORUS PRO 冰雕 X"),
    (2800, "技嘉", "Z790 A PRO X WIFI7 钛金雕 X"),
    (2100, "技嘉", "Z790 A ELITE AX ICE 冰雕"),
    (1299, "技嘉", "Z790 EAGLE 猎鹰"),
    (1350, "技嘉", "Z790M A ELITE AX ICE 冰雕"),
    (1350, "技嘉", "Z790M AORUS ELITE AX D5 WIFI6 小雕 WIFI"),
    (890, "技嘉", "B760M GAMING X D5"),
    (840, "技嘉", "B760M GAMING X DDR4 魔鹰"),
    (720, "技嘉", "B760M GAMING AC DDR4 WIFI"),
    (1500, "华硕", "ROG B650-A GAMING WIFI 吹雪"),
    (1100, "华硕", "TUF GAMING B650M-PLUS WIFI"),
    (1020, "华硕", "TUF GAMING B650M-PLUS"),
    (635, "华硕", "PRIME B650M-R"),
    (550, "华硕", "PRIME B650M-F"),
    (2430, "技嘉", "X670E AORUS PRO X 冰雕 X"),
    (1930, "技嘉", "X670 AORUS ELITE AX 小雕 WIFI"),
    (1050, "技嘉", "B650M AORUS ELITE 小雕"),
    (1070, "技嘉", "B650M A ELITE AX ICE 冰雕"),
    (1100, "华硕", "TUF B760M-PLUS D5 II"),
    (1120, "华硕", "TX GAMING B760M-PLUS WIFI D5 天选"),
    (1320, "技嘉", "Z790M AORUS ELITE AX 小雕 WIFI"),
    (970, "技嘉", "B760M GAMING X AX WIFI 魔鹰 X"),
    (640, "华硕", "PRIME B760M-AYW WIFI D5"),
    (499, "七彩虹", "H610M-E WIFI"),
    (450, "铭瑄", "H610M-E D4"),
    (1370, "华硕", "ROG B760-G GAMING WIFI D5-S"),
    (1299, "华硕", "ROG B760-G GAMING WIFI D4"),
    (340, "华硕", "PRIME A520M-K"),
    (700, "华硕", "TUF GAMING B550M-PLUS"),
    (620, "华硕", "H610M-A D5"),
    (620, "华硕", "H610M-AYW D4"),
    (430, "华硕", "H610M-K D4"),
    (560, "华硕", "PRIME B760M-F D4"),
    (600, "华硕", "PRIME B760M-F D5"),
    (590, "华硕", "PRIME B760M-K D4"),
    (600, "华硕", "PRIME B760M-K D5"),
    (850, "华硕", "PRIME B760M-A D4"),
    (930, "华硕", "PRIME B760M-A D5"),
    (870, "华硕", "PRIME B760M-A WIFI D4"),
    (1030, "华硕", "PRIME B760M-A WIFI D5"),
    (0, "华硕", "TUF B760M-E D4"),
    (1040, "华硕", "TUF B760M-PLUS D4"),
    (1100, "华硕", "TUF B760M-PLUS WIFI D4"),
    (1020, "华硕", "TX B760M-PLUS WIFI D4"),
    (1070, "微星", "B650M MORTAR WIFI 迫击炮 DDR5"),
    (820, "微星", "B650M GAMING WIFI D5"),
    (730, "微星", "PRO B650M-P DDR5"),
    (560, "微星", "PRO B650M-B DDR5"),
    (530, "微星", "PRO B650M-E DDR5"),
    (1330, "技嘉", "Z790M A ELITE AX ICE D5 WIFI6 冰雕"),
    (450, "铭瑄", "挑战者 H610M"),
    (500, "铭瑄", "H610M 666 D5 WIFI"),
    (450, "铭瑄", "H610M 666 WIFI"),
    (370, "铭瑄", "挑战者 H610M-D"),
    (560, "铭瑄", "挑战者 B760M"),
    (480, "铭瑄", "挑战者 B760M-F"),
    (360, "铭瑄", "A520M-K V2"),
    (720, "铭瑄", "B650M-K"),
    (1999, "技嘉", "Z790 A ELITE X WIFI7 小雕 X"),
    (970, "技嘉", "B760M A ELITE D4 小雕"),
    (330, "微星", "A520M-A PRO"),
    (500, "华硕", "H610M-G"),
    (510, "华硕", "B760M-E D4"),
    (1099, "技嘉", "B760M AORUS AX-P 电竞雕"),
    (650, "技嘉", "B650M GAMING WIFI 白魔鹰"),
    (835, "技嘉", "B760M G WIFI PLUS D5 白魔鹰"),
    (1050, "技嘉", "B760M AORUS ELITE D5 小雕"),
    (1250, "技嘉", "Z790M AORUS ELITE D5"),
    (0, "技嘉", "B650E AORUS MASTER WIFI6E 超级雕"),
    (1530, "技嘉", "B650E A ELITE X ICE WIFI6E 冰雕 X"),
    (1200, "技嘉", "B650M AORUS PRO AX WIFI6E 电竞雕"),
    (3499, "技嘉", "X670E AORUS MASTER WIFI6E 超级雕"),
    (1450, "技嘉", "Z790 UD AX D5 WIFI6E 耐久"),
    (1250, "技嘉", "Z790-D D5 耐久"),
    (460, "微星", "H610M-S WIFI D4"),
    (950, "华硕", "B760M-AYW PRO WIFI"),
    (4350, "华硕", "ROG CROSSHAIR X870E HERO"),
    (2480, "华硕", "ROG STRIX X870-A GAMING WIFI"),
    # Image 2
    (700, "华硕", "PRIME B650M-K"),
    (770, "华硕", "PRIME B650M-AYW-WIFI"),
    (750, "华硕", "TUF-GAMING B550M-PLUS-WIFI-II"),
    (2450, "华硕", "ROG STRIX Z890-H GAMING WIFI-S"),
    (1500, "华硕", "ROG STRIX B760-I GAMING WIFI-D5"),
    (2620, "华硕", "ROG STRIX X870-H GAMING WIFI-7-S"),
    (2300, "华硕", "ROG STRIX X670E-A GAMING WIFI"),
    (1450, "华硕", "ROG STRIX B850-G GAMING WIFI S"),
    (1100, "华硕", "TUF GAMING B850M-E WIFI"),
    (1450, "华硕", "TX B850M WIFI S-HATSUNE MIKU"),
    (3350, "微星", "MEG Z890 UNIFY-X"),
    (1920, "微星", "MPG Z890 EDGE TI WIFI"),
    (1150, "微星", "PRO Z890-P"),
    (1150, "微星", "MAG B860M MORTAR WIFI"),
    (1050, "微星", "B860M GAMING PLUS WIFI"),
    (1030, "微星", "B760M MORTAR II 代 DDR5"),
    (880, "微星", "B760M GAMING PLUS WIFI DDR4 (4内存槽)"),
    (820, "微星", "B760M-A DDR4 II (4内存槽)"),
    (710, "微星", "B760M BOMBER WIFI DDR5"),
    (660, "微星", "B760M BOMBER WIFI DDR4"),
    (7200, "微星", "MEG X870E GODLIKE 超神 D5"),
    (2500, "微星", "MPG X870E EDGE TI WIFI 刀锋 DDR5"),
    (2080, "微星", "MAG X870E TOMAHAWK WIFI D5"),
    (1800, "微星", "X870E GAMING PLUS WIFI D5"),
    (1600, "微星", "X870 GAMING PLUS WIFI D5"),
    (1720, "微星", "MPG B850 EDGE TI WIFI DDR5 刀锋"),
    (1620, "微星", "MAG B850 TOMAHAWK MAX WIFI 战斧导弹"),
    (1400, "微星", "B850 GAMING PLUS WIFI D5"),
    (1300, "微星", "PRO B850-P WIFI D5"),
    (1620, "微星", "B850I EDGE TI WIFI 迷你刀锋"),
    (1280, "微星", "B850M MORTAR WIFI"),
    (1020, "微星", "B850M GAMING PLUS WIFI"),
    (930, "微星", "PRO B850M-A WIFI"),
    (920, "微星", "PRO B850M-P WIFI"),
    (2300, "微星", "X670E CARBON WIFI 暗黑 DDR5"),
    (720, "微星", "B650M BOMBER WIFI D5"),
    (8500, "华硕", "ROG CROSSHAIR X870E EXTREME"),
    (4950, "华硕", "ROG CROSSHAIR X870E APEX"),
    (2650, "华硕", "ROG STRIX X870E-E WIFI-7"),
    (2400, "华硕", "TUF GAMING X870E-PLUS WIFI7"),
    (1330, "华硕", "TUF-B850M-PLUS WIFI7-W-白"),
    (999, "华硕", "B760M-A WIFI-D5"),
    (2650, "华硕", "ROG STRIX X870-A WIFI-S"),
    (3100, "华硕", "ROG STRIX X870E-H-S-MIKU"),
    (1330, "华硕", "TUF-GAMING-B850M-PLUS WIFI7"),
    (1240, "华硕", "TUF-GAMING-B850M-PLUS II"),
    (1220, "华硕", "TX-B850M-WIFI-W 《白》"),
    (1300, "华硕", "B850M-AYW-GAMING-OC-WIFI7-W"),
    (1280, "华硕", "PRIME B850M-A WIFI"),
    (810, "华硕", "PRIME B850M-F-WIF"),
    (760, "华硕", "PRIME B850M-F"),
    (1420, "微星", "PRO Z890-P WIFI"),
    (1350, "微星", "PRO Z890-S WIFI WHITE"),
    (960, "微星", "B850M GAMING PRO WIFI6E"),
    (460, "微星", "H610M BOMBER 爆破弹"),
    (750, "微星", "PRO B860M-B WIFI"),
    (650, "微星", "PRO B860M-B"),
    (600, "微星", "PRO H810M-B"),
    (620, "微星", "B760M BOMBER DDR4"),
    (580, "微星", "PRO B760M-B DDR5"),
    (550, "微星", "PRO B760M-B DDR4"),
    (950, "微星", "B650 GAMING PLUS WIFI DDR5"),
    (930, "微星", "B650M GAMING PLUS WIFI D5"),
    (380, "华硕", "H310M-F"),
    (370, "微星", "H310M"),
    (1100, "华硕", "TUF-GAMING-B650EM-PLUS WIFI"),
]

def get_socket_and_mem(model):
    m = model.upper()
    socket = "Unknown"
    mem = "DDR5"
    
    # Socket LGA1700
    if any(x in m for x in ["Z790", "B760", "H610", "Z690", "B660"]):
        socket = "LGA1700"
    # Socket AM5
    elif any(x in m for x in ["X670", "B650", "A620", "X870"]):
        socket = "AM5"
    # Socket AM4
    elif any(x in m for x in ["X570", "B550", "A520", "B450"]):
        socket = "AM4"
        mem = "DDR4"
    # Socket LGA1851
    elif any(x in m for x in ["Z890", "B860", "H810"]):
        socket = "LGA1851"
    # Socket LGA1200 or older
    elif "H310" in m:
        socket = "LGA1151-v2"
        mem = "DDR4"
    
    # Overwrite Memory Type if specified
    if "D4" in m or "DDR4" in m:
        mem = "DDR4"
    elif "D5" in m or "DDR5" in m:
        mem = "DDR5"
        
    return socket, mem

def get_form_factor(model):
    m = model.upper()
    if "-I" in m or " I " in m or "ITX" in m:
        return "ITX"
    if "M-" in m or " M " in m or "MATX" in m or "B760M" in m or "B650M" in m or "Z790M" in m or "H610M" in m or "B850M" in m or "B860M" in m:
        return "MATX"
    return "ATX"

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    
    for price, brand, model in mbs_data:
        id = str(uuid.uuid4())
        socket, mem = get_socket_and_mem(model)
        ff = get_form_factor(model)
        
        specs = {
            "socket": socket,
            "memoryType": mem,
            "formFactor": ff,
            "vrm": "",
            "m2Slots": 2
        }
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, "mainboard", brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} Motherboard products.")

if __name__ == "__main__":
    import_data()

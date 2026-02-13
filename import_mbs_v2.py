
import sqlite3
import uuid
import json
from datetime import datetime

# Database path
DB_PATH = "data/xiaoyu.db"

# Raw text data from user
raw_data = """
3150	华硕	ROG STRIX X870E-E GAMING WIFI
2950	华硕	ROG STRIX X870-F GAMING WIFI
3650	华硕	PROART X870E-CREATOR WIFI
2130	华硕	TUF GAMING X870-PLUS WIFI
1750	华硕	PRIME X870-P WIFI
1650	华硕	PRIME X870-P
6400	华硕	ROG MAXIMUS Z890 EXTREME
3600	华硕	ROG MAXIMUS Z890 APEX
3500	华硕	ROG MAXIMUS Z890 HERO
3400	华硕	ROG Z890-E GAMING WIFI
2850	华硕	ROG Z890-F GAMING WIFI
2400	华硕	ROG Z890-A GAMING WIFI S
1850	华硕	TUF GAMING Z890-PRO WIFI
1850	华硕	TUF GAMING Z890-PLUS WIFI
1500	华硕	Z890 AYW GAMING WIFI W
1330	华硕	PRIME Z890-P WIFI
1230	华硕	PRIME Z890-P
1250	华硕	PRIME Z890M-PLUS WIFI
4050	微星	MEG Z890 ACE 战神
2950	微星	MPG Z890 CARBON WIFI暗黑
1820	微星	MAG Z890 TOMAHAWK WIFI战斧导弹
1580	微星	Z890 GAMING PLUS WIFI
1630	微星	PRO Z890-A WIFI
4350	技嘉	Z890 AORUS MASTER超级雕
2910	技嘉	Z890 AORUS PRO ICE电竞冰雕
2399	技嘉	Z890 AORUS ELITE WIFI7小雕
2399	技嘉	Z890 A ELITE WIFI7 ICE冰雕
2910	技嘉	Z890 AERO G雪鹰
1980	技嘉	Z890 GAMING X WIFI7魔鹰X
1880	技嘉	Z890 EAGLE WIFI7猎鹰
1770	技嘉	超耐久Z890 UD
1570	技嘉	Z890M AORUS ELITE WIFI7 小雕
1499	技嘉	Z890M AORUS ELITE WIFI7 ICE冰雕
1370	技嘉	Z890M GAMING X魔鹰X
2450	技嘉	Z890 I AORUS ULTRA迷你雕
900	微星	B760M GAMING PLUS WIFI DDR5（4内存槽）
3500	技嘉	X870E AORUS MASTER超级雕
2250	技嘉	X870E AORUS PRO ICE电竞冰雕
2120	技嘉	X870 AORUS ELITE WIFI7 ICE冰雕
2020	技嘉	X870 AORUS ELITE WIFI7 小雕
1740	技嘉	X870 GAMING X WIFI7魔鹰X
1650	技嘉	X870 EAGLE WIFI7猎鹰
2920	微星	X870E CARBON WIFI 暗黑 DDR5
1850	微星	X870 TOMAHAWK WIFI 战斧导弹 DDR5
1550	微星	PRO X870-P WIFI DDR5
420	技嘉	H610M-K D4
550	微星	PRO H610M-G WIFI DDR4
1550	技嘉	B850 A ELITE WF7 ICE冰雕ATX
1550	技嘉	B850 A ELITE WF7小雕WIFI
1350	技嘉	B850M A PRO WIFI7电竞雕WIFI
1250	技嘉	B850M A ELITE  WF6E ICE冰雕
1150	技嘉	B850M GAMING X WF6E魔鹰X
1850	华硕	ROG STRIX B850-A GAMING WIFI S
2450	华硕	ROG STRIX B850-E GAMING WIFI
2250	华硕	ROG STRIX B850-F GAMING WIFI
2380	华硕	ROG STRIX B850-I GAMING WIFI
1650	华硕	TUF GAMING B850-PLUS WIFI
1250	华硕	TUF GAMING B850M-PLUS WIFI
1170	华硕	TUF GAMING B850M-PLUS
1250	华硕	PRIME B840-PLUS WIFI
1150	华硕	PRIME B840M-A WIFI
1060	华硕	PRIME B840M-A
2980	华硕	ROG STRIX Z890-I GAMING WIFI
3450	华硕	ProArt Z890-CREATOR WIFI
1920	华硕	ROG STRIX B860-F GAMING WIFI
1750	华硕	ROG STRIX B860-A GAMING WIFI S
1400	华硕	ROG STRIX B860-G GAMING WIFI S
1560	华硕	ROG STRIX B860-I GAMING WIFI
1450	华硕	TUF GAMING B860-PLUS WIFI
1220	华硕	TUF GAMING B860M-PLUS WIFI
1170	华硕	TUF GAMING B860M-PLUS
1150	华硕	TX GAMING B860M WIFI
1200	华硕	PRIME B860-PLUS WIFI
1150	华硕	PRIME B860-PLUS
1180	华硕	PRIME B860M-A WIFI
1130	华硕	PRIME B860M-A  WIFI
920	华硕	B860M AYW GAMING WIFI
730	华硕	PRIME B860M-K
780	华硕	H810M AYW GAMING WIFI
800	华硕	PRIME H810M-A WIFI
700	华硕	PRIME H810M-A
3150	华硕	ROG STRIX X870-I GAMING WIFI
490	华硕	PRIME B550M-K-ARGB
480	华硕	PRIME B550M-K
680	蓝宝石	PLUS脉动 B650M WIFI
600	蓝宝石	PLUS脉动 B650M
880	蓝宝石	NITRO氮动 B650M WIFI
1000	技嘉	B650M AORUS ELITE AX小雕
850	技嘉	B650M GAMING WIFI白魔鹰WIFI
750	技嘉	B550M AORUS ELITE AX小雕WIFI
620	技嘉	B550M AORUS ELITE小雕
660	技嘉	B760M D4魔鹰
1600	华硕	X870-AYW-WIFI-W《白》
1600	华硕	B850 MAX GAMING WIFI W
1550	华硕	PRIME B850-PLUS WIFI
1450	华硕	PRIME B850-PLUS
920	华硕	B850M AYW GAMING WIFI
880	华硕	PRIME B850M-K
1500	华硕	B650E-MAX-GAMING-WIFI
1110	华硕	TX-GAMING-B650EM-WIFI-W
"""

def parse_raw_data(text):
    data = []
    lines = text.strip().split('\n')
    for line in lines:
        parts = line.split('\t')
        if len(parts) >= 3:
            price = parts[0].strip()
            brand = parts[1].strip()
            model = parts[2].strip()
            data.append((price, brand, model))
        elif len(parts) == 2:
            # Handle cases where brand might be missing or merged
            # Looking at the user input: "1180	PRIME B860M-A WIFI"
            price = parts[0].strip()
            model = parts[1].strip()
            # Default brand if not found, or try to infer
            brand = "华硕" if "PRIME" in model or "TUF" in model or "ROG" in model else "Unknown"
            data.append((price, brand, model))
    return data

mbs_data = parse_raw_data(raw_data)

def get_socket_and_mem(model):
    m = model.upper()
    socket = "Unknown"
    mem = "DDR5"
    
    # Socket LGA1851 (Intel 800 series)
    if any(x in m for x in ["Z890", "B860", "H810", "B840"]):
        socket = "LGA1851"
    # Socket AM5 (AMD 600/800 series)
    elif any(x in m for x in ["X670", "B650", "A620", "X870", "B850"]):
        socket = "AM5"
    # Socket LGA1700 (Intel 600/700 series)
    elif any(x in m for x in ["Z790", "B760", "H610", "Z690", "B660"]):
        socket = "LGA1700"
    # Socket AM4
    elif any(x in m for x in ["X570", "B550", "A520", "B450"]):
        socket = "AM4"
        mem = "DDR4"
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
    if "M-" in m or " M " in m or "MATX" in m or any(x in m for x in ["B760M", "B650M", "Z790M", "H610M", "B850M", "B860M", "Z890M", "H810M"]):
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
    print(f"Successfully imported {count} Motherboard products in Batch 2.")

if __name__ == "__main__":
    import_data()


import sqlite3
import uuid
import json
from datetime import datetime
import re

# Database path
DB_PATH = "data/xiaoyu.db"

# Power supply data samples from the long image (representative items)
# (Price, Brand, Model)
power_data = [
    (145, "其他", "普通办公电源 300W"),
    (240, "长城", "网霸 400W"),
    (350, "长城", "希望 500W"),
    (450, "长城", "V5 500W 金牌直出"),
    (550, "长城", "V6 600W 金牌直出"),
    (650, "长城", "V7 700W 金牌全模"),
    (850, "长城", "X8 850W 金牌全模"),
    (1050, "长城", "G11 1100W 金牌全模"),
    (499, "航嘉", "WD500K 金牌直出"),
    (599, "航嘉", "WD600K 金牌直出"),
    (699, "航嘉", "WD700K 金牌直出"),
    (899, "航嘉", "MVP K850 金牌全模"),
    (1199, "航嘉", "MVP K1000 金牌全模"),
    (399, "鑫谷", "AN650 铜牌直出"),
    (499, "鑫谷", "AM750 金牌全模"),
    (599, "鑫谷", "AM850 金牌全模"),
    (1299, "华硕", "ROG 雷神 850W Platinum"),
    (1999, "华硕", "ROG 雷神 1200W Platinum II"),
    (899, "华硕", "ROG 雪鹰 850W 金牌全模"),
    (1099, "华硕", "ROG 雪鹰 1000W 金牌全模"),
    (499, "华硕", "TUF 突击手 550W 铜牌"),
    (699, "华硕", "TUF 重装甲 750W 金牌全模"),
    (799, "华硕", "TUF 重装甲 850W 金牌全模"),
    (399, "微星", "MAG A550BN 铜牌"),
    (499, "微星", "MAG A650BN 铜牌"),
    (699, "微星", "MPG A750G 金牌全模 PCIE5"),
    (799, "微星", "MPG A850G 金牌全模 PCIE5"),
    (1099, "微星", "MPG A1000G 金牌全模 PCIE5"),
    (599, "海韵", "CORE GX-650 金牌全模"),
    (799, "海韵", "FOCUS GX-750 金牌全模"),
    (899, "海韵", "FOCUS GX-850 金牌全模"),
    (1299, "海韵", "FOCUS GX-1000 金牌全模"),
    (1099, "海韵", "VERTEX GX-1000 PCIE5"),
    (1499, "海韵", "VERTEX GX-1200 PCIE5"),
    (899, "海盗船", "RM750e 金牌全模"),
    (999, "海盗船", "RM850e 金牌全模"),
    (1299, "海盗船", "RM1000e 金牌全模"),
    (1599, "海盗船", "RM1200x Shift"),
    (2499, "海盗船", "AX1600i 钛金全模"),
    (699, "酷冷至尊", "GX Gold 750W 全模组"),
    (799, "酷冷至尊", "GX Gold 850W 全模组"),
    (999, "酷冷至尊", "V850 Gold V2 全模组"),
    (599, "酷冷至尊", "V650 SFX Gold"),
    (699, "酷冷至尊", "V750 SFX Gold"),
    (799, "酷冷至尊", "V850 SFX Gold"),
    (399, "安钛克", "NE650 金牌全模"),
    (499, "安钛克", "NE750 金牌全模"),
    (599, "安钛克", "NE850 金牌全模"),
    (1099, "安钛克", "HCG 1000 金牌全模")
]

def get_power_specs(model):
    m = model.lower()
    wattage = 500
    efficiency = "80 Plus Gold"
    modular = "Non-Modular"
    form_factor = "ATX"
    
    # Wattage heuristics
    watt_match = re.search(r'(\d+)w', m)
    if watt_match:
        wattage = int(watt_match.group(1))
    elif any(x in m for x in ["550", "650", "750", "850", "1000", "1200", "1600"]):
        # Match standalone numbers if common wattages
        nums = re.findall(r'\d+', m)
        for n in nums:
            if int(n) in [550, 650, 750, 850, 1000, 1100, 1200, 1300, 1600]:
                wattage = int(n)
                break
                
    # Efficiency heuristics
    if "platinum" in m: efficiency = "80 Plus Platinum"
    elif "钛金" in m: efficiency = "80 Plus Titanium"
    elif "金牌" in m or "gold" in m: efficiency = "80 Plus Gold"
    elif "铜牌" in m or "bronze" in m: efficiency = "80 Plus Bronze"
    
    # Modular heuristics
    if "全模" in m or "modular" in m:
        modular = "Full-Modular"
    elif "半模" in m:
        modular = "Semi-Modular"
    
    # Form factor
    if "sfx" in m:
        form_factor = "SFX"

    return {
        "wattage": f"{wattage}W",
        "efficiency": efficiency,
        "modular": modular,
        "formFactor": form_factor,
        "isPcie5": "Yes" if "pcie5" in m else "No"
    }

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    seen = set()
    
    for price, brand, model in power_data:
        key = (brand, model)
        if key in seen: continue
        seen.add(key)
        
        id = str(uuid.uuid4())
        specs = get_power_specs(model)
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, "power", brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} Power Supply products.")

if __name__ == "__main__":
    import_data()

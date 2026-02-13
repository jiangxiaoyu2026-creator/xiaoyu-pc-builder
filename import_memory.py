
import sqlite3
import uuid
import json
from datetime import datetime
import re

# Database path
DB_PATH = "data/xiaoyu.db"

# Memory data samples from images
# (Price, Brand, Model)
memory_data = [
    (8500, "芝奇", "幻锋戟6400 96G(48G*2 套条)黑/银"),
    (7800, "芝奇", "幻锋戟6800 64G(32G*2 套条)黑/银"),
    (0, "芝奇", "幻锋戟7600 48G(24G*2 套条)黑/银"),
    (0, "芝奇", "幻锋戟8000 32G(16G*2 套条)黑/银 预定"),
    (0, "芝奇", "幻锋戟8000 48G(24G*2 套条)黑/银 预定"),
    (0, "芝奇", "幻锋戟8200 48G(24G*2 套条)黑/银 预定"),
    (0, "芝奇", "幻锋戟8400 48G(24G*2 套条)黑/银 预定"),
    (400, "威刚", "XPG D35 3200 8G"),
    (790, "威刚", "XPG D35 3200 16G"),
    (0, "威刚", "XPG D35 3200 64G(32G*2)黑"),
    (530, "威刚", "XPG D35 3600 16G(8G*2)黑"),
    (980, "威刚", "XPG D35 3600 32G(16G*2)黑/白"),
    (1120, "威刚", "XPG龙耀D300 5600 16G"),
    (0, "威刚", "XPG龙耀D300 5600 64G(32G*2)黑"),
    (0, "威刚", "XPG龙耀D300 6000 C30 32G(16G*2)黑/白"),
    (2650, "威刚", "XPG龙耀D300G 6000 C28 32G(16G*2)灯条 黑"),
    (0, "威刚", "XPG龙耀D300 6000 C30 64G(32G*2)黑"),
    (0, "威刚", "XPG龙耀D300 6400 C32 32G(16G*2)黑/白"),
    (0, "威刚", "XPG龙耀D300 6400 C32 64G(32G*2)黑"),
    (0, "威刚", "D500G 5600 C38 32G(16G*2)RGB白"),
    (0, "威刚", "D500G 6000 C30 64G(32G*2)RGB白"),
    (470, "雷克沙", "雷神戟 3600 32G(16G*2)"),
    (3100, "金百达", "白刃灯32G (16G*2) 6000 C30/"),
    (3700, "倍思", "DW100 6000 C30 16*2灯条"),
    (2950, "阿斯加特", "女武神二代 6800 32G(16G*2) C32 RGB灯条 黑/白"),
    (3250, "宏碁", "冰刃 6000 32G(16G*2) C28 白/黑 RGB"),
    (3400, "芝奇", "焰光戟6400 32G(16G*2套条) C30 EXPO版"),
    (4000, "倍思", "DW100 8000 C36 16*2灯条"),
    (3225, "阿斯加特", "海力士 6000 32G (16*2) C30"),
    (3585, "阿斯加特", "海力士 6000 32G (16*2) C28"),
    (7000, "倍思", "DW100灯条 8000 48*2 C28"),
    (740, "金士顿", "3200 16G海力士"),
    (3900, "阿斯加特", "女武神二代6000 48G(24*2) C28 RGB灯条 黑/白"),
    (770, "光威", "3600 16G复仇者"),
    (1380, "光威", "3200 32G复仇者"),
    (3000, "光威", "6000 16*2 C28神马"),
    (2600, "宏碁", "6400 16*2 C38银色灯条"),
    (820, "烤德酷", "马甲条3600 8*2"),
    (3000, "金百达", "白刃灯32G (16G*2) 6400 C32/"),
    (2420, "威刚", "XPG龙耀D300 6000 C28 32G"),
    (2500, "威刚", "XPG龙耀D300 6000 C30 32G"),
    (1700, "威刚", "XPG龙耀D300 6000 C28 24G"),
    (2750, "威刚", "XPG龙耀D300 6000 C28 48G"),
    (2750, "威刚", "XPG龙耀D300 6400 C32 48G"),
    (390, "镁光", "3200 8G普条"),
    (1630, "金士顿", "马甲条3600 16*2"),
    (760, "金士顿", "马甲条3200 8*2"),
    (730, "镁光", "3200 16G普条"),
    (3600, "倍思", "HX100 6400 16*2 C30"),
    (3800, "倍思", "HX100 6800 16*2 C34"),
    (500, "金士顿", "野兽3200 8G单条"),
    (900, "金士顿", "野兽3200 16G单条"),
    (920, "金士顿", "野兽3600 16G单条"),
    (380, "海盗船", "3200 8G单条"),
    (400, "海盗船", "3600 8G单条"),
    (550, "金士顿", "野兽3200 8G灯 单条"),
    (3300, "金百达", "白刃灯32G (16G*2) 6000 C28"),
    (3100, "金百达", "白刃灯32G (16G*2) 6800 C32"),
    # Additional representative items from images
    (0, "雷克沙", "战神 6000 32G(16G*2) C30黑"),
    (0, "金百达", "银爵32G (16G*2) 3200/C16"),
    (0, "金百达", "黑武士32G (16G*2) 3600/C18"),
    (1550, "金百达", "星刃32G (16G*2) 6000 C28"),
    (0, "金士顿", "野兽5600 16G单条"),
    (3260, "金士顿", "叛逆者6000 32G(16G*2) EXPO"),
    (6000, "金士顿", "叛逆者6000 64G(32G*2)EXPO"),
    (4200, "芝奇", "皇家戟6000 32G(16G*2套条) C28 EXPO版"),
    (4700, "芝奇", "皇家戟6000 64G(32G*2套条) C28 EXPO版"),
    (3600, "芝奇", "幻锋戟6400 32G(16G*2套条)特挑黑/银"),
]

def get_memory_specs(model):
    m = model.upper()
    gen = "DDR5"
    capacity = "32G"
    freq = "6000MHz"
    latency = "C30"
    
    # Generation
    if any(x in m for x in ["3200", "3600", "DDR4", "D4"]):
        gen = "DDR4"
    
    # Capacity
    cap_match = re.search(r'(\d+)G', m)
    if cap_match:
        capacity = cap_match.group(0)
    if "套条" in m or "*" in m or "(" in m:
        # Heuristic for kits
        if "48G*2" in m or "96G" in m: capacity = "96G"
        elif "32G*2" in m or "64G" in m: capacity = "64G"
        elif "24G*2" in m or "48G" in m: capacity = "48G"
        elif "16G*2" in m or "32G" in m: capacity = "32G"
        elif "8G*2" in m or "16G" in m: capacity = "16G"
        
    # Frequency
    freq_match = re.search(r'(\d{4})', m)
    if freq_match:
        freq = freq_match.group(1) + "MHz"
        
    # Latency
    latency_match = re.search(r'C(\d{2})', m)
    if latency_match:
        latency = latency_match.group(0)
    elif gen == "DDR4":
        latency = "C16" if "3200" in m else "C18"

    return {
        "generation": gen,
        "capacity": capacity,
        "frequency": freq,
        "latency": latency
    }

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    seen = set()
    
    for price, brand, model in memory_data:
        key = (brand, model)
        if key in seen: continue
        seen.add(key)
        
        id = str(uuid.uuid4())
        specs = get_memory_specs(model)
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, "memory", brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} Memory products.")

if __name__ == "__main__":
    import_data()

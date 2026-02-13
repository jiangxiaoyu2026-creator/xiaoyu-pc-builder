
import sqlite3
import uuid
import json
from datetime import datetime
import re

# Database path
DB_PATH = "data/xiaoyu.db"

# Case data samples from the very long list (representative items)
# (Price, Brand, Model)
case_data = [
    (145, "其他", "星烁双面玻璃"),
    (240, "其他", "星烁双面玻璃-白"),
    (490, "安钛克", "C8/C8双面玻璃-白"),
    (195, "其他", "海景房-全侧透-黑"),
    (220, "其他", "海景房-全侧透-白"),
    (450, "其他", "无立柱海景房-黑"),
    (480, "其他", "无立柱海景房-白"),
    (145, "动力火车", "D小金刚3.0 黑色"),
    (155, "动力火车", "D小金刚3.0 白色"),
    (220, "玩嘉", "绝影-全侧透-黑"),
    (235, "玩嘉", "绝影-全侧透-白"),
    (245, "玩嘉", "绝影-全侧透-粉"),
    (168, "玩嘉", "孤勇者M-ATX-黑"),
    (178, "玩嘉", "孤勇者M-ATX-白"),
    (135, "大水牛", "小豹领航者M"),
    (145, "大水牛", "小豹领航者M白"),
    (195, "先马", "新镜界-黑色"),
    (205, "先马", "新镜界-白色"),
    (290, "先马", "大境界-黑色"),
    (310, "先马", "大境界-白色"),
    (85, "金河田", "启航Z2-黑色"),
    (95, "金河田", "启航Z2-白色"),
    (145, "乔思伯", "D31 标准版-黑"),
    (155, "乔思伯", "D31 标准版-白"),
    (420, "乔思伯", "D31 网孔副屏版-黑"),
    (435, "乔思伯", "D31 网孔副屏版-白"),
    (165, "爱国者", "星际豪宅-黑色"),
    (175, "爱国者", "星际豪宅-白色"),
    (450, "联力", "216 侧透-黑色"),
    (490, "联力", "216 侧透-白色"),
    (1050, "联力", "O11D EVO 黑色"),
    (1150, "联力", "O11D EVO 白色"),
    (1350, "联力", "O11D EVO RGB 黑色"),
    (1480, "联力", "O11D EVO RGB 白色"),
    (165, "航嘉", "S920 全景版-黑"),
    (175, "航嘉", "S920 全景版-白"),
    (75, "鑫谷", "图灵1号"),
    (135, "鑫谷", "无界1-黑色"),
    (145, "鑫谷", "无界1-白色"),
    (210, "华硕", "AP201 冰立方-黑"),
    (230, "华硕", "AP201 冰立方-白"),
    (599, "华硕", "GT301 火枪手"),
    (1299, "华硕", "GT502 弹药库-黑"),
    (1399, "华硕", "GT502 弹药库-白"),
    (125, "微星", "MAG FORGE 100R"),
    (185, "微星", "MAG FORGE M100R-白"),
    (65, "其他", "普通办公机箱"),
    (125, "爱国者", "S1 黑色"),
    (135, "爱国者", "S1 白色"),
    (245, "恩杰", "H5 Flow-黑色"),
    (265, "恩杰", "H5 Flow-白色"),
    (850, "恩杰", "H9 Flow-黑色"),
    (950, "恩杰", "H9 Flow-白/粉"),
    (185, "乔思伯", "TK-1 星舰仓-黑"),
    (195, "乔思伯", "TK-1 星舰仓-白"),
    (285, "乔思伯", "TK-2 星舰仓-黑"),
    (295, "乔思伯", "TK-2 星舰仓-白"),
    (1350, "分形工艺", "North 北方-炭黑"),
    (1450, "分形工艺", "North 北方-粉白"),
    (185, "酷冷至尊", "TD500 Mesh V2-黑"),
    (195, "酷冷至尊", "TD500 Mesh V2-白")
]

def get_case_specs(model):
    m = model.lower()
    form_factor = "ATX"
    glass = True
    color = "Black"
    
    # Form Factor heuristics
    if any(x in m for x in ["m-atx", "matx", "d31", "ap201", "m100r", "s1", "tk-1"]):
        form_factor = "MATX"
    elif any(x in m for x in ["itx", "a4", "nano"]):
        form_factor = "ITX"
    
    # Color heuristics
    if "白" in m or "white" in m:
        color = "White"
    elif "粉" in m or "pink" in m:
        color = "Pink"
    
    # Side panel
    if "办公" in m or "网孔" in m or "mesh" in m:
        glass = False

    return {
        "formFactor": form_factor,
        "sidePanel": "Glass" if glass else "Solid/Mesh",
        "color": color,
        "maxGpuLength": 380 if form_factor == "ATX" else 330,
        "maxCoolerHeight": 170 if form_factor == "ATX" else 155
    }

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    seen = set()
    
    for price, brand, model in case_data:
        key = (brand, model)
        if key in seen: continue
        seen.add(key)
        
        id = str(uuid.uuid4())
        specs = get_case_specs(model)
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, "case", brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} Case products.")

if __name__ == "__main__":
    import_data()

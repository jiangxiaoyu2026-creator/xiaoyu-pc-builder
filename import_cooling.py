
import sqlite3
import uuid
import json
from datetime import datetime
import re

# Database path
DB_PATH = "data/xiaoyu.db"

# Cooling/Accessory data: (Price, Brand, Model)
cooling_data = [
    (180, "联力", "积木风扇3代120单只 黑色/白色"),
    (550, "联力", "积木风扇3代120盒 黑色/白色"),
    (210, "联力", "积木风扇3代 140单只 黑色/白色"),
    (260, "联力", "积木4代120单只 黑色/白色"),
    (800, "联力", "积木4代120盒 黑色/白色"),
    (280, "联力", "积木4代140单只 黑色/白色"),
    (400, "联力", "积木风扇4代 LCD带屏幕120单只 黑色/白色"),
    (1299, "联力", "积木风扇4代 LCD带屏幕120盒 黑色/白色"),
    (450, "联力", "积木风扇4代 LCD带屏幕140单只 黑色/白色"),
    (15, "棱镜", "4 PRO 黑/白LJ"),
    (20, "利民", "C12C无光 黑/白"),
    (25, "利民", "C12C ARGB 黑/白"),
    (29, "利民", "TL-S12 光环风扇 黑/白"),
    (35, "利民", "TL-S12-S 光环风扇 黑/白"),
    (650, "联力", "三代霓虹线 24+16-8窄"),
    (42, "丛林豹", "G120 V2"),
    (55, "丛林豹", "B120星际积木 v3"),
    (89, "瓦尔基里", "X12黑"),
    (89, "瓦尔基里", "X12白"),
    (65, "几何未来", "龙鳞2503B-14"),
    (65, "几何未来", "龙鳞2503B-12"),
    (65, "几何未来", "龙鳞2505Y"),
    (16, "棱镜", "7 PRO 黑/白LJ"),
    (25, "棱镜", "积木风扇"),
    (15, "棱镜", "普通argb风扇"),
    (799, "联力", "四代霓虹线 24+16-8窄+无线接收器"),
    (35, "丛林豹", "星环12cm 黑/白"),
    (52, "丛林豹", "星环14cm 黑/白"),
    (42, "丛林豹", "V2RS积木风扇 扇叶无光"),
    (18, "棱镜", "8pro"),
    (180, "乔思伯", "ZA360/ZB360水冷散热器"), # Clarified based on model name
    (115, "乔思伯", "ZA240水冷散热器"),
    (65, "乔思伯", "ZA120/ZB120风扇"),
    (39, "骨伽", "星链V2"),
    (180, "联力", "积木1代无线"),
    (290, "联力", "积木1代无线LCD"),
    (180, "乔思伯", "XA360水冷散热器"),
    (55, "乔思伯", "XA120风扇")
]

def get_category_and_specs(brand, model):
    m = model.lower()
    cat = "cooling"
    specs = {
        "type": "Fan",
        "size": "120mm",
        "lighting": "ARGB",
        "wattage": 5
    }
    
    # Category detection
    if "霓虹线" in m or "线" in m:
        cat = "other"
        return cat, {"type": "Accessory", "detail": "Lighting Cable"}
        
    # Specs detection for cooling
    if "360" in m or "240" in m or "水冷" in m:
        specs["type"] = "AIO"
        if "360" in m: specs["size"] = "360mm"
        elif "240" in m: specs["size"] = "240mm"
    
    if "140" in m or "14cm" in m:
        specs["size"] = "140mm"
    
    if "无光" in m or "普通" in m:
        specs["lighting"] = "Non-LED"
    
    return cat, specs

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    
    for price, brand, model in cooling_data:
        id = str(uuid.uuid4())
        cat, specs = get_category_and_specs(brand, model)
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, cat, brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} Cooling/Accessory products.")

if __name__ == "__main__":
    import_data()

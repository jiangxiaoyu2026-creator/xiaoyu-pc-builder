
import sqlite3
import uuid
import json
from datetime import datetime
import re

# Database path
DB_PATH = "data/xiaoyu.db"

# Storage data: (Price, Brand, Model)
storage_data = [
    (1550, "三星", "990PRO 1TB nvme pcie4.0"),
    (2400, "三星", "990PRO 2TB nvme pcie4.0"),
    (4200, "三星", "990PRO 4TB nvme pcie4.0"),
    (980, "致态", "Ti600 1TB nvme pcie4.0"),
    (1550, "致态", "Ti600 2TB nvme pcie4.0"),
    (1180, "致态", "TiPLUS7100 1TB"),
    (2040, "致态", "TiPLUS7100 2TB nvme pcie4.0"),
    (1450, "致态", "TiPRO9000 1TB"),
    (980, "宏碁掠夺者", "GM7 1TB"),
    (1550, "宏碁掠夺者", "GM7 2TB"),
    (2810, "宏碁掠夺者", "GM7 4TB"),
    (1580, "宏碁掠夺者", "GM7000 2TB"),
    (1000, "佰维", "NV7200 1T"),
    (1070, "佰维", "NV7400 1T"),
    (2090, "佰维", "NV7400 2T"),
    (600, "致态", "Ti600 500G"),
    (4150, "致态", "Ti PLUS 7100 4T"),
    (1400, "三星", "990EVO PLUS 1T"),
    (2300, "三星", "990EVO PLUS 2T"),
    (980, "华方", "掉翼eKitStor Xtreme 200 1TB"),
    (1080, "西数", "SN5100 1t"),
    (690, "金士顿", "NV3 500G NVMe PCIe 4.0"),
    (1030, "金士顿", "NV3 1T NVMe PCIe 4.0"),
    (1650, "金士顿", "NV3 2T NVMe PCIe 4.0"),
    (1100, "西数", "7100 1T"),
    (2000, "西数", "7100 2T"),
    (4180, "西数", "7100 4T"),
    (530, "铠侠", "T5000 512G"),
    (850, "铠侠", "T7000 1T"),
    (550, "酷兽", "TQP3000 512G"),
    (1500, "西数", "SN8100 1T"),
    (2550, "西数", "SN8100 2T"),
    (155, "铠侠", "T500 128G 2.5SATA3.0"),
    (260, "铠侠", "T500 256G 2.5SATA3.0"),
    (1080, "西数", "SN3000 1T"),
    (240, "铠侠", "T400 256G M.2"),
    (420, "铠侠", "T400 512G M.2"),
    (799, "七彩虹", "CF600 1T"),
    (1700, "三星", "9100PRO 1T"),
    (4500, "三星", "9100PRO 4T"),
    (820, "酷兽", "TQP3000 1T"),
    (860, "酷兽", "TQP4000 1T"),
    (2800, "三星", "9100 pro 2t")
]

def get_storage_specs(model):
    m = model.upper()
    interface = "NVMe PCIe 4.0"
    capacity = "1TB"
    type_ = "SSD"
    
    # Capacity heuristics
    if "512G" in m: capacity = "512GB"
    elif "500G" in m: capacity = "500GB"
    elif "256G" in m: capacity = "256GB"
    elif "128G" in m: capacity = "128GB"
    elif "2T" in m: capacity = "2TB"
    elif "4T" in m: capacity = "4TB"
    elif "8T" in m: capacity = "8TB"
    elif "1T" in m: capacity = "1TB"
    
    # Interface heuristics
    if "SATA" in m:
        interface = "SATA 3.0"
    elif "PCIE3.0" in m or "3.0" in m:
        interface = "NVMe PCIe 3.0"
    
    # Speed/Tier (Generic estimates)
    sequentialRead = 7450 if "990PRO" in m or "7100" in m or "GM7" in m else 5000
    if "SATA" in m: sequentialRead = 560

    return {
        "interface": interface,
        "capacity": capacity,
        "sequentialRead": f"{sequentialRead}MB/s",
        "type": type_
    }

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    seen = set()
    
    for price, brand, model in storage_data:
        key = (brand, model)
        if key in seen: continue
        seen.add(key)
        
        id = str(uuid.uuid4())
        specs = get_storage_specs(model)
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, "storage", brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} Storage products.")

if __name__ == "__main__":
    import_data()

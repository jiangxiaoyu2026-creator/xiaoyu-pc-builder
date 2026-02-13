
import sqlite3
import uuid
import json
from datetime import datetime

# Database path
DB_PATH = "data/xiaoyu.db"

# Data list: (Price, Brand, Model)
cpus_data = [
    (0, "Intel", "i9-14900KS原盒 预定"),
    (0, "Intel", "i9-14900K原盒"),
    (2760, "Intel", "i9-14900KF原盒"),
    (2699, "Intel", "i9-14900KF散片 参考价"),
    (0, "Intel", "i7-14700K原盒"),
    (2160, "Intel", "i7-14700KF原盒"),
    (1960, "Intel", "i7-14700KF散片"),
    (0, "Intel", "i7-14700K散片"),
    (1460, "Intel", "i5-14600KF原盒"),
    (1460, "Intel", "i5-14600KF散片"),
    (1520, "Intel", "i5-14600K盒包"),
    (0, "Intel", "i5-14600K散片"),
    (0, "Intel", "i5-13600KF原盒"),
    (0, "Intel", "i5-13600KF散片"),
    (1540, "Intel", "i7-12700KF散片"),
    (0, "Intel", "i5-12600KF散片"),
    (0, "Intel", "i5-12600KF盒包"),
    (1060, "Intel", "i5-12400散片"),
    (755, "Intel", "i5-12400F散片"),
    (0, "Intel", "i5-13400散片"),
    (870, "Intel", "i5-13400F散片"),
    (820, "Intel", "i5-12490F"),
    (730, "Intel", "i3-12100散片"),
    (490, "Intel", "i3-12100F散片"),
    (0, "Intel", "i5-14400散片"),
    (940, "Intel", "i5-14400F散片"),
    (820, "AMD", "R5 7500F散片"),
    (850, "AMD", "R5 7500F盒包"),
    (0, "AMD", "R7 7800X3D盒包"),
    (1920, "AMD", "R7 7800X3D散片"),
    (0, "AMD", "R9 7950X3D盒包"),
    (0, "AMD", "R9 7950X盒包"),
    (0, "Intel", "i3-12300T散片"),
    (700, "AMD", "R5-5600散片"),
    (780, "AMD", "R5-5600盒包"),
    (0, "AMD", "R5-5600G盒包"),
    (870, "AMD", "R5-5600GT散片"),
    (0, "Intel", "i7-13700KF盒"),
    (0, "Intel", "i7-13700KF散片"),
    (0, "Intel", "i7-13700K盒包"),
    (0, "Intel", "i7-13700K散片"),
    (0, "AMD", "R9 7900X盒包"),
    (0, "AMD", "R9 7900X散片"),
    (0, "AMD", "R9 7900X3D散片"),
    (0, "AMD", "R9 7900X3D盒包"),
    (1370, "AMD", "R5-9600X盒包"),
    (1170, "AMD", "R5-9600X散片"),
    (0, "AMD", "R7-5700X3D盒"),
    (0, "AMD", "R7-5700X3D散"),
    (920, "AMD", "R7-5700X散"),
    (1770, "AMD", "R7-9700X盒"),
    (0, "Intel", "i5-12600K散片"),
    (0, "Intel", "i9-12900KS盒包"),
    (0, "Intel", "i9-12900K散片"),
    (0, "Intel", "i5-13490F盒"),
    (0, "AMD", "9900X盒"),
    (3480, "AMD", "9950X盒"),
    (1770, "Intel", "Ultra 7 265K盒"),
    (1270, "Intel", "Ultra 5 245KF盒"),
    (4200, "Intel", "Ultra 9 285K 盒"),
    (3200, "AMD", "9800X3D盒"),
    (2760, "AMD", "9800X3D散片"),
    (0, "AMD", "7600X 3D盒"),
    (1620, "AMD", "R7-9700X散"),
    (4790, "AMD", "9950X3D盒"),
    (4340, "AMD", "9950X3D散"),
    (1620, "Intel", "Ultra 7 265KF盒"),
    (720, "AMD", "7400F"),
    (150, "Intel", "I3 8100"),
    (200, "Intel", "I3-9100"),
    (790, "AMD", "5600X"),
]

def get_socket(model):
    model_lower = model.lower()
    if any(x in model_lower for x in ["14900", "14700", "14600", "14400", "13900", "13700", "13600", "13400", "12900", "12700", "12600", "12400", "12100", "12300", "13490"]):
        return "LGA1700"
    if any(x in model_lower for x in ["7500f", "7800x3d", "7950x", "7900x", "9600x", "9700x", "9900x", "9950x", "9800x3d", "7600x", "7400f"]):
        return "AM5"
    if any(x in model_lower for x in ["5600", "5700"]):
        return "AM4"
    if "ultra" in model_lower:
        return "LGA1851"
    if "i3 8100" in model_lower or "i3-9100" in model_lower:
        return "LGA1151"
    return "Unknown"

def get_memory(socket):
    if socket == "LGA1700": return "DDR4/DDR5"
    if socket == "AM5": return "DDR5"
    if socket == "AM4": return "DDR4"
    if socket == "LGA1851": return "DDR5"
    if socket == "LGA1151": return "DDR4"
    return "DDR4"

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    
    for price, brand, model in cpus_data:
        id = str(uuid.uuid4())
        socket = get_socket(model)
        mem = get_memory(socket)
        specs = {
            "socket": socket,
            "memoryType": mem,
            "cores": 0,
            "threads": 0,
            "frequency": "",
            "wattage": 0,
            "integratedGpu": "是" if "f" not in model.lower() else "否"
        }
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, "cpu", brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} CPU products.")

if __name__ == "__main__":
    import_data()

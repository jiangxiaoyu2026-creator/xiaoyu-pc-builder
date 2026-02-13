
import sqlite3
import json
import datetime
import os

# Data from clientData.ts
HARDWARE_DB = [
    # CPU
    { "id": "c1", "category": "cpu", "brand": "Intel", "model": "i5-13600KF", "price": 1899, "specs": { "socket": "LGA1700", "wattage": 125, "memoryType": "DDR5" } },
    { "id": "c2", "category": "cpu", "brand": "Intel", "model": "i5-12400F", "price": 849, "specs": { "socket": "LGA1700", "wattage": 65, "memoryType": "DDR4" } },
    { "id": "c3", "category": "cpu", "brand": "AMD", "model": "R5 7500F", "price": 1099, "specs": { "socket": "AM5", "wattage": 65, "memoryType": "DDR5" } },
    { "id": "c4", "category": "cpu", "brand": "AMD", "model": "R7 7800X3D", "price": 2699, "specs": { "socket": "AM5", "wattage": 120, "memoryType": "DDR5" } },
    # Mainboard
    { "id": "m1", "category": "mainboard", "brand": "MSI", "model": "B760M 迫击炮 II", "price": 1299, "specs": { "socket": "LGA1700", "memoryType": "DDR5", "formFactor": "MATX" } },
    { "id": "m2", "category": "mainboard", "brand": "ASUS", "model": "H610M-A", "price": 599, "specs": { "socket": "LGA1700", "memoryType": "DDR4", "formFactor": "MATX" } },
    { "id": "m3", "category": "mainboard", "brand": "Gigabyte", "model": "B650M 小雕", "price": 999, "specs": { "socket": "AM5", "memoryType": "DDR5", "formFactor": "MATX" } },
    # GPU
    { "id": "g1", "category": "gpu", "brand": "Colorful", "model": "RTX 4060 战斧", "price": 2399, "specs": { "wattage": 115 } },
    { "id": "g2", "category": "gpu", "brand": "ASUS", "model": "RTX 4070 Ti Super", "price": 6499, "specs": { "wattage": 285 } },
    { "id": "g3", "category": "gpu", "brand": "Sapphire", "model": "RX 7800 XT", "price": 3899, "specs": { "wattage": 260 } },
    # RAM
    { "id": "r1", "category": "ram", "brand": "Kingston", "model": "Fury 16G DDR4 3200", "price": 259, "specs": { "memoryType": "DDR4" } },
    { "id": "r2", "category": "ram", "brand": "Corsair", "model": "Vengeance 32G(16*2) DDR5 6000", "price": 799, "specs": { "memoryType": "DDR5" } },
    # Disk
    { "id": "d1", "category": "disk", "brand": "Samsung", "model": "990 PRO 1TB", "price": 699, "specs": {} },
    { "id": "d2", "category": "disk", "brand": "WD", "model": "SN770 1TB", "price": 459, "specs": {} },
    # Power
    { "id": "p1", "category": "power", "brand": "GreatWall", "model": "G7 750W 金牌", "price": 499, "specs": { "wattage": 750 } },
    # Cooling
    { "id": "cl1", "category": "cooling", "brand": "Valkyrie", "model": "A360 水冷", "price": 399, "specs": {} },
    { "id": "cl2", "category": "cooling", "brand": "DeepCool", "model": "AK620 风冷", "price": 299, "specs": {} },
    # Fan
    { "id": "f1", "category": "fan", "brand": "LianLi", "model": "积木一代 12cm", "price": 179, "specs": {} },
    { "id": "f2", "category": "fan", "brand": "Phanteks", "model": "T30 12cm", "price": 199, "specs": {} },
    # Case
    { "id": "ca1", "category": "case", "brand": "LianLi", "model": "包豪斯海景房", "price": 899, "specs": { "formFactor": "ATX" } },
    # Mouse
    { "id": "mo1", "category": "mouse", "brand": "Logitech", "model": "G Pro X Superlight", "price": 899, "specs": {} },
    { "id": "mo2", "category": "mouse", "brand": "Razer", "model": "Viper V3 Pro", "price": 1099, "specs": {} },
    # Keyboard
    { "id": "kb1", "category": "keyboard", "brand": "VGN", "model": "V98 Pro", "price": 399, "specs": {} },
]

DB_PATH = "/Users/mac/new/data/xiaoyu.db"

def restore():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"Restoring {len(HARDWARE_DB)} legacy items...")
    
    now = datetime.datetime.utcnow().isoformat()
    
    count = 0
    for item in HARDWARE_DB:
        try:
            # Specs to JSON string
            specs_json = json.dumps(item.get("specs", {}), ensure_ascii=False)
            image_url = f"https://placeholder.com/400x400?text={item['model']}"
            
            cursor.execute("""
                INSERT OR REPLACE INTO hardware 
                (id, category, brand, model, price, status, specs, image, sortOrder, createdAt, isDiscount, isRecommended, isNew)
                VALUES (?, ?, ?, ?, ?, 'active', ?, ?, 100, ?, 0, 0, 0)
            """, (
                item['id'],
                item['category'],
                item['brand'],
                item['model'],
                item['price'],
                specs_json,
                image_url,
                now
            ))
            count += 1
        except Exception as e:
            print(f"Error inserting {item['id']}: {e}")
            
    conn.commit()
    conn.close()
    print(f"Successfully restored {count} items.")

if __name__ == "__main__":
    restore()

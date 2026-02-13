
import os
import sys
import json
from sqlmodel import Session, select, delete
from sqlalchemy import text

# Add parent directory to path to import app modules if run directly (though -m is preferred)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from server_py.db import engine, init_db
from server_py.models import Hardware

# HARDWARE_DB from clientData.ts
HARDWARE_DB = [
    # CPU
    { "id": 'c1', "category": 'cpu', "brand": 'Intel', "model": 'i5-13600KF', "price": 1899, "specs": { "socket": 'LGA1700', "wattage": 125, "memoryType": 'DDR5' } },
    { "id": 'c2', "category": 'cpu', "brand": 'Intel', "model": 'i5-12400F', "price": 849, "specs": { "socket": 'LGA1700', "wattage": 65, "memoryType": 'DDR4' } },
    { "id": 'c3', "category": 'cpu', "brand": 'AMD', "model": 'R5 7500F', "price": 1099, "specs": { "socket": 'AM5', "wattage": 65, "memoryType": 'DDR5' } },
    { "id": 'c4', "category": 'cpu', "brand": 'AMD', "model": 'R7 7800X3D', "price": 2699, "specs": { "socket": 'AM5', "wattage": 120, "memoryType": 'DDR5' } },
    # Mainboard
    { "id": 'm1', "category": 'mainboard', "brand": 'MSI', "model": 'B760M 迫击炮 II', "price": 1299, "specs": { "socket": 'LGA1700', "memoryType": 'DDR5', "formFactor": 'MATX' } },
    { "id": 'm2', "category": 'mainboard', "brand": 'ASUS', "model": 'H610M-A', "price": 599, "specs": { "socket": 'LGA1700', "memoryType": 'DDR4', "formFactor": 'MATX' } },
    { "id": 'm3', "category": 'mainboard', "brand": 'Gigabyte', "model": 'B650M 小雕', "price": 999, "specs": { "socket": 'AM5', "memoryType": 'DDR5', "formFactor": 'MATX' } },
    # GPU
    { "id": 'g1', "category": 'gpu', "brand": 'Colorful', "model": 'RTX 4060 战斧', "price": 2399, "specs": { "wattage": 115 } },
    { "id": 'g2', "category": 'gpu', "brand": 'ASUS', "model": 'RTX 4070 Ti Super', "price": 6499, "specs": { "wattage": 285 } },
    { "id": 'g3', "category": 'gpu', "brand": 'Sapphire', "model": 'RX 7800 XT', "price": 3899, "specs": { "wattage": 260 } },
    # RAM
    { "id": 'r1', "category": 'ram', "brand": 'Kingston', "model": 'Fury 16G DDR4 3200', "price": 259, "specs": { "memoryType": 'DDR4' } },
    { "id": 'r2', "category": 'ram', "brand": 'Corsair', "model": 'Vengeance 32G(16*2) DDR5 6000', "price": 799, "specs": { "memoryType": 'DDR5' } },
    # Disk
    { "id": 'd1', "category": 'disk', "brand": 'Samsung', "model": '990 PRO 1TB', "price": 699, "specs": {} },
    { "id": 'd2', "category": 'disk', "brand": 'WD', "model": 'SN770 1TB', "price": 459, "specs": {} },
    # Power
    { "id": 'p1', "category": 'power', "brand": 'GreatWall', "model": 'G7 750W 金牌', "price": 499, "specs": { "wattage": 750 } },
    # Cooling
    { "id": 'cl1', "category": 'cooling', "brand": 'Valkyrie', "model": 'A360 水冷', "price": 399, "specs": {} },
    { "id": 'cl2', "category": 'cooling', "brand": 'DeepCool', "model": 'AK620 风冷', "price": 299, "specs": {} },
    # Fan
    { "id": 'f1', "category": 'fan', "brand": 'LianLi', "model": '积木一代 12cm', "price": 179, "specs": {} },
    { "id": 'f2', "category": 'fan', "brand": 'Phanteks', "model": 'T30 12cm', "price": 199, "specs": {} },
    # Case
    { "id": 'ca1', "category": 'case', "brand": 'LianLi', "model": '包豪斯海景房', "price": 899, "specs": { "formFactor": 'ATX' } },
    # Mouse
    { "id": 'mo1', "category": 'mouse', "brand": 'Logitech', "model": 'G Pro X Superlight', "price": 899, "specs": {} },
    { "id": 'mo2', "category": 'mouse', "brand": 'Razer', "model": 'Viper V3 Pro', "price": 1099, "specs": {} },
    # Keyboard
    { "id": 'kb1', "category": 'keyboard', "brand": 'VGN', "model": 'V98 Pro', "price": 399, "specs": {} },
]

def fix_data():
    print("Connecting to database...")
    init_db()
    
    with Session(engine) as session:
        # Check current count
        count = session.exec(select(Hardware)).all()
        print(f"Current hardware count: {len(count)}")
        
        # Option 1: Clear all hardware and re-seed (Safest for this task to ensure IDs match)
        print("Clearing existing hardware data...")
        session.exec(delete(Hardware))
        session.commit()
        
        print("Seeding fresh data from HARDWARE_DB...")
        for item in HARDWARE_DB:
            hw = Hardware(
                id=item["id"],
                category=item["category"],
                brand=item["brand"],
                model=item["model"],
                price=item["price"],
                specs=json.dumps(item["specs"]), # Convert dict to JSON string for storage
                status="active",
                sortOrder=100
            )
            session.add(hw)
            
        session.commit()
        print(f"Successfully seeded {len(HARDWARE_DB)} items.")
        
        # Verify
        new_count = session.exec(select(Hardware)).all()
        print(f"New hardware count: {len(new_count)}")
        
        # Print sample to verify ID
        sample = session.exec(select(Hardware).limit(1)).first()
        if sample:
            print(f"Sample item: ID={sample.id}, Model={sample.model}, Price={sample.price}")

if __name__ == "__main__":
    fix_data()

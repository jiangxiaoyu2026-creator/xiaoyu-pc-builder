import os
import sys
import json
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import engine
from sqlmodel import Session, select
from models import Hardware

def parse_cpu(name: str):
    name = name.upper()
    specs = {}
    
    # Sockets
    if any(x in name for x in ["12100", "12400", "12600", "13100", "13400", "13600", "13700", "13900", "14100", "14400", "14600", "14700", "14900"]):
        specs["socket_type"] = "LGA1700"
    elif any(x in name for x in ["245KF", "265K", "285K"]):
        specs["socket_type"] = "LGA1851"
    elif any(x in name for x in ["5600", "5700"]):
        specs["socket_type"] = "AM4"
    elif any(x in name for x in ["7500", "7600", "7800", "7950", "9600", "9700", "9800", "9950"]):
        specs["socket_type"] = "AM5"

    intel_scores = {
         "285K": (1500000, 200),
         "265K": (1200000, 160),
         "245K": (1000000, 150),
         "14900": (1200000, 250), "14700": (1000000, 200), "14600": (880000, 160), "14400": (650000, 80), "14100": (450000, 65),
         "13900": (1100000, 250), "13700": (950000, 200), "13600": (820000, 160), "13400": (600000, 80), "13100": (420000, 65),
         "12900": (900000,  200), "12700": (800000, 150), "12600": (700000,  120), "12400": (520000, 65), "12100": (390000, 65)
    }
    
    amd_scores = {
         "9950": (1400000, 170), "9850": (1250000, 170), "9800": (1200000, 120), "9700": (1000000, 100), "9600": (800000, 80),
         "7950": (1200000, 170), "7800": (1000000, 120), "7600": (700000, 100), "7500": (650000, 65),
         "5700": (600000, 65), "5600": (550000, 65)
    }

    for k, v in intel_scores.items():
        if k in name:
            specs["master_lu_score"] = v[0]
            specs["power_draw"] = v[1]
            break
            
    for k, v in amd_scores.items():
        if k in name:
            specs["master_lu_score"] = v[0]
            specs["power_draw"] = v[1]
            break

    return specs

def parse_gpu(name: str):
    name = name.upper()
    specs = {}
    
    gpu_scores = {
        "5090": (2000000, 450), "5080": (1400000, 320), "5070TI": (1200000, 250), "5070": (1000000, 220), "5060TI": (650000, 180), "5060": (500000, 150), "5050": (350000, 120),
        "4090": (1800000, 450), "4080": (1200000, 320), "4070TI": (1000000, 250), "4070": (850000, 200), "4060TI": (500000, 160), "4060": (400000, 115),
        "3060": (380000, 170), "3050": (280000, 130),
        "9070XT": (1100000, 260), "9060XT": (650000, 180), "7650GRE": (450000, 150)
    }
    
    for k, v in gpu_scores.items():
        if k in name:
            specs["master_lu_score"] = v[0]
            specs["power_draw"] = v[1]
            break
            
    return specs

def parse_ram(name: str):
    name = name.upper()
    specs = {}
    
    if "DDR5" in name or any(x in name for x in ["6000", "6400", "6800", "7200", "7600"]):
        specs["ram_type"] = "DDR5"
    elif "DDR4" in name or any(x in name for x in ["3200", "3600"]):
        specs["ram_type"] = "DDR4"

    ram_scores = {
        "7600": 160000, "7200": 150000, "6800": 140000, "6400": 130000, "6000": 120000,
        "3600": 90000, "3200": 80000, "2666": 70000
    }
    
    for k, v in ram_scores.items():
        if k in name:
            specs["master_lu_score"] = v
            break
            
    return specs
    
def parse_power(name: str):
    name = name.upper()
    specs = {}
    
    # 查找功率数字: 850w, 1000W等
    match = re.search(r'(\d+)\s*[wW]|(\d+)\s*额定', name)
    if match:
        watt = match.group(1) or match.group(2)
        specs["wattage"] = int(watt)
        
    # 如果正则没抓到，找特定数字
    for w in [500, 550, 600, 650, 700, 750, 800, 850, 900, 1000, 1100, 1200, 1300, 1600]:
        if str(w) in name:
            specs["wattage"] = w
            
    return specs

with Session(engine) as session:
    items = session.exec(select(Hardware)).all()
    count = 0
    for item in items:
        try:
            specs = item.specs if isinstance(item.specs, dict) else (json.loads(item.specs) if item.specs else {})
        except:
            specs = {}
            
        name = f"{item.brand} {item.model}"
        updates = {}
        
        if item.category == "cpu":
            updates = parse_cpu(name)
        elif item.category == "gpu":
            updates = parse_gpu(name)
        elif item.category == "ram":
            updates = parse_ram(name)
        elif item.category == "power":
            updates = parse_power(name)
        elif item.category == "mainboard":
            if "Z890" in name.upper() or "B860" in name.upper():
                updates["socket_type"] = "LGA1851"
                updates["ram_type"] = "DDR5"
            elif "Z790" in name.upper() or "B760" in name.upper() or "Z690" in name.upper() or "B660" in name.upper() or "H610" in name.upper():
                updates["socket_type"] = "LGA1700"
            elif "X870" in name.upper() or "X670" in name.upper() or "B650" in name.upper():
                updates["socket_type"] = "AM5"
                updates["ram_type"] = "DDR5"
        
        # 应用更新
        updated = False
        for k, v in updates.items():
            if specs.get(k) != v:
                specs[k] = v
                updated = True
                
        if updated:
            item.specs = specs
            session.add(item)
            count += 1
            print(f"[{item.category}] 识别成功: {name} -> {updates}")
            
    session.commit()
    print(f"====== 万物参数初始化成功！共自动推算写入了 {count} 个商品 ======")

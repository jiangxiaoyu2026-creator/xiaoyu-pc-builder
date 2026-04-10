import os
import sys
import json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import engine, get_session
from sqlmodel import Session, select
from models import Hardware

MOCK_SCORES = {
    "12100": {"master_lu_score": 400000, "power_draw": 65, "socket_type": "LGA1700", "ram_type": "DDR4"},
    "12100F": {"master_lu_score": 390000, "power_draw": 65, "socket_type": "LGA1700", "ram_type": "DDR4"},
    "5600GT": {"master_lu_score": 520000, "power_draw": 65, "socket_type": "AM4", "ram_type": "DDR4"},
    "5600X": {"master_lu_score": 550000, "power_draw": 65, "socket_type": "AM4", "ram_type": "DDR4"},
    "5060": {"master_lu_score": 400000, "power_draw": 150},
    "5050": {"master_lu_score": 280000, "power_draw": 115},
    "3050": {"master_lu_score": 250000, "power_draw": 130},
    "Z890": {"socket_type": "LGA1851", "ram_type": "DDR5", "form_factor": "ATX"},
    "X870": {"socket_type": "AM5", "ram_type": "DDR5", "form_factor": "ATX"},
    "3200": {"master_lu_score": 80000, "ram_type": "DDR4"},
    "6400": {"master_lu_score": 120000, "ram_type": "DDR5"},
    "6800": {"master_lu_score": 140000, "ram_type": "DDR5"},
    "1T": {"master_lu_score": 100000},
    "2T": {"master_lu_score": 120000},
}

with Session(engine) as session:
    items = session.exec(select(Hardware)).all()
    count = 0
    for item in items:
        specs = item.specs if isinstance(item.specs, dict) else {}
        if isinstance(item.specs, str):
            try:
                specs = json.loads(item.specs)
            except:
                pass
                
        updated = False
        name = f"{item.brand} {item.model}".upper()
        
        for k, v in MOCK_SCORES.items():
            if k in name:
                for vk, vv in v.items():
                    if vk not in specs: # only set if not exists
                        specs[vk] = vv
                        updated = True
        
        if updated:
            item.specs = specs
            session.add(item)
            count += 1
            print(f"Updated {name} -> {specs}")
            
    session.commit()
    print(f"Total updated: {count}")

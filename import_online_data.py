import json
from sqlmodel import Session, select
from server_py.db import engine
from server_py.models import Hardware, Config

with open('online_products_data.json', 'r') as f:
    products = json.load(f)

with open('online_configs_data.json', 'r') as f:
    configs = json.load(f)

with Session(engine) as session:
    # Optional: Clear existing to mirror production perfectly
    print("Clearing local hardware and configs...")
    for hw in session.exec(select(Hardware)).all(): session.delete(hw)
    for c in session.exec(select(Config)).all(): session.delete(c)
    session.commit()

    print(f"Importing {len(products)} hardware items...")
    for p in products:
        # p is dict
        hw = Hardware(**p)
        # Handle specs serialization if needed
        if isinstance(hw.specs, dict) or isinstance(hw.specs, list):
            hw.specs = json.dumps(hw.specs, ensure_ascii=False)
        session.add(hw)

    print(f"Importing {len(configs)} configs...")
    for c in configs:
        c_obj = Config(**c)
        if isinstance(c_obj.items, dict) or isinstance(c_obj.items, list):
            c_obj.items = json.dumps(c_obj.items, ensure_ascii=False)
        if isinstance(c_obj.tags, list):
            c_obj.tags = json.dumps(c_obj.tags, ensure_ascii=False)
        if isinstance(c_obj.showcaseImages, list):
            c_obj.showcaseImages = json.dumps(c_obj.showcaseImages, ensure_ascii=False)
        session.add(c_obj)

    session.commit()
    print("Import complete.")

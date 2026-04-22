# -*- coding: utf-8 -*-
import json

# Search for benchmark products across all data
for fname, label in [("weekly_data.json", "weekly"), ("monthly_data.json", "monthly")]:
    with open("/Users/mac/new/video-factory/temp/" + fname, "r") as f:
        data = json.load(f)["data"]
    
    print("=== %s ===" % label)
    all_items = []
    for cat, cdata in data["categories"].items():
        items = cdata["items"] if isinstance(cdata, dict) else cdata
        for item in items:
            item["_cat"] = cat
            all_items.append(item)
    
    # Search for NV3 / Kingston disk benchmark
    for item in all_items:
        n = item["name"].lower()
        if "nv3" in n or "nv2" in n or "sn580" in n:
            print("  DISK BENCHMARK: %s | %.0f -> %.0f | %+.0f" % (item["name"], item["oldPrice"], item["newPrice"], item["changeAmount"]))
    
    # Search for DDR4 3600 / DDR5 6000 C28 benchmark
    for item in all_items:
        n = item["name"].lower()
        if ("3600" in n and item["_cat"] == "ram") or ("6000" in n and "c28" in n and item["_cat"] == "ram"):
            print("  RAM BENCHMARK: %s | %.0f -> %.0f | %+.0f" % (item["name"], item["oldPrice"], item["newPrice"], item["changeAmount"]))

print("\n\n=== Searching full hardware DB for benchmark products ===")

import sys
sys.path.append("/Users/mac/new")
from sqlmodel import Session, select
from server_py.db import engine
from server_py.models import Hardware

with Session(engine) as session:
    for kw in ["NV3", "NV2", "3600", "6000"]:
        results = session.exec(select(Hardware).where(Hardware.status == "active")).all()
        matches = [h for h in results if kw.lower() in h.model.lower() or kw.lower() in h.name.lower()]
        if matches:
            print("\n--- Keyword: %s (%d matches) ---" % (kw, len(matches)))
            for h in matches[:10]:
                prev = "(prev: %.0f)" % h.previousPrice if h.previousPrice else ""
                print("  [%s] %s %s | price: %.0f %s" % (h.category, h.brand, h.model, h.price, prev))

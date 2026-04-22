# -*- coding: utf-8 -*-
import json

with open("/Users/mac/new/video-factory/temp/fresh_weekly.json", "r") as f:
    data = json.load(f)["data"]

ram_items = data["categories"]["ram"]["items"]

# Correctly aggregate multi-record products
def aggregate(items, name_filter):
    matches = [x for x in items if name_filter(x["name"])]
    if not matches:
        return None
    sorted_m = sorted(matches, key=lambda r: r["time"])
    return {
        "name": sorted_m[0]["name"],
        "week_start": sorted_m[0]["oldPrice"],
        "week_end": sorted_m[-1]["newPrice"],
        "net_change": sorted_m[-1]["newPrice"] - sorted_m[0]["oldPrice"],
        "records": len(sorted_m)
    }

# DDR5 6000 C28 star blade black 32G
r1 = aggregate(ram_items, lambda n: "\u661f\u5203\u9ed1" in n and "6000" in n and "C28" in n and "32G" in n)
print("DDR5 starblade black 6000 C28 32G:", r1)

# DDR4 3600 - try yinjue first
r2 = aggregate(ram_items, lambda n: "\u94f6\u7235" in n and "3600" in n and "32G" in n)
print("DDR4 yinjue 3600 32G:", r2)

# DDR4 3600 - star blade black
r3 = aggregate(ram_items, lambda n: "\u661f\u5203\u9ed1" in n and "3600" in n and "32G" in n)
print("DDR4 starblade black 3600 32G:", r3)

# DDR4 3600 - corsair
r4 = aggregate(ram_items, lambda n: "\u6d77\u76d7\u8239" in n and "3600" in n and "16*2" in n)
print("DDR4 corsair 3600 16*2:", r4)

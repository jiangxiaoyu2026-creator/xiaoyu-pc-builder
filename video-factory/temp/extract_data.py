# -*- coding: utf-8 -*-
import json

# Step 1: Check daily first
with open("/Users/mac/new/video-factory/temp/fresh_daily.json", "r") as f:
    daily = json.load(f)["data"]
print("DAILY totalItemChanged: %d" % daily["summary"]["totalItemChanged"])

if daily["summary"]["totalItemChanged"] == 0:
    print("Daily is empty, using weekly.\n")
    with open("/Users/mac/new/video-factory/temp/fresh_weekly.json", "r") as f:
        data = json.load(f)["data"]
else:
    data = daily

s = data["summary"]
print("=== SUMMARY ===")
print("period: %s" % data["meta"]["period"])
print("totalChanged: %d | drops: %d | rises: %d" % (s["totalItemChanged"], s["totalItemsDropped"], s["totalItemsIncreased"]))
print("avgDrop: %.2f | avgRise: %.2f" % (s["averageDrop"], s["averageIncrease"]))

# Step 2: Category breakdown
print("\n=== CATEGORIES ===")
for cat in ["ram", "disk", "cpu", "gpu"]:
    cdata = data["categories"].get(cat)
    if not cdata:
        print("\n[%s] NO DATA" % cat)
        continue
    items = cdata["items"] if isinstance(cdata, dict) else cdata
    count = cdata.get("changedItemCount", len(items)) if isinstance(cdata, dict) else len(items)
    drops = [x for x in items if x["changeAmount"] < 0]
    rises = [x for x in items if x["changeAmount"] > 0]
    unchanged = [x for x in items if x["changeAmount"] == 0]
    print("\n[%s] total=%d drops=%d rises=%d unchanged=%d" % (cat, count, len(drops), len(rises), len(unchanged)))
    
    # Top drops
    for x in sorted(drops, key=lambda i: i["changeAmount"])[:3]:
        print("  DROP: %s | %.0f -> %.0f | %+.0f (%+.2f%%)" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"], x["changePercent"]))
    # Top rises
    for x in sorted(rises, key=lambda i: i["changeAmount"], reverse=True)[:3]:
        print("  RISE: %s | %.0f -> %.0f | %+.0f (%+.2f%%)" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"], x["changePercent"]))

# Step 3: Benchmark products - search in categories
print("\n=== BENCHMARKS ===")

# NV3
print("\n-- NV3 (disk) --")
disk_items = data["categories"].get("disk", {}).get("items", []) if isinstance(data["categories"].get("disk", {}), dict) else data["categories"].get("disk", [])
nv3_found = False
nv3_records = {}
for x in disk_items:
    if "NV3" in x["name"]:
        nv3_found = True
        key = x["name"]
        if key not in nv3_records:
            nv3_records[key] = []
        nv3_records[key].append(x)
if nv3_found:
    for name, records in nv3_records.items():
        sorted_r = sorted(records, key=lambda r: r["time"])
        first_old = sorted_r[0]["oldPrice"]
        last_new = sorted_r[-1]["newPrice"]
        total_change = last_new - first_old
        print("  %s | week_start=%.0f -> week_end=%.0f | net_change=%+.0f | records=%d" % (name, first_old, last_new, total_change, len(records)))
else:
    print("  NV3 NOT in this period's changes (price stable)")

# DDR4 yinjue 3600
print("\n-- DDR4 yinjue 3600 32G (ram) --")
ram_items = data["categories"].get("ram", {}).get("items", []) if isinstance(data["categories"].get("ram", {}), dict) else data["categories"].get("ram", [])
yinjue_found = False
for x in ram_items:
    if "\xe9\x93\xb6\xe7\x88\xb5".encode().decode() in x["name"] and "3600" in x["name"] and ("32G" in x["name"] or "16G" in x["name"]):
        yinjue_found = True
        print("  %s | %.0f -> %.0f | %+.0f" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"]))
if not yinjue_found:
    print("  NOT FOUND in changes (price stable this period)")

# DDR5 starblade 6000 C28
print("\n-- DDR5 starblade 6000 C28 32G (ram) --")
star_records = {}
for x in ram_items:
    if "\xe6\x98\x9f\xe5\x88\x83\xe9\xbb\x91".encode().decode() in x["name"] and "6000" in x["name"] and "C28" in x["name"] and "32G" in x["name"]:
        key = x["name"]
        if key not in star_records:
            star_records[key] = []
        star_records[key].append(x)
if star_records:
    for name, records in star_records.items():
        sorted_r = sorted(records, key=lambda r: r["time"])
        first_old = sorted_r[0]["oldPrice"]
        last_new = sorted_r[-1]["newPrice"]
        total_change = last_new - first_old
        print("  %s | week_start=%.0f -> week_end=%.0f | net_change=%+.0f | records=%d" % (name, first_old, last_new, total_change, len(records)))
else:
    print("  NOT FOUND in changes (price stable this period)")

# Step 4: Extreme changes (top 5 each)
print("\n=== EXTREME CHANGES ===")
print("\nTop 5 Drops:")
for i, d in enumerate(data["extremeChanges"]["biggestDrops"][:5], 1):
    print("  %d. %s (%s) | %.0f -> %.0f | %+.0f (%+.2f%%)" % (i, d["name"], d["category"], d["oldPrice"], d["newPrice"], d["changeAmount"], d["changePercent"]))
print("\nTop 5 Rises:")
for i, d in enumerate(data["extremeChanges"]["biggestIncreases"][:5], 1):
    print("  %d. %s (%s) | %.0f -> %.0f | %+.0f (%+.2f%%)" % (i, d["name"], d["category"], d["oldPrice"], d["newPrice"], d["changeAmount"], d["changePercent"]))

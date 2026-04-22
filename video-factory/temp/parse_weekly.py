# -*- coding: utf-8 -*-
import json

with open("/Users/mac/new/video-factory/temp/weekly_data.json", "r") as f:
    data = json.load(f)["data"]

print("=" * 60)
print("period: %s | generated: %s" % (data["meta"]["period"], data["meta"]["generatedAt"]))
print("total changed: %d" % data["summary"]["totalItemChanged"])
print("drops: %d (avg: %.1f)" % (data["summary"]["totalItemsDropped"], data["summary"]["averageDrop"]))
print("rises: %d (avg: %.1f)" % (data["summary"]["totalItemsIncreased"], data["summary"]["averageIncrease"]))

print("\n" + "=" * 60)
print("TOP 10 DROPS:")
for i, d in enumerate(data["extremeChanges"]["biggestDrops"][:10], 1):
    print("  %d. %s (%s) | %.0f -> %.0f | %+.0f (%+.2f%%)" % (i, d["name"], d["category"], d["oldPrice"], d["newPrice"], d["changeAmount"], d["changePercent"]))

print("\nTOP 10 RISES:")
for i, d in enumerate(data["extremeChanges"]["biggestIncreases"][:10], 1):
    print("  %d. %s (%s) | %.0f -> %.0f | %+.0f (%+.2f%%)" % (i, d["name"], d["category"], d["oldPrice"], d["newPrice"], d["changeAmount"], d["changePercent"]))

print("\n" + "=" * 60)
print("BY CATEGORY:")
for cat, cdata in data["categories"].items():
    items = cdata["items"] if isinstance(cdata, dict) else cdata
    count = cdata.get("changedItemCount", len(items)) if isinstance(cdata, dict) else len(items)
    drops = [x for x in items if x["changeAmount"] < 0]
    rises = [x for x in items if x["changeAmount"] > 0]
    print("\n--- %s (%d total: %d drops, %d rises) ---" % (cat, count, len(drops), len(rises)))
    
    sorted_items = sorted(items, key=lambda i: i["changeAmount"])
    for x in sorted_items[:5]:
        print("  DOWN: %s | %.0f -> %.0f | %+.0f (%+.2f%%)" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"], x["changePercent"]))
    
    sorted_up = sorted(items, key=lambda i: i["changeAmount"], reverse=True)
    for x in sorted_up[:3]:
        if x["changeAmount"] > 0:
            print("  UP:   %s | %.0f -> %.0f | %+.0f (%+.2f%%)" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"], x["changePercent"]))

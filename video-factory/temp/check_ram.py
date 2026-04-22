# -*- coding: utf-8 -*-
import json

with open("/Users/mac/new/video-factory/temp/fresh_weekly.json", "r") as f:
    data = json.load(f)["data"]

ram_items = data["categories"].get("ram", {}).get("items", [])

print("=== ALL RAM ITEMS (%d total) ===" % len(ram_items))
print()

# Print every single RAM item, sorted by changeAmount
for i, x in enumerate(sorted(ram_items, key=lambda r: r["changeAmount"]), 1):
    print("%3d. %s | %.0f -> %.0f | %+.0f (%+.2f%%) | %s" % (
        i, x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"], x["changePercent"], x["time"][:10]
    ))

print("\n\n=== SEARCHING FOR BENCHMARKS ===")

print("\n--- Search: 3600 ---")
for x in ram_items:
    if "3600" in x["name"]:
        print("  FOUND: %s | %.0f -> %.0f | %+.0f" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"]))

print("\n--- Search: 6000 AND C28 ---")
for x in ram_items:
    if "6000" in x["name"] and "C28" in x["name"]:
        print("  FOUND: %s | %.0f -> %.0f | %+.0f" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"]))

print("\n--- Search: yinjue ---")
for x in ram_items:
    if "\u94f6\u7235" in x["name"]:
        print("  FOUND: %s | %.0f -> %.0f | %+.0f" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"]))

print("\n--- Search: starblade ---")
for x in ram_items:
    if "\u661f\u5203" in x["name"]:
        print("  FOUND: %s | %.0f -> %.0f | %+.0f" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"]))

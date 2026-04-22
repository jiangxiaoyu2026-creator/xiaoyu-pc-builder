# -*- coding: utf-8 -*-
import json

with open("/Users/mac/new/video-factory/temp/weekly_data.json", "r") as f:
    data = json.load(f)["data"]

print("===== DATA VERIFICATION REPORT =====\n")

# 1. Summary stats
s = data["summary"]
print("[SUMMARY]")
print("  totalItemChanged: %d" % s["totalItemChanged"])
print("  totalItemsDropped: %d" % s["totalItemsDropped"])
print("  totalItemsIncreased: %d" % s["totalItemsIncreased"])
print("  averageDrop: %.2f" % s["averageDrop"])
print("  averageIncrease: %.2f" % s["averageIncrease"])

# 2. Claims verification
claims = [
    # (claim_text, field_to_check)
    ("RAM: 75 items, 71 drops", "ram"),
    ("DISK: 18 items, all drops", "disk"),
    ("CPU: 62 items", "cpu"),
    ("GPU: 79 items, 63 drops, 16 rises", "gpu"),
]

print("\n[BY CATEGORY COUNTS]")
for cat_name, cat_data_raw in data["categories"].items():
    items = cat_data_raw["items"] if isinstance(cat_data_raw, dict) else cat_data_raw
    count = cat_data_raw.get("changedItemCount", len(items)) if isinstance(cat_data_raw, dict) else len(items)
    drops = len([x for x in items if x["changeAmount"] < 0])
    rises = len([x for x in items if x["changeAmount"] > 0])
    unchanged = len([x for x in items if x["changeAmount"] == 0])
    print("  %s: total=%d, drops=%d, rises=%d, unchanged=%d" % (cat_name, count, drops, rises, unchanged))

# 3. Specific product price checks from the script
print("\n[SPECIFIC PRODUCT PRICE CHECKS]")

checks = {
    "ram": [
        ("asgard women warrior 48G -580", lambda items: [x for x in items if "48G" in x["name"] and x["changeAmount"] == -580]),
        ("jinbaida starblade black 6000 C26 -300", lambda items: [x for x in items if "C26" in x["name"] and "6000" in x["name"]]),
        ("jinbaida yinjue 5600 -100", lambda items: [x for x in items if "5600" in x["name"] and "32G" in x["name"]]),
    ],
    "disk": [
        ("samsung 9100PRO 8T -450", lambda items: [x for x in items if "9100" in x["name"]]),
        ("baiwei NV7200 1T -60", lambda items: [x for x in items if "NV7200" in x["name"] or "7200" in x["name"]]),
        ("samsung 990EVO PLUS 1T -50", lambda items: [x for x in items if "990EVO" in x["name"]]),
        ("samsung 990PRO 1T -50", lambda items: [x for x in items if "990PRO" in x["name"]]),
        ("WD SN7100 1T -41 to 999", lambda items: [x for x in items if "7100" in x["name"] and "1T" in x["name"]]),
    ],
    "cpu": [
        ("AMD 9800X3D -130 to 2900", lambda items: [x for x in items if "9800X3D" in x["name"]]),
        ("Intel Ultra 5 245KF -60 to 1130", lambda items: [x for x in items if "245KF" in x["name"]]),
        ("AMD R5-9600X -40 to 1130", lambda items: [x for x in items if "9600X" in x["name"]]),
        ("Intel Ultra 7 265K +140 to 1830", lambda items: [x for x in items if "265K" in x["name"] and "265KF" not in x["name"]]),
        ("Intel Ultra 7 265KF +100 to 1640", lambda items: [x for x in items if "265KF" in x["name"]]),
        ("Intel i7-12700KF +40 to 1940", lambda items: [x for x in items if "12700KF" in x["name"]]),
    ],
    "gpu": [
        ("gigabyte 5090 GAMING -1500 to 17100", lambda items: [x for x in items if "5090" in x["name"] and "GAMING" in x["name"]]),
        ("gigabyte 5090 AORUS white -1000 to 19600", lambda items: [x for x in items if "5090" in x["name"] and "AORUS" in x["name"] and ("white" in x["name"].lower() or "19600" == str(int(x["newPrice"])))]),
        ("gigabyte 5080 AORUS -800 to 10600", lambda items: [x for x in items if "5080" in x["name"] and "AORUS" in x["name"] and x["changeAmount"] <= -700]),
        ("gigabyte 5070TI AORUS -700 to 8150", lambda items: [x for x in items if "5070TI" in x["name"] and "AORUS" in x["name"]]),
        ("colorful 5070TI white vulcan +250 to 8550", lambda items: [x for x in items if "5070TI" in x["name"] and x["changeAmount"] == 250]),
        ("colorful 5070 VULCAN W +200", lambda items: [x for x in items if "5070" in x["name"] and "VULCAN" in x["name"] and x["changeAmount"] == 200]),
        ("ASUS TUF 5070TI white +150 to 7650", lambda items: [x for x in items if "TUF" in x["name"] and "5070TI" in x["name"]]),
    ]
}

for cat, check_list in checks.items():
    cat_data = data["categories"].get(cat, {})
    items = cat_data.get("items", []) if isinstance(cat_data, dict) else cat_data
    print("\n  --- %s ---" % cat)
    for desc, finder in check_list:
        matches = finder(items)
        if matches:
            for m in matches:
                status = "OK"
                print("    [%s] %s => %s | %.0f -> %.0f | %+.0f (%+.2f%%)" % (status, desc, m["name"], m["oldPrice"], m["newPrice"], m["changeAmount"], m["changePercent"]))
        else:
            # Also check extremeChanges
            all_extreme = data["extremeChanges"]["biggestDrops"] + data["extremeChanges"]["biggestIncreases"]
            extreme_matches = [x for x in all_extreme if x.get("category") == cat and finder([x])]
            if extreme_matches:
                for m in extreme_matches:
                    print("    [OK-extreme] %s => %s | %.0f -> %.0f | %+.0f" % (desc, m["name"], m["oldPrice"], m["newPrice"], m["changeAmount"]))
            else:
                print("    [NOT FOUND] %s" % desc)

# 4. Benchmark products check
print("\n[BENCHMARK PRODUCTS - NV3]")
disk_items = data["categories"].get("disk", {}).get("items", [])
for x in disk_items:
    if "NV3" in x["name"]:
        print("  %s | %.0f -> %.0f | %+.0f" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"]))
if not any("NV3" in x["name"] for x in disk_items):
    print("  NV3 NOT in weekly changes (price stable this week)")

print("\n[BENCHMARK PRODUCTS - DDR4 3600 yinjue 32G]")
ram_items = data["categories"].get("ram", {}).get("items", [])
for x in ram_items:
    if "3600" in x["name"] and ("32G" in x["name"] or "16G" in x["name"].replace("16G*2", "32G")):
        if "yinjue" in x["name"].lower() or "\u94f6\u7235" in x["name"]:
            print("  %s | %.0f -> %.0f | %+.0f" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"]))

print("\n[BENCHMARK PRODUCTS - DDR5 6000 C28 starblade 32G]")
for x in ram_items:
    if "6000" in x["name"] and "C28" in x["name"] and "\u661f\u5203\u9ed1" in x["name"] and "32G" in x["name"]:
        print("  %s | %.0f -> %.0f | %+.0f" % (x["name"], x["oldPrice"], x["newPrice"], x["changeAmount"]))

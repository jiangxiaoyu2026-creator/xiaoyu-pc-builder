import requests
import json

base_url = "https://www.diyxx.com/api"
categories = {
    "cpu": "CPU处理器",
    "ram": "内存",
    "disk": "硬盘",
    "gpu": "显卡"
}

results = {}

for cat, name in categories.items():
    print(f"Fetching {cat}...")
    url = f"{base_url}/stats/product-price-history?category={cat}&days=60"
    resp = requests.get(url)
    if resp.status_code == 200:
        data = resp.json()
        trends = data.get("productTrends", [])
        changed_products = []
        for p in trends:
            points = p.get("points", [])
            if not points:
                continue
            
            # Find price on April 1st and April 30th
            price_april_1 = None
            price_april_30 = None
            
            for pt in points:
                if pt["date"] == "2026-04-01":
                    price_april_1 = pt["price"]
                elif pt["date"] == "2026-04-30":
                    price_april_30 = pt["price"]
                    
            if price_april_1 is not None and price_april_30 is not None:
                # Calculate change. Handle precision issues like 0.000000000001
                change = round(price_april_30 - price_april_1, 2)
                if change != 0:
                    changed_products.append({
                        "name": p["name"],
                        "price_0401": price_april_1,
                        "price_0430": price_april_30,
                        "change": change
                    })
        results[name] = changed_products
    else:
        print(f"Failed to fetch {cat}: {resp.status_code}")

# Sort by change magnitude
for k in results:
    results[k].sort(key=lambda x: abs(x['change']), reverse=True)

# Print markdown format
markdown_output = []
for name, prods in results.items():
    markdown_output.append(f"### {name}")
    if not prods:
        markdown_output.append("此分类下无价格变动的产品。")
    else:
        for p in prods:
            change_str = f"上涨 {p['change']}元" if p['change'] > 0 else f"下跌 {abs(p['change'])}元"
            markdown_output.append(f"- **{p['name']}**: 4月1日 {p['price_0401']}元 -> 4月30日 {p['price_0430']}元 ({change_str})")
    markdown_output.append("")

with open("april_price_changes.md", "w") as f:
    f.write("\n".join(markdown_output))

print("Done. Check april_price_changes.md")

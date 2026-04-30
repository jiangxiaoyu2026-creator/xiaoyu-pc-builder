#!/usr/bin/env python3
import json
import urllib.request
import argparse

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def analyze_overview(data, period_label):
    if not data: return
    print(f"\n{'='*60}")
    print(f"=== MARKET OVERVIEW ({period_label}) ===")
    print(f"{'='*60}")
    summary = data.get('todaySummary', {})
    print(f"[SUMMARY] totalChanges={summary.get('totalChanges')}, drops={summary.get('downCount')}, rises={summary.get('upCount')}")
    print(f"[SUMMARY] avgDrop={summary.get('avgDownAmount')}, avgRise={summary.get('avgUpAmount')}")

def analyze_category(cat_name, data):
    if not data: return
    print(f"\n{'='*60}")
    print(f"=== CATEGORY: {cat_name.upper()} ===")
    print(f"{'='*60}")
    
    # We use recentChanges from get_price_trends to find today's drops and period drops
    recent = data.get('recentChanges', [])
    drops = sorted([x for x in recent if x.get('changeAmount', 0) < 0], key=lambda x: x.get('changeAmount', 0))
    rises = sorted([x for x in recent if x.get('changeAmount', 0) > 0], key=lambda x: x.get('changeAmount', 0), reverse=True)
    
    print(f"\n[BIGGEST DROPS (in period)]")
    for i, item in enumerate(drops[:10]):
        print(f"  {i+1}. {item.get('hardwareName')} | {item.get('oldPrice')} -> {item.get('newPrice')} | drop={item.get('changeAmount')} ({item.get('changePercent')}%)")
        
    print(f"\n[BIGGEST RISES (in period)]")
    for i, item in enumerate(rises[:5]):
        print(f"  {i+1}. {item.get('hardwareName')} | {item.get('oldPrice')} -> {item.get('newPrice')} | rise={item.get('changeAmount')} ({item.get('changePercent')}%)")
        
    products = data.get('products', [])
    print(f"\n[BENCHMARK PRODUCT CURRENT PRICES]")
    if cat_name == 'ram':
        yinque = [x for x in products if '银爵' in x.get('name', '')]
        print(f"  -- RAM: 银爵 --")
        for x in yinque:
            print(f"    {x.get('name')} | price={x.get('price')}")
            
        xingren = [x for x in products if '星刃黑' in x.get('name', '')]
        print(f"  -- RAM: 星刃黑 --")
        for x in xingren:
            print(f"    {x.get('name')} | price={x.get('price')}")
            
    if cat_name == 'disk':
        nv3 = [x for x in products if 'NV3' in x.get('name', '')]
        print(f"  -- DISK: NV3 --")
        for x in nv3:
            print(f"    {x.get('name')} | price={x.get('price')}")
            
    if cat_name == 'cpu':
        i5 = [x for x in products if '12400F' in x.get('name', '')]
        print(f"  -- CPU: 12400F --")
        for x in i5:
            print(f"    {x.get('name')} | price={x.get('price')}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=1)
    args = parser.parse_args()
    
    days = args.days
    if days == 1:
        label = "DAILY (1 Day)"
    else:
        label = f"PERIOD ({days} Days)"
        
    base_url = "https://www.diyxx.com/api/stats"
    
    overview = fetch_json(f"{base_url}/market-overview?days={days}")
    analyze_overview(overview, label)
    
    for cat in ['ram', 'cpu', 'gpu', 'disk']:
        # Fetch both price-trends (for recentChanges) and product-price-history (for products)
        trends = fetch_json(f"{base_url}/price-trends?category={cat}&days={days}") or {}
        hist = fetch_json(f"{base_url}/product-price-history?category={cat}&days={days}") or {}
        
        # Merge them
        combined = {**trends, **hist}
        analyze_category(cat, combined)

if __name__ == "__main__":
    main()

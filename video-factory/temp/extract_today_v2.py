#!/usr/bin/env python3
import json
import os

def load_json(path):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None

def analyze_overview(data):
    if not data: return
    print(f"\n{'='*60}")
    print(f"=== MARKET OVERVIEW ===")
    print(f"{'='*60}")
    summary = data.get('todaySummary', {})
    print(f"[SUMMARY] totalChanges={summary.get('totalChanges')}, drops={summary.get('downCount')}, rises={summary.get('upCount')}")
    print(f"[SUMMARY] avgDrop={summary.get('avgDownAmount')}, avgRise={summary.get('avgUpAmount')}")

def analyze_category(cat_name, data):
    if not data: return
    print(f"\n{'='*60}")
    print(f"=== CATEGORY: {cat_name.upper()} ===")
    print(f"{'='*60}")
    summary = data.get('todaySummary', {})
    print(f"[SUMMARY] totalChanges={summary.get('todayTotalChanges')}, drops={summary.get('todayDownCount')}, rises={summary.get('todayUpCount')}")
    
    # 极值产品
    lows = data.get('historicalLows', [])
    print(f"\n[BIGGEST DROPS (in period)]")
    for i, item in enumerate(lows[:5]):
        print(f"  {i+1}. {item.get('name')} | current={item.get('currentPrice')} | drop={item.get('changeAmount')} ({item.get('changePercent')}%)")
        
    highs = data.get('historicalHighs', [])
    print(f"\n[BIGGEST RISES (in period)]")
    for i, item in enumerate(highs[:5]):
        print(f"  {i+1}. {item.get('name')} | current={item.get('currentPrice')} | rise={item.get('changeAmount')} ({item.get('changePercent')}%)")
        
    # 标杆查询 - products list contains all active products and their current price
    products = data.get('products', [])
    print(f"\n[BENCHMARK PRODUCT CURRENT PRICES (Always available)]")
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

overview = load_json('/Users/mac/new/video-factory/temp/today_overview.json')
analyze_overview(overview)

for cat in ['ram', 'cpu', 'gpu', 'disk']:
    cat_data = load_json(f'/Users/mac/new/video-factory/temp/today_{cat}.json')
    analyze_category(cat, cat_data)


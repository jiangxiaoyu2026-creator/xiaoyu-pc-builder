#!/usr/bin/env python3
import json

def load_json(path):
    with open(path) as f:
        return json.load(f)

def analyze(data, label):
    print(f"\n{'='*60}")
    print(f"=== {label} ===")
    print(f"{'='*60}")
    
    d = data['data']
    meta = d['meta']
    summary = d['summary']
    
    print(f"\n[META] period={meta['period']}, days={meta['days']}, generatedAt={meta['generatedAt']}")
    print(f"[SUMMARY] totalItemChanged={summary['totalItemChanged']}, dropped={summary['totalItemsDropped']}, increased={summary['totalItemsIncreased']}")
    print(f"[SUMMARY] averageDrop={summary['averageDrop']}, averageIncrease={summary['averageIncrease']}")
    
    if summary['totalItemChanged'] == 0:
        print("*** NO DATA - totalItemChanged=0 ***")
        return
    
    # Extreme changes
    print("\n[TOP DROPS - All Categories]")
    for i, item in enumerate(d['extremeChanges']['biggestDrops'][:10]):
        print(f"  {i+1}. [{item['category']}] {item['name']} | {item['oldPrice']} -> {item['newPrice']} | change={item['changeAmount']} ({item['changePercent']}%)")
    
    print("\n[TOP INCREASES - All Categories]")
    for i, item in enumerate(d['extremeChanges']['biggestIncreases'][:10]):
        print(f"  {i+1}. [{item['category']}] {item['name']} | {item['oldPrice']} -> {item['newPrice']} | change={item['changeAmount']} ({item['changePercent']}%)")
    
    # Per category
    cats = d['categories']
    for cat_name in ['ram', 'disk', 'cpu', 'gpu']:
        if cat_name not in cats:
            print(f"\n[{cat_name.upper()}] No data")
            continue
        cat = cats[cat_name]
        items = cat['items']
        drops = [x for x in items if x['changeAmount'] < 0]
        rises = [x for x in items if x['changeAmount'] > 0]
        print(f"\n[{cat_name.upper()}] changedItemCount={cat['changedItemCount']}, drops={len(drops)}, rises={len(rises)}")
        print(f"  All items (FULL LIST for benchmark search):")
        for item in sorted(items, key=lambda x: x['changeAmount']):
            print(f"    {item['name']} | old={item['oldPrice']}, new={item['newPrice']}, change={item['changeAmount']} ({item['changePercent']}%)")
    
    # Benchmark product search
    print("\n[BENCHMARK PRODUCT SEARCH]")
    ram_items = cats.get('ram', {}).get('items', [])
    disk_items = cats.get('disk', {}).get('items', [])
    
    # RAM benchmarks
    print("\n  -- RAM: 银爵 (broad search) --")
    yinque = [x for x in ram_items if '银爵' in x['name']]
    for x in yinque:
        print(f"    {x['name']} | old={x['oldPrice']}, new={x['newPrice']}, change={x['changeAmount']}")
    if yinque:
        y3600 = [x for x in yinque if '3600' in x['name']]
        print(f"  Filter 3600: {y3600}")
    
    print("\n  -- RAM: 星刃黑 (broad search) --")
    xingren = [x for x in ram_items if '星刃黑' in x['name']]
    for x in xingren:
        print(f"    {x['name']} | old={x['oldPrice']}, new={x['newPrice']}, change={x['changeAmount']}")
    if xingren:
        x6000 = [x for x in xingren if '6000' in x['name']]
        print(f"  Filter 6000: {x6000}")
        if x6000:
            xc28 = [x for x in x6000 if 'C28' in x['name'] or 'c28' in x['name']]
            print(f"  Filter C28: {xc28}")
    
    print("\n  -- DISK: NV3 (broad search) --")
    nv3 = [x for x in disk_items if 'NV3' in x['name']]
    for x in nv3:
        print(f"    {x['name']} | old={x['oldPrice']}, new={x['newPrice']}, change={x['changeAmount']}")

# Load files
daily = load_json('/Users/mac/new/video-factory/temp/today_daily.json')
weekly = load_json('/Users/mac/new/video-factory/temp/today_weekly.json')

analyze(daily, 'DAILY DATA')
analyze(weekly, 'WEEKLY DATA')

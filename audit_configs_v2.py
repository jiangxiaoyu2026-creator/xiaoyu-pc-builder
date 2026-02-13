
import sys
import json

def audit():
    try:
        data = json.load(sys.stdin)
        products = data.get('products', [])
        configs = data.get('configs', [])
        
        product_ids = set(p['id'] for p in products)
        print(f"Loaded {len(product_ids)} products and {len(configs)} configs.")
        
        broken = []
        missing_ids = set()
        
        for config in configs:
            items = config.get('items', {})
            if not items: continue
            
            broken_items = {}
            is_broken = False
            
            for cat, pid in items.items():
                if not pid: continue
                if pid not in product_ids:
                    is_broken = True
                    broken_items[cat] = pid
                    missing_ids.add(pid)
            
            if is_broken:
                broken.append({
                    "id": config.get('id'),
                    "title": config.get('title'),
                    "broken_items": broken_items
                })
        
        print(f"Found {len(broken)} broken configs.")
        if broken:
            print(json.dumps(broken, indent=2, ensure_ascii=False))
            
        print(f"\nMissing IDs: {list(missing_ids)}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    audit()

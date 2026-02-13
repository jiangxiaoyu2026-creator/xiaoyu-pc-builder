
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def audit_configs():
    # 1. Fetch Products
    try:
        r_prod = requests.get(f"{BASE_URL}/products")
        products = r_prod.json()
        # Create a set of valid IDs
        product_ids = set(p['id'] for p in products)
        print(f"Loaded {len(product_ids)} products.")
    except Exception as e:
        print(f"Error fetching products: {e}")
        return

    # 2. Fetch Configs
    try:
        r_conf = requests.get(f"{BASE_URL}/configs")
        configs = r_conf.json()
        print(f"Loaded {len(configs)} configs.")
    except Exception as e:
        print(f"Error fetching configs: {e}")
        return

    # 3. Audit
    broken_configs = []
    missing_ids = set()

    for config in configs:
        items = config.get('items', {})
        if not items:
            continue
        
        broken_items = {}
        is_broken = False
        
        for category, pid in items.items():
            if not pid: continue
            if pid not in product_ids:
                is_broken = True
                broken_items[category] = pid
                missing_ids.add(pid)
        
        if is_broken:
            broken_configs.append({
                "id": config['id'],
                "title": config['title'],
                "broken_items": broken_items
            })

    # 4. Report
    print(f"\nFound {len(broken_configs)} broken configurations.")
    if broken_configs:
        print(json.dumps(broken_configs, indent=2, ensure_ascii=False))
    
    print(f"\nTotal unique missing Product IDs: {len(missing_ids)}")
    print(list(missing_ids))

if __name__ == "__main__":
    audit_configs()

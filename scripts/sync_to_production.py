import sqlite3
import requests
import json
from jose import jwt
from datetime import datetime, timedelta

# Create valid JWT
token = jwt.encode(
    {'sub': 'admin', 'exp': datetime.utcnow() + timedelta(days=1)}, 
    'xiaoyu_pc_builder_secret_key_2026', 
    algorithm='HS256'
)
headers = {'Authorization': f'Bearer {token}'}
PROD_API = "https://www.diyxx.com/api"

def run_sync():
    conn = sqlite3.connect("/Users/mac/new/data/xiaoyu.db")
    c = conn.cursor()
    # Get all items that have non-empty specs
    c.execute("SELECT id, specs, specsSource FROM hardware WHERE specs IS NOT NULL AND specs != '' AND specs != '{}'")
    rows = c.fetchall()
    
    updated = 0
    # Process only 5 for testing
    for r in rows:
        hid, specs_str, source = r
        try:
            specs_obj = json.loads(specs_str) if isinstance(specs_str, str) else specs_str
        except: continue
        
        if not specs_obj: continue
        
        # We update only specs and specsSource to avoid overwriting their prices
        payload = {
            "specs": specs_obj,
            "specsSource": source if source else "ai_inferred"
        }
        
        resp = requests.put(f"{PROD_API}/products/{hid}", json=payload, headers=headers)
        if resp.status_code == 200:
            updated += 1
            if updated % 50 == 0:
                print(f"Synced {updated} items...")
        else:
            if resp.status_code != 404:
                print(f"Failed to update {hid}: {resp.status_code} {resp.text}")

    print(f"Successfully synced {updated} hardware specs to diyxx.com production!")

if __name__ == '__main__':
    run_sync()

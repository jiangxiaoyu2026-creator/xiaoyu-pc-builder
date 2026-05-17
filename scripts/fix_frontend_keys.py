import sqlite3
import json
import os
import re
import requests
import time
from jose import jwt
from datetime import datetime, timedelta

PROD_API = "https://www.diyxx.com/api"

def get_token():
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("Missing JWT_SECRET")
    return jwt.encode({'sub': 'admin', 'exp': datetime.utcnow() + timedelta(days=1)}, secret, algorithm='HS256')

def fix_specs(cat, specs):
    new_specs = dict(specs)
    
    # helper
    def extract_num(val):
        if val is None: return None
        if isinstance(val, (int, float)): return val
        m = re.search(r'\d+(\.\d+)?', str(val))
        return float(m.group()) if m else None
        
    if cat == 'cpu':
        if 'cores' in new_specs and isinstance(new_specs['cores'], str):
            c_str = new_specs['cores']
            m = re.search(r'\((\d+)\s*Cores', c_str) or re.search(r'^(\d+)$', c_str) or re.search(r'^(\d+)\s', c_str)
            if m: new_specs['cores'] = int(m.group(1))
            else: 
                mm = re.search(r'\d+', c_str)
                if mm: new_specs['cores'] = int(mm.group())
            
        if 'baseClock' in new_specs and 'frequency' not in new_specs:
            new_specs['frequency'] = str(extract_num(new_specs['baseClock']))
            
        if 'tdp' in new_specs:
            new_specs['wattage'] = extract_num(new_specs['tdp'])
            
        if 'memorySupport' in new_specs:
            ms = new_specs['memorySupport'].upper()
            if 'DDR4' in ms and 'DDR5' in ms: new_specs['memoryType'] = 'DDR4/DDR5'
            elif 'DDR5' in ms: new_specs['memoryType'] = 'DDR5'
            elif 'DDR4' in ms: new_specs['memoryType'] = 'DDR4'
            
        if 'integratedGraphics' in new_specs:
            ig = new_specs['integratedGraphics'].upper()
            new_specs['integratedGpu'] = '否' if ('NONE' in ig or 'NO' in ig) else '是'

    elif cat == 'gpu':
        if 'recommendedPowerSupply' in new_specs:
            new_specs['wattage'] = extract_num(new_specs['recommendedPowerSupply'])
        if 'vramCapacity' in new_specs:
            new_specs['memorySize'] = extract_num(new_specs['vramCapacity'])
        if 'length' in new_specs and isinstance(new_specs['length'], str):
            new_specs['length'] = extract_num(new_specs['length'])
            
    elif cat == 'ram':
        if 'speed' in new_specs:
            new_specs['frequency'] = extract_num(new_specs['speed'])
        if 'capacity' in new_specs and isinstance(new_specs['capacity'], str):
            new_specs['capacity'] = extract_num(new_specs['capacity'])

    return new_specs

def run():
    conn = sqlite3.connect("/Users/mac/new/data/xiaoyu.db")
    c = conn.cursor()
    c.execute("SELECT id, category, specs, specsSource FROM hardware WHERE specs IS NOT NULL AND specs != '' AND specs != '{}'")
    rows = c.fetchall()
    
    token = get_token()
    session = requests.Session()
    session.headers.update({'Authorization': f'Bearer {token}'})
    
    updated = 0
    for hid, cat, specs_str, source in rows:
        try:
            specs = json.loads(specs_str) if isinstance(specs_str, str) else specs_str
        except: continue
        
        while isinstance(specs, str):
            try: specs = json.loads(specs)
            except: break
            
        if not isinstance(specs, dict): continue
        if not specs: continue
        
        fixed_specs = fix_specs(cat, specs)
        
        # update DB locally first
        c.execute("UPDATE hardware SET specs=? WHERE id=?", (json.dumps(fixed_specs), hid))
        
        # Push to remote with Session to reuse TLS connections
        payload = {"specs": fixed_specs, "specsSource": source or "ai_inferred"}
        try:
            resp = session.put(f"{PROD_API}/products/{hid}", json=payload)
            if resp.status_code == 200:
                updated += 1
                if updated % 50 == 0:
                    print(f"Fixed & Synced {updated} items...")
            else:
                print(f"Error {resp.status_code} for {hid}: {resp.text}")
        except requests.exceptions.RequestException as e:
            print(f"Network error on {hid}, retrying...")
            time.sleep(1)
            try:
                session.put(f"{PROD_API}/products/{hid}", json=payload)
            except:
                pass
                
    conn.commit()
    conn.close()
    print(f"Successfully fixed keys and synced {updated} hardware specs to diyxx.com production!")

if __name__ == '__main__':
    run()

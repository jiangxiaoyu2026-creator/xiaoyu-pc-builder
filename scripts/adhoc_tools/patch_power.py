import base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3, json

db_path = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# We need to update specs JSON for power_draw and ensure master_lu_score is there.
# For CPU and GPU, we use a basic inference table if missing.
# For Motherboard, Cooler, RAM, Disk, we assign standard estimated power_draw.

def infer_cpu(name):
    name = name.upper()
    if '285K' in name: return 1500000, 200
    if '265K' in name: return 1200000, 160
    if '245K' in name: return 1000000, 150
    if '14900' in name: return 1200000, 250
    if '14700' in name: return 1000000, 200
    if '14600' in name: return 880000, 160
    if '14400' in name: return 650000, 80
    if '14100' in name: return 450000, 65
    if '13900' in name: return 1100000, 250
    if '13700' in name: return 950000, 200
    if '13600' in name: return 820000, 160
    if '13400' in name: return 600000, 80
    if '13100' in name: return 420000, 65
    if '12900' in name: return 900000, 200
    if '12700' in name: return 800000, 150
    if '12600' in name: return 700000, 120
    if '12400' in name: return 520000, 65
    if '12100' in name: return 390000, 65
    if '9950' in name: return 1400000, 170
    if '9850' in name: return 1250000, 170
    if '9800' in name: return 1200000, 120
    if '9700' in name: return 1000000, 100
    if '9600' in name: return 800000, 80
    if '7950' in name: return 1200000, 170
    if '7800' in name: return 1000000, 120
    if '7600' in name: return 700000, 100
    if '7500' in name: return 650000, 65
    if '5700' in name: return 600000, 65
    if '5600' in name: return 550000, 65
    return None, 100

def infer_gpu(name):
    name = name.upper()
    if '5090' in name: return 2000000, 450
    if '5080' in name: return 1400000, 320
    if '5070TI' in name or '5070 TI' in name: return 1200000, 250
    if '5070' in name: return 1000000, 220
    if '5060TI' in name or '5060 TI' in name: return 650000, 180
    if '5060' in name: return 500000, 150
    if '5050' in name: return 350000, 120
    if '4090' in name: return 1800000, 450
    if '4080' in name: return 1200000, 320
    if '4070TI' in name or '4070 TI' in name: return 1000000, 250
    if '4070' in name: return 850000, 200
    if '4060TI' in name or '4060 TI' in name: return 500000, 160
    if '4060' in name: return 400000, 115
    if '3060' in name: return 380000, 170
    if '3050' in name: return 280000, 130
    return None, 200

# Fetch all items
c.execute("SELECT id, category, model, specs FROM hardware")
rows = c.fetchall()

updated_count = 0

for r in rows:
    item_id, category, model, specs_str = r
    try:
        specs = json.loads(specs_str) if specs_str else {}
    except:
        specs = {}
        
    changed = False
    
    # Fill in power_draw and master_lu_score
    if category == 'cpu':
        score, power = infer_cpu(model)
        if 'master_lu_score' not in specs or not float(specs['master_lu_score']):
            if score: 
                specs['master_lu_score'] = score
                changed = True
        if 'power_draw' not in specs or not float(specs['power_draw']):
            if power:
                specs['power_draw'] = power
                changed = True
                
    elif category == 'gpu':
        score, power = infer_gpu(model)
        if 'master_lu_score' not in specs or not float(specs['master_lu_score']):
            if score: 
                specs['master_lu_score'] = score
                changed = True
        if 'power_draw' not in specs or not float(specs['power_draw']):
            if power:
                specs['power_draw'] = power
                changed = True
                
    elif category == 'mainboard':
        if 'power_draw' not in specs or not float(specs['power_draw']):
            specs['power_draw'] = 20  # MB roughly 20W
            changed = True
            
    elif category == 'cooler':
        if 'power_draw' not in specs or not float(specs['power_draw']):
            specs['power_draw'] = 10  # Cooler roughly 10W
            changed = True
            
    elif category == 'ram':
        if 'power_draw' not in specs or not float(specs['power_draw']):
            specs['power_draw'] = 5   # RAM roughly 5W
            changed = True
            
    elif category == 'disk':
        if 'power_draw' not in specs or not float(specs['power_draw']):
            specs['power_draw'] = 5   # Disk roughly 5W
            changed = True
            
    if changed:
        # Save back to db
        new_specs_str = json.dumps(specs, ensure_ascii=False)
        c.execute("UPDATE hardware SET specs=? WHERE id=?", (new_specs_str, item_id))
        updated_count += 1

conn.commit()
conn.close()
print(f"Successfully updated power_draw and master_lu_score for {updated_count} items in the database.")
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")

import time
time.sleep(5)
invoke_id = res.split("InvokeId: ")[1].strip()
out = m.get_invocation_output(invoke_id)
print(out)

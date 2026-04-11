import base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3, json

db_path = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Get unique GPU chip scores (deduplicated by chip type)
c.execute("SELECT model, specs FROM hardware WHERE category='gpu' AND status='active'")
gpu_rows = c.fetchall()

gpu_chips = {}
for r in gpu_rows:
    model, specs_str = r
    try:
        specs = json.loads(specs_str) if specs_str else {}
    except:
        specs = {}
    score = specs.get('master_lu_score', 0)
    ludashi = specs.get('ludashiScore', 0)
    
    # Use ludashiScore if available (admin-entered), else master_lu_score (script-injected)
    final_score = ludashi if ludashi else score
    
    # Identify chip type from model name
    name = model.upper()
    chip = None
    for k in ['5090','5080','5070TI','5070','5060TI','5060','5050',
              '4090','4080','4070TI','4070','4060TI','4060',
              '3090','3080','3070TI','3070','3060TI','3060','3050',
              '9070XT','9060XT','7900XTX','7900XT','7800XT','7650GRE','7600']:
        if k.replace(' ','') in name.replace(' ',''):
            chip = k
            break
    
    if chip and chip not in gpu_chips:
        gpu_chips[chip] = {'model': model, 'master_lu_score': score, 'ludashiScore': ludashi}

print("=== GPU CHIPS IN DATABASE ===")
order = ['5090','5080','5070TI','5070','5060TI','5060','5050',
         '4090','4080','4070TI','4070','4060TI','4060',
         '3090','3080','3070TI','3070','3060TI','3060','3050',
         '9070XT','9060XT','7900XTX','7800XT','7650GRE','7600']
for chip in order:
    if chip in gpu_chips:
        d = gpu_chips[chip]
        effective = d['ludashiScore'] if d['ludashiScore'] else d['master_lu_score']
        print(f"  {chip:12s} -> score={effective:>10} (lu={d['ludashiScore']}, script={d['master_lu_score']}) [{d['model']}]")
    else:
        print(f"  {chip:12s} -> NOT FOUND")

# Get CPU scores
c.execute("SELECT model, specs FROM hardware WHERE category='cpu' AND status='active'")
cpu_rows = c.fetchall()

cpu_chips = {}
for r in cpu_rows:
    model, specs_str = r
    try:
        specs = json.loads(specs_str) if specs_str else {}
    except:
        specs = {}
    score = specs.get('master_lu_score', 0)
    ludashi = specs.get('ludashiScore', 0)
    
    name = model.upper()
    chip = None
    for k in ['14900K','14700K','14600K','14400F','14100','13900K','13700K','13600K','13400F','13100',
              '12900K','12700K','12600K','12400F','12400','12100F','12100',
              '9950X','9800X3D','9700X','9600X','7950X','7800X3D','7600X','7500F','5700X','5600X','5600']:
        if k in name:
            chip = k
            break
    
    if chip and chip not in cpu_chips:
        cpu_chips[chip] = {'model': model, 'master_lu_score': score, 'ludashiScore': ludashi}

print("\\n=== CPU CHIPS IN DATABASE ===")
cpu_order = ['14900K','14700K','14600K','14400F','14100',
             '13900K','13700K','13600K','13400F','13100',
             '12900K','12700K','12600K','12400F','12400','12100F','12100',
             '9950X','9800X3D','9700X','9600X','7950X','7800X3D','7600X','7500F','5700X','5600X','5600']
for chip in cpu_order:
    if chip in cpu_chips:
        d = cpu_chips[chip]
        effective = d['ludashiScore'] if d['ludashiScore'] else d['master_lu_score']
        print(f"  {chip:12s} -> score={effective:>10} (lu={d['ludashiScore']}, script={d['master_lu_score']}) [{d['model']}]")
    else:
        print(f"  {chip:12s} -> NOT FOUND")

conn.close()
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")

import time
time.sleep(5)
invoke_id = res.split("InvokeId: ")[1].strip()
out = m.get_invocation_output(invoke_id)
print(out)

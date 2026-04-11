import base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3, json

db_path = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, category, model, specs FROM hardware")
rows = c.fetchall()

synced = 0
cleared = 0

for r in rows:
    item_id, category, model, specs_str = r
    try:
        specs = json.loads(specs_str) if specs_str else {}
        if not isinstance(specs, dict):
            specs = {}
    except:
        specs = {}
    
    changed = False
    ludashi = 0
    try:
        ludashi = int(specs.get('ludashiScore', 0) or 0)
    except:
        ludashi = 0
    
    if ludashi > 0:
        old = 0
        try:
            old = int(specs.get('master_lu_score', 0) or 0)
        except:
            old = 0
        if old != ludashi:
            specs['master_lu_score'] = ludashi
            changed = True
            synced += 1
    else:
        if 'master_lu_score' in specs:
            del specs['master_lu_score']
            changed = True
            cleared += 1
    
    if changed:
        c.execute("UPDATE hardware SET specs=? WHERE id=?", (json.dumps(specs, ensure_ascii=False), item_id))

conn.commit()
conn.close()
print(f"Done! Synced {synced} items with real ludashiScore data.")
print(f"Cleared {cleared} items that only had fake script estimates.")
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")

import time
time.sleep(5)
invoke_id = res.split("InvokeId: ")[1].strip()
out = m.get_invocation_output(invoke_id)
print(out)

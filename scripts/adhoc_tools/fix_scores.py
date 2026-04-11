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
    except:
        specs = {}
    
    changed = False
    ludashi = specs.get('ludashiScore', 0)
    
    try:
        ludashi = int(ludashi) if ludashi else 0
    except:
        ludashi = 0
    
    if ludashi > 0:
        # Admin entered real data from Lu Master website -> use it
        if specs.get('master_lu_score') != ludashi:
            specs['master_lu_score'] = ludashi
            changed = True
            synced += 1
    else:
        # No admin-entered data -> clear script estimates, don't fake it
        if specs.get('master_lu_score'):
            del specs['master_lu_score']
            changed = True
            cleared += 1
    
    if changed:
        c.execute("UPDATE hardware SET specs=? WHERE id=?", (json.dumps(specs, ensure_ascii=False), item_id))

conn.commit()
conn.close()
print(f"Synced {synced} items: ludashiScore -> master_lu_score (real data)")
print(f"Cleared {cleared} items: removed fake script estimates (no real data available)")
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")

import time
time.sleep(5)
invoke_id = res.split("InvokeId: ")[1].strip()
out = m.get_invocation_output(invoke_id)
print(out)

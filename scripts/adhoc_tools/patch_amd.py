import sqlite3, json, base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3, json

db_path = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

def fix_amd(name):
    name = name.upper()
    if '9070XT' in name or '9070 XT' in name: return 1100000, 260
    if '9060XT' in name or '9060 XT' in name: return 650000, 180
    if '7650GRE' in name or '7650 GRE' in name: return 450000, 150
    return None, None

c.execute("SELECT id, model, specs FROM hardware WHERE category='gpu'")
rows = c.fetchall()

updated = 0
for r in rows:
    item_id, model, specs_str = r
    score, power = fix_amd(model)
    if score and power:
        specs = json.loads(specs_str) if specs_str else {}
        # If it was fallback or 0
        if not specs.get('master_lu_score') or specs.get('power_draw') == 200:
            specs['master_lu_score'] = score
            specs['power_draw'] = power
            c.execute("UPDATE hardware SET specs=? WHERE id=?", (json.dumps(specs, ensure_ascii=False), item_id))
            updated += 1
            
conn.commit()
conn.close()
print(f"AMD fix patched {updated} items.")
"""
b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")

import time
time.sleep(4)
print(m.get_invocation_output(res.split("InvokeId: ")[1].strip()))

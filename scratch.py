import urllib.request, json, base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3
import json

db_path = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, model, specs FROM hardware WHERE model LIKE '%14600%' OR model LIKE '%5060%'")
rows = c.fetchall()
for r in rows:
    hid = r[0]
    model = r[1]
    sp = r[2]
    specs = {}
    if sp:
        try:
            specs = json.loads(sp)
        except:
            pass
    if '14600' in model:
        specs['master_lu_score'] = 880000
        specs['power_draw'] = 160
    elif '5060' in model:
        specs['master_lu_score'] = 580000
        specs['power_draw'] = 180
        
    c.execute("UPDATE hardware SET specs = ? WHERE id = ?", (json.dumps(specs, ensure_ascii=False), hid))
    print(f"Updated {model}")

conn.commit()
conn.close()
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")
print("Invoke Result:", res)

import base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3, json

db = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db)
c = conn.cursor()

# Check CPU - see what admin entered vs what inject script wrote
c.execute("SELECT id, model, specs FROM hardware WHERE category='cpu' LIMIT 10")
print("=== CPU SAMPLES ===")
for r in c.fetchall():
    specs = json.loads(r[2]) if r[2] else {}
    score = specs.get('master_lu_score', 'NONE')
    power = specs.get('power_draw', 'NONE')
    print(f"  [{r[0]}] {r[1]} -> score={score}, power={power}")

# Check GPU
c.execute("SELECT id, model, specs FROM hardware WHERE category='gpu' LIMIT 10")
print("\\n=== GPU SAMPLES ===")
for r in c.fetchall():
    specs = json.loads(r[2]) if r[2] else {}
    score = specs.get('master_lu_score', 'NONE')
    power = specs.get('power_draw', 'NONE')
    print(f"  [{r[0]}] {r[1]} -> score={score}, power={power}")

# Check what categories exist and their power status
for cat in ['mainboard', 'cooler', 'ram', 'ssd', 'case', 'power']:
    c.execute("SELECT COUNT(*) FROM hardware WHERE category=?", (cat,))
    total = c.fetchone()[0]
    c.execute("SELECT id, model, specs FROM hardware WHERE category=? LIMIT 3", (cat,))
    print(f"\\n=== {cat.upper()} ({total} items) ===")
    for r in c.fetchall():
        specs = json.loads(r[2]) if r[2] else {}
        power = specs.get('power_draw', 'NONE')
        score = specs.get('master_lu_score', 'NONE')
        print(f"  [{r[0]}] {r[1]} -> score={score}, power={power}")

conn.close()
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")
print("Triggered:", res)

import time
time.sleep(5)
invoke_id = res.split("InvokeId: ")[1].strip()
out = m.get_invocation_output(invoke_id)
print(out)

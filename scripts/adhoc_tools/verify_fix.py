import base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3, json

db_path = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Spot check key items
checks = [
    ('gpu', '5070TI', 'RTX 5070 Ti'),
    ('gpu', '5080', 'RTX 5080'),
    ('gpu', '5060', 'RTX 5060'),
    ('gpu', '9060XT', 'RX 9060 XT'),
    ('cpu', '14700K', 'i7-14700K'),
    ('cpu', '9800X3D', 'R7-9800X3D'),
    ('cpu', '7800X3D', 'R7-7800X3D'),
    ('cpu', '14400F', 'i5-14400F'),
]

print('=== VERIFICATION: ludashiScore vs master_lu_score ===')
for cat, keyword, label in checks:
    c.execute("SELECT model, specs FROM hardware WHERE category=? AND model LIKE ? LIMIT 1", (cat, f'%{keyword}%'))
    row = c.fetchone()
    if row:
        specs = json.loads(row[1]) if row[1] else {}
        lu = specs.get('ludashiScore', 'N/A')
        ms = specs.get('master_lu_score', 'N/A')
        match = '✅' if str(lu) == str(ms) else '❌ MISMATCH'
        print(f'  {label:16s} ludashiScore={lu:>10}  master_lu_score={ms:>10}  {match}')
    else:
        print(f'  {label:16s} NOT FOUND')

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

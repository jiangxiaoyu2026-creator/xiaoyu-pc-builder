import urllib.request, json, base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3, json

db = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db)
c = conn.cursor()
c.execute("SELECT model, specs FROM hardware WHERE model LIKE '%9070XT%' LIMIT 5")
for row in c.fetchall():
    print(row[0], row[1])
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")

import time
time.sleep(5)
invoke_id = res.split("InvokeId: ")[1].strip()
print(m.get_invocation_output(invoke_id))

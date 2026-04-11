import base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3, json

db_path = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, category, model, specs FROM hardware WHERE category IN ('cpu', 'gpu')")
rows = c.fetchall()

anomalies = []
unrecognized = []

for r in rows:
    item_id, category, model, specs_str = r
    try:
        specs = json.loads(specs_str) if specs_str else {}
    except:
        specs = {}
        
    score = specs.get('master_lu_score', 0)
    power = specs.get('power_draw', 0)
    
    try: score = float(score) if score else 0
    except: score = 0
    
    try: power = float(power) if power else 0
    except: power = 0

    # Checks for anomalies
    msg = []
    
    # Check 1: Missing or extremely low score
    if score < 100000:
        msg.append(f"Score missing or too low: {score}")
        
    # Check 2: Unmatched fallback power
    if category == 'gpu' and power == 200 and score == 0:
        msg.append("Fallback generic GPU applied (Unrecognized model)")
    if category == 'cpu' and power == 100 and score == 0:
        msg.append("Fallback generic CPU applied (Unrecognized model)")
        
    # Check 3: Suspicious power vs score ratio
    if score > 1500000 and power < 150:
        msg.append(f"Suspicious: High score ({score}) but very low power ({power}W)")
    if score > 0 and score < 300000 and power > 350:
        msg.append(f"Suspicious: Low score ({score}) but high power ({power}W)")

    if msg:
        if "Fallback generic" in str(msg):
            unrecognized.append(f"[{category.upper()}] {model} -> {msg}")
        else:
            anomalies.append(f"[{category.upper()}] {model} (Score={score}, Power={power}) -> {msg}")

conn.close()

print(f"=== Found {len(anomalies)} Specific Anomalies ===")
for a in anomalies[:20]:
    print(a)
    
print(f"\\n=== Found {len(unrecognized)} Unrecognized/Generic Matches ===")
for u in unrecognized[:30]:  # Show top 30
    print(u)
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")

import time
time.sleep(5)
invoke_id = res.split("InvokeId: ")[1].strip()
out = m.get_invocation_output(invoke_id)
print(out)

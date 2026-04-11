import urllib.request, json, base64
from aliyun_manage import AliyunECSManager

script = """
import sqlite3
import json

db_path = '/root/pcbuilder/data/xiaoyu.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT category, model, specs FROM hardware WHERE category IN ('cpu', 'gpu')")
rows = c.fetchall()
conn.close()

stats = {'cpu': {'total': 0, 'has_score': 0, 'missing': 0, 'scores': []}, 
         'gpu': {'total': 0, 'has_score': 0, 'missing': 0, 'scores': []}}

missing_models = {'cpu': [], 'gpu': []}

for r in rows:
    cat = r[0]
    model = r[1]
    sp = r[2]
    
    stats[cat]['total'] += 1
    
    specs = {}
    if sp:
        try:
            specs = json.loads(sp)
        except:
            pass
            
    score = specs.get('master_lu_score', 0)
    try:
        score = int(score)
    except:
        score = 0
        
    if score > 0:
        stats[cat]['has_score'] += 1
        stats[cat]['scores'].append((model, score))
    else:
        stats[cat]['missing'] += 1
        if len(missing_models[cat]) < 10:
            missing_models[cat].append(model)

for cat in ['cpu', 'gpu']:
    stats[cat]['scores'].sort(key=lambda x: x[1], reverse=True)
    
print("--- CPU STATS ---")
print(f"Total: {stats['cpu']['total']}")
print(f"Has Score: {stats['cpu']['has_score']}")
print(f"Missing: {stats['cpu']['missing']}")
if stats['cpu']['missing'] > 0:
    print(f"Sample missing: {missing_models['cpu']}")
print(f"Top 5: {stats['cpu']['scores'][:5]}")
print(f"Bottom 5: {stats['cpu']['scores'][-5:]}")

print("\\n--- GPU STATS ---")
print(f"Total: {stats['gpu']['total']}")
print(f"Has Score: {stats['gpu']['has_score']}")
print(f"Missing: {stats['gpu']['missing']}")
if stats['gpu']['missing'] > 0:
    print(f"Sample missing: {missing_models['gpu']}")
print(f"Top 5: {stats['gpu']['scores'][:5]}")
print(f"Bottom 5: {stats['gpu']['scores'][-5:]}")
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")
print("Invoke Result:", res)

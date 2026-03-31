import sqlite3
import json
import re

db_path = "/Users/mac/new/data/xiaoyu.db"

conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT id, model, specs FROM hardware WHERE category='ram'")
rows = c.fetchall()

updated = 0
for r in rows:
    hid, model, specs_str = r
    try:
        specs = json.loads(specs_str) if specs_str and specs_str.strip() != 'null' else {}
    except:
        continue
    
    while isinstance(specs, str):
        try: specs = json.loads(specs)
        except: break

    if 'speed' in specs:
        speed_str = specs['speed']
        spd_val = int(re.search(r'\d+', speed_str).group())
        if spd_val >= 4800 and specs.get('memoryType') == 'DDR4':
            specs['memoryType'] = 'DDR5'
            c.execute("UPDATE hardware SET specs = ? WHERE id = ?", (json.dumps(specs), hid))
            updated += 1
            
conn.commit()
conn.close()
print(f"Fixed {updated} RAM entries.")

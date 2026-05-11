"""
Clean up duplicate configs from production database.
For each group of configs with the same (userId, title, items_hash),
keep the one with the most likes or the newest, and delete the rest.
"""
import requests
import json

API_BASE = "https://www.diyxx.com/api"

# 1. Login to get token
login_res = requests.post(f"{API_BASE}/auth/login", json={
    "username": "xiaoyu",
    "password": "jiangxiaoyu119"
})
if login_res.status_code != 200:
    print(f"Login failed: {login_res.status_code}")
    exit(1)

token = login_res.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}
print(f"✅ Logged in successfully")

# 2. Fetch ALL configs (published)
all_configs = []
page = 1
while True:
    res = requests.get(f"{API_BASE}/configs?page={page}&page_size=100&sort_by=new&status=all", headers=headers)
    data = res.json()
    items = data.get("items", [])
    if not items:
        break
    all_configs.extend(items)
    if len(all_configs) >= data.get("total", 0):
        break
    page += 1

print(f"📊 Total configs fetched: {len(all_configs)}")

# 3. Group by (userId, title, items_hash) to find true duplicates
from collections import defaultdict
groups = defaultdict(list)

for c in all_configs:
    items = c.get("items", {})
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except:
            pass
    items_hash = json.dumps(items, sort_keys=True) if isinstance(items, dict) else str(items)
    key = (c.get("userId", ""), c.get("title", ""), items_hash)
    groups[key].append(c)

# 4. Find groups with duplicates and decide which to keep
to_delete = []
for key, configs in groups.items():
    if len(configs) <= 1:
        continue
    
    # Sort: keep the one with most likes first, then newest as tiebreaker
    configs.sort(key=lambda c: (c.get("likes", 0), c.get("createdAt", "")), reverse=True)
    keeper = configs[0]
    dupes = configs[1:]
    
    print(f"\n🔍 Duplicate group: \"{key[1]}\" by user {key[0]} ({len(configs)} copies)")
    print(f"   ✅ KEEP: id={keeper['id']}, likes={keeper.get('likes',0)}, serial={keeper.get('serialNumber','?')}")
    for d in dupes:
        print(f"   ❌ DELETE: id={d['id']}, likes={d.get('likes',0)}, serial={d.get('serialNumber','?')}")
        to_delete.append(d["id"])

print(f"\n{'='*60}")
print(f"📋 Total duplicates to delete: {len(to_delete)}")

if not to_delete:
    print("✨ No duplicates found!")
    exit(0)

# 5. Confirm and delete
confirm = input("\n⚠️  Proceed with deletion? (yes/no): ").strip().lower()
if confirm != "yes":
    print("Aborted.")
    exit(0)

deleted = 0
failed = 0
for config_id in to_delete:
    try:
        res = requests.delete(f"{API_BASE}/configs/{config_id}", headers=headers)
        if res.status_code == 200:
            deleted += 1
            print(f"  ✅ Deleted {config_id}")
        else:
            failed += 1
            print(f"  ❌ Failed to delete {config_id}: {res.status_code} {res.text[:100]}")
    except Exception as e:
        failed += 1
        print(f"  ❌ Error deleting {config_id}: {e}")

print(f"\n{'='*60}")
print(f"🎉 Done! Deleted: {deleted}, Failed: {failed}")

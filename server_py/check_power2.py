import requests
import os

API_BASE = "https://www.diyxx.com/api"
LOGIN_URL = f"{API_BASE}/auth/login"
HARDWARE_URL = f"{API_BASE}/hardware"

def main():
    # Login
    password = os.getenv("DIYXX_ADMIN_PASSWORD")
    if not password:
        raise RuntimeError("Missing DIYXX_ADMIN_PASSWORD")
    resp = requests.post(LOGIN_URL, data={"username": os.getenv("DIYXX_ADMIN_USERNAME", "xiaoyu"), "password": password, "grant_type": "password"}, timeout=10)
    if resp.status_code != 200:
        print("Login failed:", resp.text)
        return
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch hardware
    print("Fetching RAM and Disk hardware...")
    ram_list = []
    disk_list = []
    
    page = 1
    while True:
        res = requests.get(f"{HARDWARE_URL}?page={page}&limit=50", headers=headers, timeout=10)
        data = res.json().get("data", {})
        items = data.get("items", [])
        if not items:
            break
        
        for item in items:
            if item.get("category") == "ram":
                ram_list.append(item)
            elif item.get("category") in ["disk", "storage"]:
                disk_list.append(item)
        
        if page >= data.get("pages", 1):
            break
        page += 1
        
    print(f"Found {len(ram_list)} RAM and {len(disk_list)} Disk items.")
    
    # Print sample power draws
    print("\n--- RAM Power Draws ---")
    for r in ram_list:
        specs = r.get("specs", {})
        if isinstance(specs, str):
            import json
            specs = json.loads(specs)
        print(f"[{r['id']}] {r['brand']} {r['model']}: {specs.get('power_draw')}")
        
    print("\n--- Disk Power Draws ---")
    for d in disk_list:
        specs = d.get("specs", {})
        if isinstance(specs, str):
            import json
            specs = json.loads(specs)
        print(f"[{d['id']}] {d['brand']} {d['model']}: {specs.get('power_draw')}")

if __name__ == "__main__":
    main()

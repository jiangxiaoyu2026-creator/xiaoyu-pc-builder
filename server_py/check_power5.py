import requests
import os

API_BASE = "https://www.diyxx.com/api"
LOGIN_URL = f"{API_BASE}/auth/login"
HARDWARE_URL = f"{API_BASE}/products"

def main():
    # Login
    password = os.getenv("DIYXX_ADMIN_PASSWORD")
    if not password:
        raise RuntimeError("Missing DIYXX_ADMIN_PASSWORD")
    resp = requests.post(LOGIN_URL, json={"username": os.getenv("DIYXX_ADMIN_USERNAME", "xiaoyu"), "password": password}, timeout=10)
    if resp.status_code != 200:
        print("Login failed:", resp.text)
        return
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch hardware
    print("Fetching RAM and Disk hardware...")
    ram_list = []
    disk_list = []
    
    # Wait, we can fetch all admin products, but /products only returns active products.
    # To get all, we should use /products/admin
    
    page = 1
    while True:
        # Use admin products to get everything
        res = requests.get(f"{API_BASE}/products/admin?page={page}&page_size=100", headers=headers, timeout=10)
        data = res.json()
        items = data.get("items", [])
        if not items:
            break
        
        for item in items:
            if item.get("category") == "ram":
                ram_list.append(item)
            elif item.get("category") in ["disk", "storage"]:
                disk_list.append(item)
        
        if len(items) < 100:
            break
        page += 1
        
    print(f"Found {len(ram_list)} RAM and {len(disk_list)} Disk items.")
    
    # Analyze power draws
    print("\n--- RAM Power Draws ---")
    ram_powers = []
    for r in ram_list:
        specs = r.get("specs", {})
        if isinstance(specs, str):
            import json
            try:
                specs = json.loads(specs)
            except:
                specs = {}
        p = specs.get('power_draw')
        ram_powers.append(p)
        print(f"[{r['id']}] {r['brand']} {r['model']}: {p}")
        
    print("\n--- Disk Power Draws ---")
    disk_powers = []
    for d in disk_list:
        specs = d.get("specs", {})
        if isinstance(specs, str):
            import json
            try:
                specs = json.loads(specs)
            except:
                specs = {}
        p = specs.get('power_draw')
        disk_powers.append(p)
        print(f"[{d['id']}] {d['brand']} {d['model']}: {p}")

    print("\nSummary:")
    print("RAM Power Draws:", set(ram_powers))
    print("Disk Power Draws:", set(disk_powers))

if __name__ == "__main__":
    main()

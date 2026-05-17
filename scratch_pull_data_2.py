import requests
import json
import os

base_url = "https://www.diyxx.com/api"
password = os.getenv("DIYXX_ADMIN_PASSWORD")
if not password:
    raise RuntimeError("Missing DIYXX_ADMIN_PASSWORD")

payload = {
    "username": os.getenv("DIYXX_ADMIN_USERNAME", "xiaoyu"),
    "password": password
}

r = requests.post(f"{base_url}/auth/login", json=payload)
if r.status_code == 200:
    token = r.json().get("access_token")
    print("Got token via login")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Dump online products
    resp = requests.get(f"{base_url}/products/admin?page_size=10000", headers=headers)
    if resp.status_code == 200:
        data = resp.json().get('items', [])
        with open('online_products_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Downloaded {len(data)} products")
    else:
        print("Failed to get products", resp.status_code)
        
    # Dump online configs
    configs_resp = requests.get(f"{base_url}/configs/admin", headers=headers)
    if configs_resp.status_code == 200:
        cdata = configs_resp.json()
        if isinstance(cdata, dict):
            cdata = cdata.get('items', [])
        with open('online_configs_data.json', 'w', encoding='utf-8') as f:
            json.dump(cdata, f, ensure_ascii=False, indent=2)
        print(f"Downloaded {len(cdata)} configs")
    else:
        print("Failed to get configs", configs_resp.status_code)
else:
    print("Login Failed", r.status_code, r.text)

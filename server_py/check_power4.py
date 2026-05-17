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
    resp = requests.post(LOGIN_URL, json={"username": os.getenv("DIYXX_ADMIN_USERNAME", "xiaoyu"), "password": password}, timeout=10)
    if resp.status_code != 200:
        print("Login failed:", resp.text)
        return
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch hardware
    print("Fetching hardware categories...")
    
    res = requests.get(f"{HARDWARE_URL}?page=1&limit=50", headers=headers, timeout=10)
    data = res.json().get("data", {})
    items = data.get("items", [])
    
    categories = set(item.get("category") for item in items)
    print("Categories found on page 1:", categories)

if __name__ == "__main__":
    main()

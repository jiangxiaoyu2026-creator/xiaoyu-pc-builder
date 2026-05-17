import requests
import os
import sys

API_URL = "https://www.diyxx.com/api"
PASSWORD = os.getenv("DIYXX_ADMIN_PASSWORD")
if not PASSWORD:
    sys.exit("Missing DIYXX_ADMIN_PASSWORD")

payload = {
    "username": os.getenv("DIYXX_ADMIN_USERNAME", "xiaoyu"),
    "password": PASSWORD
}

r = requests.post(f"{API_URL}/auth/token", data=payload)
print(r.status_code)
print(r.json())

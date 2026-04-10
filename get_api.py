import requests

API_URL = "https://www.diyxx.com/api"
payload = {
    "username": "xiaoyu",
    "password": "jiangxiaoyu119"
}

r = requests.post(f"{API_URL}/auth/token", data=payload)
print(r.status_code)
print(r.json())

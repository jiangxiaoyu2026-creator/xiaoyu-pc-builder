import requests
import json
resp = requests.post("http://127.0.0.1:8000/api/auth/login", json={"username": "admin", "password": "admin123"})
token = resp.json()
if "access_token" in token:
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    resp = requests.get("http://127.0.0.1:8000/api/configs/admin", headers=headers)
    configs = resp.json()
    if len(configs) > 0:
        c = configs[0]
        put_resp = requests.put(f"http://127.0.0.1:8000/api/configs/{c['id']}", json={"sortOrder": 100}, headers=headers)
        print("PUT STATUS:", put_resp.status_code)
        print("PUT BODY:", put_resp.text)
    else:
        print("No configs found")
else:
    print("Login failed", token)

import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Login
req = urllib.request.Request("http://127.0.0.1:8000/api/auth/login", data=json.dumps({"username":"admin","password":"admin123"}).encode('utf-8'), headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
token_data = json.loads(resp.read().decode('utf-8'))
token = token_data['access_token']

# 2. Get Configs
req2 = urllib.request.Request("http://127.0.0.1:8000/api/configs/admin", headers={"Authorization": f"Bearer {token}"})
resp2 = urllib.request.urlopen(req2)
configs = json.loads(resp2.read().decode('utf-8'))
print("Found configs:", len(configs))
if configs:
    c_id = configs[0]['id']
    print("Testing PUT on:", c_id)
    req3 = urllib.request.Request(f"http://127.0.0.1:8000/api/configs/{c_id}", data=json.dumps({"sortOrder": 100}).encode('utf-8'), headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="PUT")
    try:
        resp3 = urllib.request.urlopen(req3)
        print("Success:", resp3.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode('utf-8'))

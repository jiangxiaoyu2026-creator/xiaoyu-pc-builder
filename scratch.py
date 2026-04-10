import json
import hashlib
import requests
from datetime import datetime, timedelta

JD_APP_KEY = "699564c7adac9a64ed8a25c1b697ef69"
JD_APP_SECRET = "9b64c1aa56e6488d9282fa2cc76f0883"
JD_SITE_ID = "4351336021"

def _generate_sign(params, secret):
    sorted_keys = sorted(params.keys())
    s = secret
    for k in sorted_keys:
        s += f"{k}{params[k]}"
    s += secret
    return hashlib.md5(s.encode('utf-8')).hexdigest().upper()

def call_jd_new(material_url):
    method = "jd.union.open.promotion.common.get"
    param_json = json.dumps({
        "promotionCodeReq": {
            "materialId": material_url,
            "siteId": JD_SITE_ID,
            "sceneId": 1
        }
    })
    params = {
        "method": method,
        "app_key": JD_APP_KEY,
        "timestamp": (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S"),
        "format": "json",
        "v": "1.0",
        "sign_method": "md5",
        "360buy_param_json": param_json
    }
    params["sign"] = _generate_sign(params, JD_APP_SECRET)
    
    url = "https://api.jd.com/routerjson"
    print(f"Calling NEW api: {url}")
    r = requests.get(url, params=params, verify=False)
    print(r.text)

print("Testing new endpoint...")
call_jd_new("https://item.jd.com/100062402120.html")

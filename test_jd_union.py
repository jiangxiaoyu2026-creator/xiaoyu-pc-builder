import requests
import hashlib
import time
import json
from datetime import datetime

APP_KEY = "e59fe2912f54f99ba8463f17de681867"
APP_SECRET = "6371f635a8db4ff29e0471ce70b867d4"

def generate_sign(params, secret):
    sorted_keys = sorted(params.keys())
    param_str = secret
    for key in sorted_keys:
        if key != 'sign':
            param_str += key + params[key]
    param_str += secret
    return hashlib.md5(param_str.encode('utf-8')).hexdigest().upper()

def test_api():
    # Attempt to query a memory SKU: 100014352728 or 100114195705
    sku_id = "100114195705"
    param_json = json.dumps({"skuIds": sku_id})
    
    params = {
        "method": "jd.union.open.goods.promotiongoodsinfo.query",
        "app_key": APP_KEY,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "format": "json",
        "v": "1.0",
        "sign_method": "md5",
        "param_json": param_json
    }
    
    params["sign"] = generate_sign(params, APP_SECRET)
    
    url = "https://router.jd.com/api"
    print(f"Requesting URL: {url}")
    print(f"Params: {params}")
    
    response = requests.get(url, params=params)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    
    # Also test `jd.union.open.goods.query` as a fallback
    param_json2 = json.dumps({"goodsReqDTO": {"skuIds": [sku_id]}})
    params2 = {
        "method": "jd.union.open.goods.query",
        "app_key": APP_KEY,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "format": "json",
        "v": "1.0",
        "sign_method": "md5",
        "param_json": param_json2
    }
    params2["sign"] = generate_sign(params2, APP_SECRET)
    print("\n--- Testing goods.query ---")
    response2 = requests.get(url, params=params2)
    print(f"Response: {response2.text}")

if __name__ == "__main__":
    test_api()

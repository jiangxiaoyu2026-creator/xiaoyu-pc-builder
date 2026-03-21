import urllib.request
import json
import traceback

def test_api():
    url = 'http://127.0.0.1:8000/api/ai/generate'
    data = {"prompt": "我要一台能玩黑神话悟空的电脑，预算6000", "budget": 6000, "usage": "gaming", "appearance": "black"}
    headers = {'Content-Type': 'application/json'}
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode('utf-8')
            print("Status:", response.status)
            print("Response:", res_data)
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code)
        print("Reason:", e.reason)
        print("Body:", e.read().decode('utf-8'))
    except Exception as e:
        print("Error:")
        traceback.print_exc()

if __name__ == "__main__":
    test_api()

import urllib.request
import json

url = "http://localhost:8000/api/ai/generate"
payload = {
    "prompt": "我需要一台预算 8000 块钱，带 4070 显卡的海景房电脑主机，最好能发光。",
    "budget": 8000,
    "usage": "gaming" # will be overridden or merged in ai router
}
data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

print("Sending request...")
try:
    with urllib.request.urlopen(req) as response:
        if response.status == 200:
            result = json.loads(response.read().decode('utf-8'))
            print("\n--- AI Response ---")
            print(f"Total Price: {result.get('totalPrice')}")
            print(f"Description:\n{result.get('description')}")
            print("\nItems:")
            if "items" in result:
                for cat, item in result["items"].items():
                    if item:
                        print(f"  {cat}: {item.get('brand')} {item.get('model')} - ¥{item.get('price')} (Count: {item.get('count', 1)})")
                    else:
                        print(f"  {cat}: None")
            
            print("\nEvaluation:")
            print(json.dumps(result.get('evaluation'), indent=2, ensure_ascii=False))
        else:
            print(f"Error: {response.status}")
except Exception as e:
    print(f"Error: {e}")

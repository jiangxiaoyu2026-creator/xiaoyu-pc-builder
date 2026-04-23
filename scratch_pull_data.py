import requests
import json
import time
from aliyun_manage import AliyunECSManager

manager = AliyunECSManager()
base_url = "http://123.56.227.40:8000"

print("Generating fresh Admin Token...")
script = """
import sys
sys.path.append('/root/pcbuilder')
from server_py.utils.auth import create_access_token
print('TOKEN_RESULT:' + create_access_token({'sub': 'admin'}))
"""
cmd_token = f"cd /root/pcbuilder && python3 -c \"{script}\""
res = manager.run_remote_command(cmd_token)
invoke_id = res.split('InvokeId: ')[-1].strip()

start = time.time()
token = ""
while time.time() - start < 60:
    status = manager.get_invocation_status(invoke_id)
    if status in ['Finished', 'Failed', 'Stopped', 'Timeout', 'Success']:
        out = manager.get_invocation_output(invoke_id)
        for line in out.split('\n'):
            if line.startswith('TOKEN_RESULT:'):
                token = line.replace('TOKEN_RESULT:', '').strip()
                break
        break
    time.sleep(2)

if not token:
    print("Failed to get token!")
    exit(1)

print("Got token. Fetching data...")
headers = {"Authorization": f"Bearer {token}"}
resp = requests.get(f"{base_url}/api/products/admin?page_size=10000", headers=headers)
if resp.status_code == 200:
    data = resp.json().get('items', [])
    with open('online_products_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Downloaded {len(data)} products to online_products_data.json")
else:
    print(f"Failed to fetch products: {resp.status_code}")
    print(resp.text)
    
configs_resp = requests.get(f"{base_url}/api/configs/admin?page_size=10000", headers=headers)
if configs_resp.status_code == 200:
    configs_data = configs_resp.json()
    if isinstance(configs_data, dict):
        configs_data = configs_data.get('items', [])
    with open('online_configs_data.json', 'w', encoding='utf-8') as f:
        json.dump(configs_data, f, ensure_ascii=False, indent=2)
    print(f"Downloaded {len(configs_data)} configs to online_configs_data.json")


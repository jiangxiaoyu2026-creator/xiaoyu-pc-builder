import os
import sys
import base64
import time
import requests
from aliyun_manage import AliyunECSManager

def wait_for_output(manager, invoke_id, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Failed', 'Stopped', 'Timeout']:
            return manager.get_invocation_output(invoke_id)
        time.time()
        time.sleep(2)
    return "Timeout"

manager = AliyunECSManager()

# 1. Deploy update.zip
with open('update.zip', 'rb') as f:
    zip_data = f.read()

b64_zip = base64.b64encode(zip_data).decode('utf-8')
cmd = f"echo '{b64_zip}' | base64 -d > /root/pcbuilder/update.zip && cd /root/pcbuilder && unzip -o update.zip"

print("Uploading and extracting update.zip...")
res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()
out = wait_for_output(manager, invoke_id)
print(out)

# 2. Rebuild Frontend
print("Building frontend...")
cmd_build = "su - root -c 'source ~/.bashrc && cd /root/pcbuilder && npm run build'"
res = manager.run_remote_command(cmd_build)
invoke_id = res.split('InvokeId: ')[-1].strip()
out = wait_for_output(manager, invoke_id, timeout=120)
print(out)

# 3. Get Admin Token
print("Getting Admin Token...")
script = """
import sys
sys.path.append('/root/pcbuilder')
from server_py.utils.auth import create_access_token
print('TOKEN_RESULT:' + create_access_token({'sub': 'admin'}))
"""
cmd_token = f"cd /root/pcbuilder && python3 -c \"{script}\""
res = manager.run_remote_command(cmd_token)
invoke_id = res.split('InvokeId: ')[-1].strip()
out = wait_for_output(manager, invoke_id)
token = ""
for line in out.split('\n'):
    if line.startswith('TOKEN_RESULT:'):
        token = line.replace('TOKEN_RESULT:', '').strip()
        break
print(f"Token acquired. Length: {len(token)}")

# 4. Upload Data
if token:
    print("Uploading Recycling Data to live server...")
    url = "http://123.56.227.40:8000/api/recycling-prices/admin/import"
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": open("回收数价格表.xlsm", "rb")}
    resp = requests.post(url, headers=headers, files=files)
    print("Response:", resp.status_code, resp.text)
else:
    print("Failed to get token!")

import requests
from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
base_url = "http://123.56.227.40:8000"

print("1. Generating fresh Admin Token...")
script = """
import sys
sys.path.append('/root/pcbuilder')
from server_py.utils.auth import create_access_token
print('TOKEN_RESULT:' + create_access_token({'sub': 'admin'}))
"""
cmd_token = f"cd /root/pcbuilder && python3 -c \"{script}\""
res = manager.run_remote_command(cmd_token)
invoke_id = res.split('InvokeId: ')[-1].strip()

# wait for token
def wait_for_output(manager, invoke_id, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Failed', 'Stopped', 'Timeout']:
            return manager.get_invocation_output(invoke_id)
        time.time()
        time.sleep(2)
    return "Timeout"

out = wait_for_output(manager, invoke_id)
token = ""
for line in out.split('\n'):
    if line.startswith('TOKEN_RESULT:'):
        token = line.replace('TOKEN_RESULT:', '').strip()
        break

if not token:
    print("Failed to get token!")
    print(out)
    exit(1)

print("Token acquired.")

print("2. Pushing Data via Official /admin/import API...")
headers = {"Authorization": f"Bearer {token}"}
excel_file = "台式电脑回收核价表3.28.xlsm"

with open(excel_file, "rb") as f:
    resp = requests.post(
        f"{base_url}/api/recycling-prices/admin/import", 
        headers=headers, 
        files={"file": (excel_file, f, "application/vnd.ms-excel.sheet.macroEnabled.12")}
    )

print("Status Code:", resp.status_code)
if resp.status_code == 200:
    print("API Response:", resp.json())
else:
    print("Error Details:", resp.text)

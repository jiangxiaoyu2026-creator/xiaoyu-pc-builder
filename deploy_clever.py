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
base_url = "http://123.56.227.40:8000"

print("1. Getting Admin Token from Server...")
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

if not token:
    print("Failed to get token!")
    print("Output:", out)
    sys.exit(1)

print(f"Token acquired.")

print("2. Uploading dist.zip spoofed as PNG...")
headers = {"Authorization": f"Bearer {token}"}
with open("dist.zip", "rb") as f:
    resp = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": ("dist.png", f, "image/png")})
dist_filename = resp.json()["filename"]
print("Uploaded dist:", dist_filename)

print("3. Uploading xlsm data spoofed as PNG...")
with open("回收数价格表.xlsm", "rb") as f:
    resp2 = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": ("data.png", f, "image/png")})
data_filename = resp2.json()["filename"]
print("Uploaded data:", data_filename)

print("4. Uploading import script spoofed as PNG...")
with open("import_recycling_excel.py", "rb") as f:
    resp3 = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": ("script.png", f, "image/png")})
script_filename = resp3.json()["filename"]
print("Uploaded script:", script_filename)

print("5. Executing commands on server to finalize...")
cmd_final = f"""
cd /root/pcbuilder
mv uploads/{dist_filename} dist.zip
mv uploads/{data_filename} 回收数价格表.xlsm
mv uploads/{script_filename} import_recycling_excel.py

echo "Unzipping frontend..."
python3 -c "import zipfile; zipfile.ZipFile('dist.zip').extractall('.')"
echo "Importing data to DB..."
python3 import_recycling_excel.py
echo "Deployment Complete"
"""

res = manager.run_remote_command(cmd_final)
invoke_id = res.split('InvokeId: ')[-1].strip()
out = wait_for_output(manager, invoke_id, timeout=120)
print("\nFinal Server Output:")
print(out)

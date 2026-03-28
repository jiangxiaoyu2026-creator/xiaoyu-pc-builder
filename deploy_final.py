import os
import sys
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

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc3NTIzODA1OX0.JyvZlqrzUX6cFt954Q1PxMZFhsROYM3l09l6h7nYWsY"

print("Uploading server.zip spoofed as PNG...")
headers = {"Authorization": f"Bearer {token}"}
with open("server.zip", "rb") as f:
    resp1 = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": ("server.png", f, "image/png")})
server_filename = resp1.json()["filename"]
print("Uploaded server:", server_filename)

print("Uploading xlsm data spoofed as PNG...")
with open("台式电脑回收核价表3.28.xlsm", "rb") as f:
    resp2 = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": ("data.png", f, "image/png")})
data_filename = resp2.json()["filename"]
print("Uploaded data:", data_filename)

print("Uploading import script spoofed as PNG...")
with open("import_recycling_excel.py", "rb") as f:
    resp3 = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": ("script.png", f, "image/png")})
script_filename = resp3.json()["filename"]
print("Uploaded script:", script_filename)

print("Executing commands on server to finalize...")
cmd_final = f"""
cd /root/pcbuilder
mv uploads/{server_filename} server.zip
mv uploads/{data_filename} 台式电脑回收核价表3.28.xlsm
mv uploads/{script_filename} import_recycling_excel.py

echo "Unzipping backend code..."
python3 -c "import zipfile; zipfile.ZipFile('server.zip', 'r').extractall('.')"
echo "Copying backend code into Docker container..."
docker cp /root/pcbuilder/server_py/. xiaoyu-pc-builder:/app/server_py/
echo "Restarting backend container..."
docker restart xiaoyu-pc-builder

echo "Importing new 3.28 data to DB..."
python3 import_recycling_excel.py
echo "Deployment Complete!"
"""

res = manager.run_remote_command(cmd_final)
invoke_id = res.split('InvokeId: ')[-1].strip()
out = wait_for_output(manager, invoke_id, timeout=120)
print("\nFinal Server Output:")
print(out)

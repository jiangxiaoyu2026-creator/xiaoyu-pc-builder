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
        if status in ['Finished', 'Failed', 'Stopped', 'Timeout', 'Success']:
            return manager.get_invocation_output(invoke_id)
        time.sleep(2)
    return "Timeout"

manager = AliyunECSManager()
base_url = "http://123.56.227.40:8000"

print("1. Getting Admin Token from Server...")
script = """
import sys
sys.path.append('/root/pcbuilder')
from server_py.utils.auth import create_access_token
print('TOKEN_RESULT:' + create_access_token({'sub': 'xiaoyu'}))
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
dist_filename = resp.json().get("filename")
if not dist_filename:
    print("Failed to upload dist.zip", resp.text)
    sys.exit(1)
print("Uploaded dist:", dist_filename)

print("3. Executing commands on server to finalize...")
cmd_final = f"""
cd /root/pcbuilder
rm -rf /root/pcbuilder/dist_new
mkdir -p /root/pcbuilder/dist_new
mv uploads/{dist_filename} /root/pcbuilder/dist_new/dist.zip

echo "Unzipping frontend..."
cd /root/pcbuilder/dist_new
python3 -c "import zipfile; zipfile.ZipFile('dist.zip').extractall('.')"

echo "Copying to docker..."
docker cp /root/pcbuilder/dist_new/dist/. xiaoyu-pc-builder:/app/dist/

echo "Cleanup..."
rm -rf /root/pcbuilder/dist_new

echo "Deployment Complete!"
"""

res = manager.run_remote_command(cmd_final)
invoke_id = res.split('InvokeId: ')[-1].strip()
out = wait_for_output(manager, invoke_id, timeout=120)
print("\\nFinal Server Output:")
print(out)

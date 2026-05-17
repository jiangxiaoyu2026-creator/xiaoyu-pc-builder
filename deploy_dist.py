import os
import sys
import requests
from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
base_url = "http://123.56.227.40:8000"

def wait_for_output(manager, invoke_id, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Failed', 'Stopped', 'Timeout']:
            return manager.get_invocation_output(invoke_id)
        time.time()
        time.sleep(2)
    return "Timeout"

token = os.getenv("DIYXX_ADMIN_TOKEN")
if not token:
    sys.exit("Missing DIYXX_ADMIN_TOKEN")

print("Uploading Frontend Dist via /api/upload/image...")
headers = {"Authorization": f"Bearer {token}"}

with open("dist.zip", "rb") as f:
    resp = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": ("dist.png", f, "image/png")})

print("Upload response:", resp.status_code, resp.text)
try:
    dist_filename = resp.json().get("filename", resp.json().get("url", "").split("/")[-1])
except Exception:
    import sys; sys.exit(1)

print("Replacing Dist in Remote Docker...")
cmd_final = f"""
cd /root/pcbuilder
mv uploads/{dist_filename} dist.zip
echo "Unzipping frontend..."
python3 -c "import zipfile; zipfile.ZipFile('dist.zip', 'r').extractall('.')"
echo "Copying to Docker..."
docker cp /root/pcbuilder/dist/. xiaoyu-pc-builder:/app/dist/
echo "Success!"
"""
res2 = manager.run_remote_command(cmd_final)
invoke2 = res2.split('InvokeId: ')[-1].strip()
print(wait_for_output(manager, invoke2, 60))

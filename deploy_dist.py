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

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc3NTIzODA1OX0.JyvZlqrzUX6cFt954Q1PxMZFhsROYM3l09l6h7nYWsY"

print("Uploading Frontend Dist via /api/upload/image...")
headers = {"Authorization": f"Bearer {token}"}

with open("dist.zip", "rb") as f:
    resp = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": ("dist.png", f, "image/png")})

dist_filename = resp.json()["filename"]

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

import os, sys, base64, time, requests, glob
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

print("1. Getting Token...")
script = "import sys; sys.path.append('/root/pcbuilder'); from server_py.utils.auth import create_access_token; print('TOKEN_RESULT:' + create_access_token({'sub': 'xiaoyu'}))"
res = manager.run_remote_command(f"python3 -c \"{script}\"")
invoke_id = res.split('InvokeId: ')[-1].strip()
out = wait_for_output(manager, invoke_id)

token = [line.replace('TOKEN_RESULT:', '').strip() for line in out.split('\\n') if line.startswith('TOKEN_RESULT:')][0]
headers = {"Authorization": f"Bearer {token}"}

print("2. Uploading parts...")
parts = sorted(glob.glob("dist_part_*"))
remote_files = []
for idx, part in enumerate(parts):
    with open(part, "rb") as f:
        resp = requests.post(f"{base_url}/api/upload/image", headers=headers, files={"file": (f"{part}.png", f, "image/png")})
    filename = resp.json().get("filename")
    remote_files.append(filename)
    print(f"Uploaded {part} ({idx+1}/{len(parts)}) as {filename}")

print("3. Executing assembly on server...")
concat_cmd = " ".join([f"uploads/{f}" for f in remote_files])
cmd_final = f"""
cd /root/pcbuilder
rm -rf dist_new
mkdir dist_new
cat {concat_cmd} > dist_new/dist.zip
cd dist_new
python3 -c "import zipfile; zipfile.ZipFile('dist.zip').extractall('.')"
docker cp dist/. xiaoyu-pc-builder:/app/dist/
cd ..
rm -rf dist_new
echo 'DEPLOYMENT COMPLETE!'
"""
res = manager.run_remote_command(cmd_final)
invoke_id = res.split('InvokeId: ')[-1].strip()
print(wait_for_output(manager, invoke_id, timeout=120))

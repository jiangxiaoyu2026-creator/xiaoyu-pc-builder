"""Quick deploy: transfer dist.zip via Aliyun ECS API with larger chunks, then unpack into Docker."""
import os, sys, time, base64
from aliyun_manage import AliyunECSManager

manager = AliyunECSManager()
local_zip = "dist.zip"
remote_zip = "/root/pcbuilder/update_dist.zip"

print(f"Preparing to securely transfer {local_zip} via Aliyun ECS API...")
res_clean = manager.run_remote_command(f"rm -f {remote_zip}")
time.sleep(1)

with open(local_zip, "rb") as f:
    file_bytes = f.read()

total_length = len(file_bytes)
CHUNK_SIZE = 5000  # 5KB per chunk - within ECS command limits
total_chunks = (total_length + CHUNK_SIZE - 1) // CHUNK_SIZE

print(f"File size: {total_length} bytes. Total chunks: {total_chunks}")

def wait_for_output(invoke_id, timeout=45):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Success']:
            return True, manager.get_invocation_output(invoke_id)
        elif status in ['Failed', 'Stopped', 'Timeout', 'Error']:
            return False, manager.get_invocation_output(invoke_id)
        time.sleep(1)
    return False, "Python Timeout / Stuck in Pending"

for i in range(total_chunks):
    chunk = file_bytes[i*CHUNK_SIZE : (i+1)*CHUNK_SIZE]
    b64_chunk = base64.b64encode(chunk).decode('utf-8')
    cmd = f"echo '{b64_chunk}' | base64 -d >> {remote_zip}"
    
    res = manager.run_remote_command(cmd)
    invoke_id = res.split('InvokeId: ')[-1].strip()
    success, output = wait_for_output(invoke_id, timeout=45)
    
    if not success:
        print(f"\nError uploading chunk {i+1}/{total_chunks}! Aborting.")
        print("Reason:", output)
        sys.exit(1)
        
    print(f"\rProgress: {i+1}/{total_chunks} chunk(s) uploaded ({(i+1)/total_chunks*100:.1f}%)", end="", flush=True)

print("\n\nUpload finished! Unpacking into Docker container...")

unpack_cmd = f"""
cd /root/pcbuilder
rm -rf /root/pcbuilder/dist_new
mkdir -p /root/pcbuilder/dist_new
python3 -c "import zipfile; zipfile.ZipFile('{remote_zip}', 'r').extractall('/root/pcbuilder/dist_new/')"
# Atomic-ish swap
rm -rf /root/pcbuilder/dist_old
cp -r /root/pcbuilder/dist /root/pcbuilder/dist_old 2>/dev/null || true
rm -rf /root/pcbuilder/dist/*
cp -r /root/pcbuilder/dist_new/dist/* /root/pcbuilder/dist/
# Copy into Docker
docker cp /root/pcbuilder/dist/. xiaoyu-pc-builder:/app/dist/
# Cleanup
rm -rf /root/pcbuilder/dist_new /root/pcbuilder/dist_old {remote_zip}
echo 'DIST DEPLOYED SUCCESSFULLY INTO DOCKER!'
"""
res2 = manager.run_remote_command(unpack_cmd)
invoke2 = res2.split('InvokeId: ')[-1].strip()
succ, out = wait_for_output(invoke2, timeout=60)
print(out)

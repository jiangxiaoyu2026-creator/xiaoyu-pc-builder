import sys, time, base64, os
from aliyun_manage import AliyunECSManager

local_file = 'dist.zip'
remote_b64 = '/root/pcbuilder/temp_dist.b64'
remote_zip = '/root/pcbuilder/dist.zip'
manager = AliyunECSManager()

with open(local_file, "rb") as f:
    b64_content = base64.b64encode(f.read()).decode('utf-8')

chunk_size = 10000
chunks = [b64_content[i:i+chunk_size] for i in range(0, len(b64_content), chunk_size)]

# Clear remote file
manager.run_remote_command(f"rm -f {remote_b64} {remote_zip}")
time.sleep(2)

print(f"Uploading in {len(chunks)} chunks...")
for i, chunk in enumerate(chunks):
    cmd = f"echo '{chunk}' >> {remote_b64}"
    res = manager.run_remote_command(cmd)
    print(f"Chunk {i+1}/{len(chunks)} sent.")
    time.sleep(0.5) # Prevent rate limiting

cmd_extract = f"""
cd /root/pcbuilder
cat {remote_b64} | base64 -d > {remote_zip}
rm -rf dist_new
mkdir -p dist_new
python3 -c "import zipfile; zipfile.ZipFile('{remote_zip}', 'r').extractall('dist_new/')"
cp -r dist_new/dist/* dist/
docker cp dist/. xiaoyu-pc-builder:/app/dist/
rm -rf dist_new {remote_zip} {remote_b64}
echo 'FRONTEND DEPLOYED SUCCESSFULLY'
"""
res = manager.run_remote_command(cmd_extract)
invoke_id = res.split('InvokeId: ')[-1].strip()

start = time.time()
while time.time() - start < 60:
    st = manager.get_invocation_status(invoke_id)
    if st in ['Finished', 'Success', 'Failed']:
        print(manager.get_invocation_output(invoke_id))
        break
    time.sleep(2)

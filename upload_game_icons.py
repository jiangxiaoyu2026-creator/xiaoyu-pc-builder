import os
import sys
import time
import base64
import zipfile
from aliyun_manage import AliyunECSManager

manager = AliyunECSManager()
local_dir = "public/images/games/icons"
zip_name = "game_icons.zip"
remote_zip = "/root/pcbuilder/game_icons.zip"

print(f"Zipping {local_dir}...")
with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(local_dir):
        for file in files:
            if not file.startswith('.'):
                zipf.write(os.path.join(root, file), arcname=file)

print(f"Preparing to transfer {zip_name} to Aliyun ECS...")
manager.run_remote_command(f"rm -f {remote_zip}")
time.sleep(2)

with open(zip_name, "rb") as f:
    file_bytes = f.read()

total_length = len(file_bytes)
CHUNK_SIZE = 8000 
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
    return False, "Timeout"

for i in range(total_chunks):
    chunk = file_bytes[i*CHUNK_SIZE : (i+1)*CHUNK_SIZE]
    b64_chunk = base64.b64encode(chunk).decode('utf-8')
    cmd = f"echo '{b64_chunk}' | base64 -d >> {remote_zip}"
    
    res = manager.run_remote_command(cmd)
    invoke_id = res.split('InvokeId: ')[-1].strip()
    success, output = wait_for_output(invoke_id, timeout=45)
    
    if not success:
        print(f"\nError uploading chunk {i+1}/{total_chunks}! Aborting.")
        sys.exit(1)
        
    print(f"\rProgress: {i+1}/{total_chunks} chunk(s) uploaded ({(i+1)/total_chunks*100:.1f}%)", end="", flush=True)

print("\n\nUpload finished successfully!")

print("Extracting icons into container...")
extract_cmd = f"""
cd /root/pcbuilder
rm -rf game_icons_tmp
mkdir -p game_icons_tmp
python3 -c "import zipfile; zipfile.ZipFile('{remote_zip}', 'r').extractall('game_icons_tmp')"
docker cp game_icons_tmp/. xiaoyu-pc-builder:/app/dist/images/games/icons/
rm -rf game_icons_tmp {remote_zip}
echo 'GAME ICONS UPDATED SUCCESSFULLY!'
"""
res2 = manager.run_remote_command(extract_cmd)
invoke2 = res2.split('InvokeId: ')[-1].strip()
success, output = wait_for_output(invoke2, timeout=60)
print(output)

os.remove(zip_name)

from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
cmd = """
cd /root/pcbuilder/xiaoyu-pc-builder-temp-dist
git fetch origin temp-dist
git reset --hard origin/temp-dist
rm -rf dist
python3 -c "
import zipfile, os, unicodedata
with zipfile.ZipFile('dist.zip', 'r') as z:
    for info in z.infolist():
        try:
            name = info.filename.encode('cp437').decode('utf8')
        except UnicodeDecodeError:
            name = info.filename
        
        name = unicodedata.normalize('NFC', name)
        if info.filename.endswith('/'):
            os.makedirs(name, exist_ok=True)
            continue
        
        os.makedirs(os.path.dirname(name), exist_ok=True)
        with z.open(info) as source, open(name, 'wb') as target:
            target.write(source.read())
"
cp -a dist/. /root/pcbuilder/dist/
docker restart xiaoyu-pc-builder
echo 'FULL DEPLOY SUCCESS'
"""
res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()

start = time.time()
while time.time() - start < 120:
    st = manager.get_invocation_status(invoke_id)
    if st in ['Finished', 'Success', 'Failed']:
        print(manager.get_invocation_output(invoke_id))
        break
    time.sleep(2)

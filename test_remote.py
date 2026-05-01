import sys, time
from aliyun_manage import AliyunECSManager
manager = AliyunECSManager()
cmd = """
cd /root/pcbuilder/xiaoyu-pc-builder-temp-dist
python3 -c "import zipfile; zipfile.ZipFile('dist.zip', 'r').extractall('.')"
docker cp dist/. xiaoyu-pc-builder:/app/dist/
echo 'DEPLOYMENT COMPLETE SUCCESS!'
"""
res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()
for _ in range(25):
    time.sleep(2)
    st = manager.get_invocation_status(invoke_id)
    if st in ['Finished', 'Success', 'Failed']:
        print(manager.get_invocation_output(invoke_id))
        break

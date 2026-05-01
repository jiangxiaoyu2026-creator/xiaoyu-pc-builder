from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
cmd = """
cd /root/pcbuilder/xiaoyu-pc-builder-temp-dist
rm -rf dist
unzip -O UTF-8 dist.zip
docker exec xiaoyu-pc-builder rm -rf /app/dist
docker cp dist/. xiaoyu-pc-builder:/app/dist/
echo 'REDEPLOY SUCCESS'
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

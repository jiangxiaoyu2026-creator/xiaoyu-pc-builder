from aliyun_manage import AliyunECSManager
import time
manager = AliyunECSManager()
cmd = """
cd /root/pcbuilder/xiaoyu-pc-builder-temp-dist
cp -a dist/. /root/pcbuilder/dist/
echo 'MOUNT DEPLOY SUCCESS'
"""
res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()
time.sleep(5)
print(manager.get_invocation_output(invoke_id))

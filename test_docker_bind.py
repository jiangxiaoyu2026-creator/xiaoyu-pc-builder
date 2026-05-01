from aliyun_manage import AliyunECSManager
import time
manager = AliyunECSManager()
res = manager.run_remote_command("docker inspect xiaoyu-pc-builder | grep -A 10 Binds")
invoke_id = res.split('InvokeId: ')[-1].strip()
time.sleep(5)
print(manager.get_invocation_output(invoke_id))

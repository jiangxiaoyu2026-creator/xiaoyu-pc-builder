import time
from aliyun_manage import AliyunECSManager
manager = AliyunECSManager()
res = manager.run_remote_command("ps -p 178460 -o cmd")
invoke_id = res.split('InvokeId: ')[-1].strip()
time.sleep(3)
print(manager.get_invocation_output(invoke_id))

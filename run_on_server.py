import sys
import time
from aliyun_manage import AliyunECSManager

manager = AliyunECSManager()
cmd = sys.argv[1] if len(sys.argv) > 1 else "ls -la /root/pcbuilder"
res = manager.run_remote_command(cmd)
print("Command Response:", res)
invoke_id = res.split('InvokeId: ')[-1].strip()

start = time.time()
while time.time() - start < 15:
    status = manager.get_invocation_status(invoke_id)
    print(f"Status: {status}")
    if status in ['Finished', 'Failed', 'Stopped', 'Timeout', 'Success']:
        print(manager.get_invocation_output(invoke_id))
        break
    time.sleep(2)
else:
    print(manager.get_invocation_output(invoke_id))

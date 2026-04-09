from aliyun_manage import AliyunECSManager
import time
manager = AliyunECSManager()
res = manager.run_remote_command("ls -la /root/pcbuilder")
invoke_id = res.split('InvokeId: ')[-1].strip()
while True:
    status = manager.get_invocation_status(invoke_id)
    if status in ['Finished', 'Failed', 'Stopped', 'Timeout']:
        print(manager.get_invocation_output(invoke_id))
        break
    time.sleep(2)

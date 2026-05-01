import time
from aliyun_manage import AliyunECSManager

def wait_for_output(manager, invoke_id, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Failed', 'Stopped', 'Timeout', 'Success']:
            return manager.get_invocation_output(invoke_id)
        time.sleep(2)
    return "Timeout"

manager = AliyunECSManager()
res = manager.run_remote_command("docker inspect xiaoyu-pc-builder | grep -A 10 'PortBindings'")
invoke_id = res.split('InvokeId: ')[-1].strip()
print(wait_for_output(manager, invoke_id))

import sys, time
from aliyun_manage import AliyunECSManager
manager = AliyunECSManager()
print("Triggering git pull and build on server...")
res = manager.run_remote_command("cd /root/pcbuilder && git pull origin main && npm run build")
if 'InvokeId:' not in res:
    print(res)
    sys.exit(1)
invoke_id = res.split('InvokeId: ')[-1].strip()
print(f"Triggered, InvokeId: {invoke_id}")
start = time.time()
while time.time() - start < 300:
    status = manager.get_invocation_status(invoke_id)
    if status in ['Finished', 'Failed', 'Stopped', 'Timeout']:
        print("Status:", status)
        print("Output:\n", manager.get_invocation_output(invoke_id))
        sys.exit(0 if status == 'Finished' else 1)
    time.sleep(5)
print("Timeout waiting for build")
sys.exit(1)

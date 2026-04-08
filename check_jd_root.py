from aliyun_manage import AliyunECSManager
import time
manager = AliyunECSManager()
res = manager.run_remote_command("docker exec xiaoyu-pc-builder cat /app/dist/jd_root.txt")
invoke_id = res.split('InvokeId: ')[-1].strip()

start = time.time()
out = "Timeout"
while time.time() - start < 10:
    status = manager.get_invocation_status(invoke_id)
    if status in ['Finished']:
        out = manager.get_invocation_output(invoke_id)
        break
    time.sleep(2)
print("Output:", out)

from aliyun_manage import AliyunECSManager
import time
manager = AliyunECSManager()
res = manager.run_remote_command("docker exec xiaoyu-pc-builder ls -la /app/dist > /root/icons7.txt && cat /root/icons7.txt")
invoke_id = res.split('InvokeId: ')[-1].strip()
time.sleep(5)
print(manager.get_invocation_output(invoke_id))

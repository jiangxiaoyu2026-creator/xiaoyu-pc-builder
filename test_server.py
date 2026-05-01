from aliyun_manage import AliyunECSManager
manager = AliyunECSManager()
res = manager.run_remote_command("docker exec xiaoyu-pc-builder ls -la /app/dist/images/games/icons > /root/icons.txt")
invoke_id = res.split('InvokeId: ')[-1].strip()
import time
time.sleep(10)
res = manager.run_remote_command("cat /root/icons.txt")
invoke_id = res.split('InvokeId: ')[-1].strip()
time.sleep(10)
print(manager.get_invocation_output(invoke_id))

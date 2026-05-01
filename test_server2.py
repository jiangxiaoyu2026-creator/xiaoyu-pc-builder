from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
cmd = "docker exec xiaoyu-pc-builder ls -la /app/dist/images/games/icons > /root/icons.txt && cat /root/icons.txt"
res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()

time.sleep(5)
st = manager.get_invocation_status(invoke_id)
print(manager.get_invocation_output(invoke_id))

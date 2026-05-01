from aliyun_manage import AliyunECSManager
import time
manager = AliyunECSManager()
res = manager.run_remote_command("ls -la /root/pcbuilder/xiaoyu-pc-builder-temp-dist/dist/images/games/icons > /root/icons5.txt && cat /root/icons5.txt")
invoke_id = res.split('InvokeId: ')[-1].strip()
time.sleep(5)
print(manager.get_invocation_output(invoke_id))

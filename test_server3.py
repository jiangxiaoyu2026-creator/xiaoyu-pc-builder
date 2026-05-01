from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
cmd = "ls -la /root/pcbuilder/xiaoyu-pc-builder-temp-dist/dist/images/games/icons > /root/icons2.txt && cat /root/icons2.txt"
res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()

time.sleep(5)
st = manager.get_invocation_status(invoke_id)
print(manager.get_invocation_output(invoke_id))

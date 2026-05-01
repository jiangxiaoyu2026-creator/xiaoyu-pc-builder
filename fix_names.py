from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
cmd = "docker exec xiaoyu-pc-builder ls -la /app/dist/images/games/icons"
res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()

while True:
    st = manager.get_invocation_status(invoke_id)
    if st in ['Finished', 'Success']:
        print(manager.get_invocation_output(invoke_id))
        break
    time.sleep(2)

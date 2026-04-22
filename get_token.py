import sys
from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
script = """
import sys
sys.path.append('/root/pcbuilder')
from server_py.utils.auth import create_access_token
print('TOKEN_RESULT:' + create_access_token({'sub': 'admin'}))
"""
cmd_token = f'cd /root/pcbuilder && python3 -c "{script}"'
res = manager.run_remote_command(cmd_token)
invoke_id = res.split('InvokeId: ')[-1].strip()

start = time.time()
while time.time() - start < 30:
    status = manager.get_invocation_status(invoke_id)
    if status in ['Finished', 'Failed', 'Stopped', 'Timeout', 'Success']:
        print(manager.get_invocation_output(invoke_id))
        break
    time.sleep(2)

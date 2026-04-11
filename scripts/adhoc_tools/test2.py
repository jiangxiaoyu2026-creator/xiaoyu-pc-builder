import urllib.request, json, base64
from aliyun_manage import AliyunECSManager

script = """
with open('/root/pcbuilder/server_py/scripts/inject_simulator_data_v2.py', 'r', encoding='utf-8') as f:
    print(f.read())
"""

b64 = base64.b64encode(script.encode()).decode()
m = AliyunECSManager()
res = m.run_remote_command(f"echo '{b64}' | base64 -d | python3 -")

import time
time.sleep(5)
invoke_id = res.split("InvokeId: ")[1].strip()
print(m.get_invocation_output(invoke_id))

from aliyun_manage import AliyunECSManager
import time

m = AliyunECSManager()
res = m.run_remote_command("cd /root/pcbuilder/server_py && python3 scripts/inject_simulator_data_v2.py")
print("Triggered:", res)

invoke_id = res.split("InvokeId: ")[1].strip()
print("Waiting for completion...")
time.sleep(5)
out = m.get_invocation_output(invoke_id)
print("Output:", out)

import time
import sys
from aliyun_manage import AliyunECSManager

manager = AliyunECSManager()

def wait_for_output(invoke_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Success']:
            return True, manager.get_invocation_output(invoke_id)
        elif status in ['Failed', 'Stopped', 'Timeout', 'Error']:
            return False, manager.get_invocation_output(invoke_id)
        time.sleep(2)
    return False, "Timeout"

print("1. Installing Node.js on server...")
cmd = """
cd /root/pcbuilder
git pull
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install
npm run build
cp -r dist/* /root/pcbuilder/dist/
echo 'DONE DEPLOYMENT'
"""

res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()
print(f"Command sent. InvokeId: {invoke_id}")

success, out = wait_for_output(invoke_id)
print("Output:")
print(out)
if not success:
    sys.exit(1)

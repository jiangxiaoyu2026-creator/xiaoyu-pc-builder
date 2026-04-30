import time
import sys
from aliyun_manage import AliyunECSManager

def wait_for_output(manager, invoke_id, timeout=120):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Failed', 'Stopped', 'Timeout', 'Success']:
            return manager.get_invocation_output(invoke_id)
        time.sleep(2)
    return "Timeout"

manager = AliyunECSManager()
cmd = """
cd /root/pcbuilder
echo "Fetching from git..."
git fetch
echo "Pulling deploy-dist..."
git pull origin deploy-dist
echo "Building frontend..."
npm install
npm run build
echo "Copying to docker..."
docker cp /root/pcbuilder/dist/. xiaoyu-pc-builder:/app/dist/
echo "Done!"
"""
res = manager.run_remote_command(cmd)
invoke_id = res.split('InvokeId: ')[-1].strip()
print(f"Deploying with invoke ID: {invoke_id}")
out = wait_for_output(manager, invoke_id, timeout=180)
print("\nFinal Server Output:")
print(out)

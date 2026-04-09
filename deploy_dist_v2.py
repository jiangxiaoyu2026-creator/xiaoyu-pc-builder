import requests
from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()
base_url = "http://123.56.227.40:8000"

def wait_for_output(manager, invoke_id, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Success', 'Failed', 'Stopped', 'Timeout']:
            return manager.get_invocation_output(invoke_id)
        time.time()
        time.sleep(2)
    return "Timeout"

# Get password from local .env or hardcoded if known
# I think default admin pass is admin123, xiaoyu123, jiangxiaoyu123?
# The password might be in an old script. Let's check.

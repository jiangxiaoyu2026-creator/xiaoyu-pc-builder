from aliyun_manage import AliyunECSManager
import time

manager = AliyunECSManager()

def wait_for_output(manager, invoke_id, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        status = manager.get_invocation_status(invoke_id)
        if status in ['Finished', 'Failed', 'Stopped', 'Timeout']:
            return manager.get_invocation_output(invoke_id)
        time.time()
        time.sleep(2)
    return "Timeout"

def push_jd_root():
    content = "e95d2f4a675fe6f2b5a03540536a3e4e4bf569181278f830"
    
    cmd_final = f"""
    echo "{content}" > /root/pcbuilder/jd_root.txt
    docker cp /root/pcbuilder/jd_root.txt xiaoyu-pc-builder:/app/dist/jd_root.txt
    echo "Successfully pushed jd_root.txt to Docker static html dir."
    """
    
    print("Executing command via Aliyun Assistant...")
    res = manager.run_remote_command(cmd_final)
    invoke_id = res.split('InvokeId: ')[-1].strip()
    
    print(wait_for_output(manager, invoke_id, 60))

if __name__ == "__main__":
    push_jd_root()

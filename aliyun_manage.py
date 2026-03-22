import os
import sys
import json
from typing import List
from dotenv import load_dotenv

from alibabacloud_ecs20140526.client import Client as Ecs20140526Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_ecs20140526 import models as ecs_20140526_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient

# Load environment variables
load_dotenv()

class AliyunECSManager:
    def __init__(self):
        access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID')
        access_key_secret = os.getenv('ALIYUN_ACCESS_KEY_SECRET')
        region_id = 'cn-beijing'  # From screenshot
        
        if not access_key_id or not access_key_secret:
            print("Error: ALIYUN_ACCESS_KEY_ID or ALIYUN_ACCESS_KEY_SECRET not found in .env")
            sys.exit(1)

        config = open_api_models.Config(
            access_key_id=access_key_id,
            access_key_secret=access_key_secret
        )
        config.endpoint = f'ecs.{region_id}.aliyuncs.com'
        self.region_id = region_id
        self.client = Ecs20140526Client(config)
        self.instance_id = 'i-2ze3osfklw5awt79ajp3' # From screenshot

    def get_instance_status(self):
        describe_instances_request = ecs_20140526_models.DescribeInstancesRequest(
            region_id=self.region_id,
            instance_ids=json.dumps([self.instance_id])
        )
        runtime = util_models.RuntimeOptions()
        try:
            response = self.client.describe_instances_with_options(describe_instances_request, runtime)
            instances = response.body.instances.instance
            if instances:
                instance = instances[0]
                return {
                    "InstanceId": instance.instance_id,
                    "InstanceName": instance.instance_name,
                    "Status": instance.status,
                    "PublicIp": instance.public_ip_address.ip_address[0] if instance.public_ip_address.ip_address else "N/A",
                    "Cpu": instance.cpu,
                    "Memory": instance.memory
                }
            else:
                return "Instance not found"
        except Exception as e:
            return f"Error: {str(e)}"

    def start_instance(self):
        start_instance_request = ecs_20140526_models.StartInstanceRequest(
            region_id=self.region_id,
            instance_id=self.instance_id
        )
        try:
            self.client.start_instance(start_instance_request)
            return "Start command sent successfully"
        except Exception as e:
            return f"Error: {str(e)}"

    def stop_instance(self):
        stop_instance_request = ecs_20140526_models.StopInstanceRequest(
            region_id=self.region_id,
            instance_id=self.instance_id
        )
        try:
            self.client.stop_instance(stop_instance_request)
            return "Stop command sent successfully"
        except Exception as e:
            return f"Error: {str(e)}"

    def reboot_instance(self):
        reboot_instance_request = ecs_20140526_models.RebootInstanceRequest(
            region_id=self.region_id,
            instance_id=self.instance_id
        )
        try:
            self.client.reboot_instance(reboot_instance_request)
            return "Reboot command sent successfully"
        except Exception as e:
            return f"Error: {str(e)}"

if __name__ == '__main__':
    manager = AliyunECSManager()
    if len(sys.argv) < 2:
        print("Usage: python aliyun_manage.py [status|start|stop|reboot]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    if command == 'status':
        print(json.dumps(manager.get_instance_status(), indent=4, ensure_ascii=False))
    elif command == 'start':
        print(manager.start_instance())
    elif command == 'stop':
        print(manager.stop_instance())
    elif command == 'reboot':
        print(manager.reboot_instance())
    else:
        print(f"Unknown command: {command}")

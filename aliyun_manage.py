import os
import sys
import json
import base64
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
        access_key_id = os.getenv('ALIYUN_ECS_ACCESS_KEY_ID')
        access_key_secret = os.getenv('ALIYUN_ECS_ACCESS_KEY_SECRET')
        region_id = 'cn-beijing'  # From screenshot
        
        if not access_key_id or not access_key_secret:
            print("Error: ALIYUN_ECS_ACCESS_KEY_ID or ALIYUN_ECS_ACCESS_KEY_SECRET not found in .env")
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

    def sync_env_to_server(self):
        # Read local .env
        try:
            with open('.env', 'r') as f:
                env_content = f.read()
        except Exception as e:
            return f"Error reading local .env: {str(e)}"

        # Prepare base64 content
        encoded_content = base64.b64encode(env_content.encode('utf-8')).decode('utf-8')
        
        # Shell command to write to server
        # We use base64 to avoid quoting issues
        remote_path = '/root/pcbuilder/.env'
        command_content = f"echo '{encoded_content}' | base64 -d > {remote_path} && echo 'Sync successful'"
        
        run_command_request = ecs_20140526_models.RunCommandRequest(
            region_id=self.region_id,
            instance_id=[self.instance_id],
            type='RunShellScript',
            command_content=base64.b64encode(command_content.encode('utf-8')).decode('utf-8')
        )
        
        try:
            response = self.client.run_command(run_command_request)
            return f"Sync command triggered. CommandId: {response.body.command_id}"
        except Exception as e:
            return f"Error triggering sync: {str(e)}"

    def run_remote_command(self, command: str):
        run_command_request = ecs_20140526_models.RunCommandRequest(
            region_id=self.region_id,
            instance_id=[self.instance_id],
            type='RunShellScript',
            command_content=command,
            content_encoding='PlainText',
            timeout=600
        )
        try:
            response = self.client.run_command(run_command_request)
            return f"Command triggered. InvokeId: {response.body.invoke_id}"
        except Exception as e:
            return f"Error triggering command: {str(e)}"

    def get_invocation_status(self, invoke_id):
        describe_invocations_request = ecs_20140526_models.DescribeInvocationsRequest(
            region_id=self.region_id,
            invoke_id=invoke_id
        )
        try:
            response = self.client.describe_invocations(describe_invocations_request)
            invocations = response.body.invocations.invocation
            if invocations:
                return invocations[0].invocation_status
            return "Invocation not found"
        except Exception as e:
            return f"Error: {str(e)}"

    def get_invocation_output(self, invoke_id):
        describe_invocation_results_request = ecs_20140526_models.DescribeInvocationResultsRequest(
            region_id=self.region_id,
            invoke_id=invoke_id
        )
        try:
            response = self.client.describe_invocation_results(describe_invocation_results_request)
            results = response.body.invocation.invocation_results.invocation_result
            if results:
                # Get the last result
                output = results[0].output
                if output:
                    return base64.b64decode(output).decode('utf-8')
                return "No output yet"
            return "Result not found"
        except Exception as e:
            return f"Error: {str(e)}"

if __name__ == '__main__':
    manager = AliyunECSManager()
    if len(sys.argv) < 2:
        print("Usage: python aliyun_manage.py [status|start|stop|reboot|sync-env|run <cmd>|output <invoke_id>|check <invoke_id>]")
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
    elif command == 'sync-env':
        print(manager.sync_env_to_server())
    elif command == 'run' and len(sys.argv) > 2:
        print(manager.run_remote_command(sys.argv[2]))
    elif command == 'output' and len(sys.argv) > 2:
        print(manager.get_invocation_output(sys.argv[2]))
    elif command == 'check' and len(sys.argv) > 2:
        print(manager.get_invocation_status(sys.argv[2]))
    else:
        print(f"Unknown command: {command}")

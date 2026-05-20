import json
import os
import sys
from alibabacloud_ecs20140526.client import Client as EcsClient
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_ecs20140526 import models as ecs_models

ACCESS_KEY_ID = os.getenv("ALIYUN_ECS_ACCESS_KEY_ID")
ACCESS_KEY_SECRET = os.getenv("ALIYUN_ECS_ACCESS_KEY_SECRET")
if not ACCESS_KEY_ID or not ACCESS_KEY_SECRET:
    sys.exit("Missing ALIYUN_ECS_ACCESS_KEY_ID or ALIYUN_ECS_ACCESS_KEY_SECRET")

config = open_api_models.Config(
    access_key_id=ACCESS_KEY_ID,
    access_key_secret=ACCESS_KEY_SECRET,
)

# Try common regions
regions = ['cn-hangzhou', 'cn-shanghai', 'cn-beijing', 'cn-shenzhen', 'cn-hongkong']

for region in regions:
    config.endpoint = f'ecs.{region}.aliyuncs.com'
    client = EcsClient(config)
    try:
        req = ecs_models.DescribeInstancesRequest(region_id=region, page_size=50)
        resp = client.describe_instances(req)
        instances = resp.body.instances.instance
        if instances:
            for inst in instances:
                print(f"Region: {region}")
                print(f"  InstanceId: {inst.instance_id}")
                print(f"  Name: {inst.instance_name}")
                print(f"  Status: {inst.status}")
                print(f"  PublicIPs: {inst.public_ip_address.ip_address if inst.public_ip_address else 'N/A'}")
                print(f"  Memory: {inst.memory}MB")
                print(f"  CPU: {inst.cpu}")
    except Exception as e:
        pass

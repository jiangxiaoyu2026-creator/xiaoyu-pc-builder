from aliyun_manage import AliyunECSManager
manager = AliyunECSManager()
res = manager.run_remote_command("unzip -v")
print(res)

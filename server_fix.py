import time
import sys
from aliyun_manage import AliyunECSManager

manager = AliyunECSManager()

cmd = """
(
echo "Starting deployment fix..."
# Install Node.js for CentOS/Alibaba Cloud Linux
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Fix git corruption by re-fetching
cd /root/pcbuilder
rm -f .git/index
git gc --prune=now
git remote update
git fetch --all
git reset --hard origin/deploy-dist

# Build the frontend
npm install
npm run build

# Apply the dist
rm -rf /root/pcbuilder/dist/*
cp -r dist/* /root/pcbuilder/dist/

echo "SUCCESS"
) > /root/deployment_fix.log 2>&1 &
"""

print("Sending fix command to server...")
res = manager.run_remote_command(cmd)
print(res)
print("Command sent. The server is now building the frontend in the background. It will output to /root/deployment_fix.log")

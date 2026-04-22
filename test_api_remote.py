import sys
sys.path.append('/root/pcbuilder')
from server_py.utils.auth import create_access_token
import urllib.request
import json

token = create_access_token({'sub': 'admin'})
headers = {'Authorization': f'Bearer {token}'}

def test_endpoint(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode('utf-8')
    print(f"URL: {url} -> {status}\n{body[:200]}\n")

test_endpoint('http://localhost:8000/api/stats/market-overview?days=30')
test_endpoint('http://localhost:8000/api/stats/price-trends?days=30')

from fastapi.testclient import TestClient
import sys
import os

# 确保能 import server_py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server_py.main import app

client = TestClient(app)

def test_no_api_key():
    response = client.get("/api/external/market-report-data")
    assert response.status_code == 401
    print("Test no API key: PASS")

def test_wrong_api_key():
    response = client.get("/api/external/market-report-data", headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 403
    print("Test wrong API key: PASS")

def test_valid_api_key():
    response = client.get("/api/external/market-report-data", headers={"X-API-Key": "diyxx-ai-secret-key-2026"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "summary" in data["data"]
    print("Test valid API key (daily): PASS")

def test_weekly_valid_api_key():
    response = client.get("/api/external/market-report-data?period=weekly", headers={"X-API-Key": "diyxx-ai-secret-key-2026"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["meta"]["period"] == "weekly"
    print("Test valid API key (weekly): PASS")

if __name__ == "__main__":
    test_no_api_key()
    test_wrong_api_key()
    test_valid_api_key()
    test_weekly_valid_api_key()
    print("All tests passed!")

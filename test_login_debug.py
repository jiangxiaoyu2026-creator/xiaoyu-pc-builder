import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_login(username, password):
    url = f"{BASE_URL}/auth/login"
    payload = {"username": username, "password": password}
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Testing admin login...")
    test_login("admin", "admin123")
    print("\nTesting user login...")
    test_login("testuser", "password123")

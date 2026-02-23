import requests
import sqlite3

response = requests.post("http://localhost:8000/api/v1/chat/session/init", json={"userParserId": "test"})
print(response.status_code)
print(response.text)

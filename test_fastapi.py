import sys
sys.path.append('.')
from fastapi import FastAPI
from fastapi.testclient import TestClient
from server_py.models import ChatSession
from server_py.db import get_session, engine
from sqlmodel import Session

app = FastAPI()

@app.post("/test")
def test_route():
    with Session(engine) as db:
        chat_session = db.query(ChatSession).first()
        return chat_session

client = TestClient(app)
response = client.post("/test")
print("Response JSON:", response.json())

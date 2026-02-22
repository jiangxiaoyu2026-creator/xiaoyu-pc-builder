from sqlmodel import Session, select
from server_py.db import engine
from server_py.models import ChatSettings, ChatSession

with Session(engine) as session:
    settings = session.exec(select(ChatSettings)).first()
    print(f"Chat settings: {settings}")
    
    sessions = session.exec(select(ChatSession).limit(1)).all()
    print(f"Chat sessions: {len(sessions)}")

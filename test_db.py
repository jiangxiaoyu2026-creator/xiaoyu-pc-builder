from sqlmodel import Session, select
from server_py.db import engine
from server_py.models import ChatSession

with Session(engine) as db:
    stmt = select(ChatSession)
    res = db.exec(stmt).all()
    print("ALL SESSIONS:", res)
    for s in res:
        print(s.dict())

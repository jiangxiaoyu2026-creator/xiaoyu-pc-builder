import sys
import os

# Add server_py to path
sys.path.append(os.path.abspath("server_py"))

from sqlmodel import create_engine, Session, SQLModel
from db import engine
from models import Hardware

with Session(engine) as session:
    hw = session.query(Hardware).first()
    if hw:
        print("Type of specs:", type(hw.specs))
        if isinstance(hw.specs, str):
            print("Specs is a string, which means old data was double encoded and returned as string!")
            print("Content:", hw.specs[:50])
        else:
            print("Specs is a dict/list. Old data was either migrated, or SQLAlchemy parses it correctly.")

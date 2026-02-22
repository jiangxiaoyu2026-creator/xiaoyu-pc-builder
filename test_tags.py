import json
tag = "实用"
escaped_tag = json.dumps(tag).strip('"')
print(f"Tag: {tag}, Escaped: {escaped_tag}")

from sqlmodel import Session, select
from server_py.db import engine
from server_py.models import Config

with Session(engine) as session:
    configs = session.exec(select(Config.tags).limit(5)).all()
    for c in configs:
        print(f"DB Tags: {c}")

from sqlmodel import text
from server_py.db import engine

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE users ADD COLUMN "registerIp" VARCHAR;'))
        print("OK: Added registerIp column")
    except Exception as e:
        print(f"Skipped (may exist): {e}")

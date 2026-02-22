from sqlmodel import Session, text
from server_py.db import engine

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE invitation_codes ADD COLUMN lastUsedAt VARCHAR;'))
        print("Successfully added lastUsedAt column")
    except Exception as e:
        print(f"Error (might exist already): {e}")

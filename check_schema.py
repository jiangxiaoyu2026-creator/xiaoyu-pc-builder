
import sqlite3
import os
from sqlmodel import SQLModel
from server_py.models import User, Hardware, PriceHistory, Config, UsedItem, Setting, RecycleRequest, Order, DailyStat, SMSVerification, EmailVerification, EmailSettings, InvitationCode, ChatSettings, ChatSession, ChatMessage, Article

# Get absolute path for the DB file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FULL_DB_PATH = os.path.join(BASE_DIR, "data/xiaoyu.db")

def check_schema():
    if not os.path.exists(FULL_DB_PATH):
        print(f"Database not found at {FULL_DB_PATH}")
        return

    conn = sqlite3.connect(FULL_DB_PATH)
    cursor = conn.cursor()

    models = [
        User, Hardware, PriceHistory, Config, UsedItem, Setting, 
        RecycleRequest, Order, DailyStat, SMSVerification, 
        EmailVerification, EmailSettings, InvitationCode, 
        ChatSettings, ChatSession, ChatMessage, Article
    ]

    for model in models:
        table_name = model.__tablename__
        print(f"\nChecking table: {table_name}")
        
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        
        if not columns:
            print(f"  [ERROR] Table {table_name} does not exist!")
            continue

        # Check for missing columns
        model_fields = model.__fields__
        for field_name in model_fields:
            if field_name not in columns:
                print(f"  [MISSING COLUMN] {field_name}")
            else:
                pass # print(f"  [OK] {field_name}")

    conn.close()

if __name__ == "__main__":
    check_schema()

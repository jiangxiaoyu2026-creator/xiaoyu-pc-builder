import sqlite3
import os
from server_py.db import FULL_DB_PATH
from server_py.models import User, Hardware, Config, UsedItem, ChatSettings, ChatSession, ChatMessage

def check_schema():
    conn = sqlite3.connect(FULL_DB_PATH)
    cursor = conn.cursor()
    
    tables = {
        "users": User,
        "hardware": Hardware,
        "configs": Config,
        "used_items": UsedItem,
        "chat_settings": ChatSettings,
        "chat_sessions": ChatSession,
        "chat_messages": ChatMessage
    }
    
    for table_name, model in tables.items():
        print(f"--- Checking table: {table_name} ---")
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_cols = {row[1] for row in cursor.fetchall()}
        
        if not existing_cols:
            print(f"Table {table_name} does not exist!")
            continue
            
        model_cols = set(model.__fields__.keys())
        missing = model_cols - existing_cols
        
        if missing:
            print(f"Missing columns in {table_name}: {missing}")
            for col in missing:
                # Basic guessing of types
                col_type = "TEXT"
                field = model.__fields__[col]
                if field.type_ in (int, float):
                    col_type = "REAL" if field.type_ == float else "INTEGER"
                elif field.type_ == bool:
                    col_type = "BOOLEAN"
                
                print(f"Suggestion: ALTER TABLE {table_name} ADD COLUMN {col} {col_type};")
        else:
            print(f"Table {table_name} is up to date.")
    
    conn.close()

if __name__ == "__main__":
    check_schema()

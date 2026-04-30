import os
import sys

# Add the parent directory to sys.path so we can import from server_py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import SQLModel, create_engine
from models import *  # This will import the newly added models

def run_migration(db_path="sqlite:///database.db"):
    print(f"Applying migration to {db_path}...")
    engine = create_engine(db_path)
    # create_all will create tables that don't exist yet
    # It won't alter existing tables if they already exist, but it's safe for new tables like Comment and ConfigLike
    SQLModel.metadata.create_all(engine)
    
    # We also added wechatOpenId to User table. create_all doesn't add columns.
    # We need to manually add the column if it's missing.
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check if column exists
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]
            if "wechatOpenId" not in columns:
                print("Adding wechatOpenId column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN wechatOpenId VARCHAR UNIQUE"))
                conn.commit()
            else:
                print("wechatOpenId column already exists in users table.")
    except Exception as e:
        print(f"Notice during column alteration: {e}")
        
    print("Migration complete!")

if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database.db")
    run_migration(f"sqlite:///{db_file}")
    
    xiaoyu_db = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "xiaoyu.db")
    if os.path.exists(xiaoyu_db):
        run_migration(f"sqlite:///{xiaoyu_db}")
    
    pcbuilder_db = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pc_builder.db")
    if os.path.exists(pcbuilder_db):
        run_migration(f"sqlite:///{pcbuilder_db}")

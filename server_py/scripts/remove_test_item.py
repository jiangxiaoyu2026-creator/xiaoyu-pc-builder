
from sqlmodel import Session, create_engine
import sys
import os

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Hardware

sqlite_file_name = "data/xiaoyu.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def remove_test_item():
    with Session(engine) as session:
        existing = session.get(Hardware, "test-zero-price")
        if existing:
            session.delete(existing)
            session.commit()
            print("Removed test item: test-zero-price")
        else:
            print("Test item not found.")

if __name__ == "__main__":
    remove_test_item()


from sqlmodel import Session, create_engine, SQLModel
import sys
import os

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Hardware

sqlite_file_name = "data/xiaoyu.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def add_zero_price_item():
    with Session(engine) as session:
        # Check if it exists
        existing = session.get(Hardware, "test-zero-price")
        if existing:
            session.delete(existing)
            session.commit()
        
        item = Hardware(
            id="test-zero-price",
            category="ram",
            brand="TestBrand",
            model="Zero Price RAM Test",
            price=0,
            specs='{"memoryType": "DDR5", "capacity": "16GB"}',
            status="active",
            image="https://via.placeholder.com/150",
            sortOrder=10
        )
        session.add(item)
        session.commit()
        print("Added zero price item: test-zero-price")

if __name__ == "__main__":
    add_zero_price_item()

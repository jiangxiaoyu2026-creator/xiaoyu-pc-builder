import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

# Get absolute path for the DB file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "data/xiaoyu.db")

if not os.path.isabs(SQLITE_DB_PATH):
    FULL_DB_PATH = os.path.join(BASE_DIR, SQLITE_DB_PATH)
else:
    FULL_DB_PATH = SQLITE_DB_PATH

# Ensure data directory exists
data_dir = os.path.dirname(FULL_DB_PATH)
if not os.path.exists(data_dir):
    os.makedirs(data_dir, exist_ok=True)

DATABASE_URL = f"sqlite:///{FULL_DB_PATH}"

engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

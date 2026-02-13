import os
from sqlmodel import SQLModel, create_engine, Session, select
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
    _create_default_admin()

def _create_default_admin():
    """创建默认管理员账户"""
    from .models import User
    from .utils.auth import get_password_hash

    with Session(engine) as session:
        # 检查是否已存在管理员
        existing = session.exec(select(User).where(User.username == "admin")).first()
        if existing:
            return

        # 创建默认管理员
        admin = User(
            id="admin-default-001",
            username="admin",
            password=get_password_hash("admin123"),
            role="admin",
            status="active"
        )
        session.add(admin)
        session.commit()
        print("Default admin created: admin / admin123")

def get_session():
    with Session(engine) as session:
        yield session

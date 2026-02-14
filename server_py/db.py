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
    # 先运行 SQLModel 的基础创建
    SQLModel.metadata.create_all(engine)
    
    # 自动补全缺失的列 (由于 SQLModel 不支持自动 Add Column)
    _migrate_extra_columns()
    
    _create_default_admin()

def _migrate_extra_columns():
    """手动检查并补齐模型中定义但数据库中可能缺失的列"""
    import sqlite3
    try:
        conn = sqlite3.connect(FULL_DB_PATH)
        cursor = conn.cursor()
        
        # 补齐 users 表
        cursor.execute("PRAGMA table_info(users)")
        user_cols = [row[1] for row in cursor.fetchall()]
        if 'phone' not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN phone TEXT")
        if 'email' not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
            
        # 补齐 configs 表
        cursor.execute("PRAGMA table_info(configs)")
        config_cols = [row[1] for row in cursor.fetchall()]
        if 'title' not in config_cols:
            cursor.execute("ALTER TABLE configs ADD COLUMN title TEXT")
        if 'description' not in config_cols:
            cursor.execute("ALTER TABLE configs ADD COLUMN description TEXT")
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Migration error: {e}")

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

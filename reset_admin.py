from sqlmodel import Session, select, create_engine
from server_py.models import User
from server_py.utils.auth import get_password_hash
from server_py.db import engine

def reset_admin_password():
    with Session(engine) as session:
        # 1. Check if 'admin' user still exists and delete it to free up confusion
        admin_user = session.exec(select(User).where(User.username == "admin")).first()
        if admin_user:
            print(f"Removing old generic 'admin' user (ID: {admin_user.id}).")
            session.delete(admin_user)
            session.commit()

        # 2. Check for xiaoyu
        xiaoyu_user = session.exec(select(User).where(User.username == "xiaoyu")).first()
        if not xiaoyu_user:
            print("Creating new xiaoyu admin user...")
            xiaoyu_user = User(
                id="admin-default-001",
                username="xiaoyu",
                password=get_password_hash("jiangxiaoyu119"),
                role="admin",
                status="active"
            )
            session.add(xiaoyu_user)
        else:
            print(f"xiaoyu user found (ID: {xiaoyu_user.id}). Updating to admin and resetting password...")
            xiaoyu_user.role = "admin"
            xiaoyu_user.password = get_password_hash("jiangxiaoyu119")
            session.add(xiaoyu_user)
            
        session.commit()
        print("Success! Admin credentials have been reset to: xiaoyu / jiangxiaoyu119")

if __name__ == "__main__":
    reset_admin_password()

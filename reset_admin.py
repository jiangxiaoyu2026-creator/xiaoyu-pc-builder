import os
import sys
from sqlmodel import Session, select, create_engine
from server_py.models import User
from server_py.utils.auth import get_password_hash
from server_py.db import engine

def reset_admin_password():
    admin_username = os.getenv("DIYXX_ADMIN_USERNAME", "xiaoyu")
    admin_password = os.getenv("DIYXX_ADMIN_PASSWORD")
    if not admin_password:
        sys.exit("Missing DIYXX_ADMIN_PASSWORD")

    with Session(engine) as session:
        # 1. Check if 'admin' user still exists and delete it to free up confusion
        admin_user = session.exec(select(User).where(User.username == "admin")).first()
        if admin_user:
            print(f"Removing old generic 'admin' user (ID: {admin_user.id}).")
            session.delete(admin_user)
            session.commit()

        # 2. Check for xiaoyu
        xiaoyu_user = session.exec(select(User).where(User.username == admin_username)).first()
        if not xiaoyu_user:
            print(f"Creating new {admin_username} admin user...")
            xiaoyu_user = User(
                id="admin-default-001",
                username=admin_username,
                password=get_password_hash(admin_password),
                role="admin",
                status="active"
            )
            session.add(xiaoyu_user)
        else:
            print(f"{admin_username} user found (ID: {xiaoyu_user.id}). Updating to admin and resetting password...")
            xiaoyu_user.role = "admin"
            xiaoyu_user.password = get_password_hash(admin_password)
            session.add(xiaoyu_user)
            
        session.commit()
        print(f"Success! Admin password has been reset for: {admin_username}")

if __name__ == "__main__":
    reset_admin_password()

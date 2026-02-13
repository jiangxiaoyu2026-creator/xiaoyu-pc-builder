from sqlmodel import Session, select, create_engine
from server_py.models import User
from server_py.utils.auth import get_password_hash
from server_py.db import engine

def reset_admin_password():
    with Session(engine) as session:
        statement = select(User).where(User.username == "admin")
        user = session.exec(statement).first()
        
        if not user:
            print("Admin user not found! Creating one...")
            user = User(
                id="admin-default-001",
                username="admin",
                password=get_password_hash("admin123"),
                role="admin",
                status="active"
            )
            session.add(user)
        else:
            print(f"Admin user found (ID: {user.id}). Resetting password...")
            user.password = get_password_hash("admin123")
            session.add(user)
            
        session.commit()
        print("Success! Admin password has been reset to: admin123")

if __name__ == "__main__":
    reset_admin_password()

from sqlmodel import Session, select, create_engine
from server_py.models import User
from server_py.utils.auth import get_password_hash, verify_password
from server_py.db import engine, FULL_DB_PATH
import os

def inspect_admin():
    print(f"Checking Database at: {FULL_DB_PATH}")
    if not os.path.exists(FULL_DB_PATH):
        print("ERROR: Database file not found!")
        return

    with Session(engine) as session:
        statement = select(User).where(User.username == "admin")
        user = session.exec(statement).first()
        
        if not user:
            print("Admin user NOT found in DB!")
            return

        print(f"User Found: {user.username}")
        print(f"ID: {user.id}")
        print(f"Role: {user.role}")
        print(f"Stored Hash: {user.password}")
        
        # Test verification
        test_pass = "admin123"
        is_valid = verify_password(test_pass, user.password)
        print(f"Testing password '{test_pass}': {'VALID' if is_valid else 'INVALID'}")
        
        if not is_valid:
            print("Resetting password to 'admin123' with fresh hash...")
            new_hash = get_password_hash(test_pass)
            user.password = new_hash
            session.add(user)
            session.commit()
            print("Password reset. Re-testing...")
            print(f"Re-test '{test_pass}': {'VALID' if verify_password(test_pass, new_hash) else 'INVALID'}")

if __name__ == "__main__":
    inspect_admin()

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

import bcrypt

# Configuration
def _load_secret_key() -> str:
    secret = os.getenv("JWT_SECRET")
    if secret:
        return secret

    db_path = os.getenv("SQLITE_DB_PATH", "data/xiaoyu.db")
    if not os.path.isabs(db_path):
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(project_root, db_path)

    secret_file = os.getenv("JWT_SECRET_FILE") or os.path.join(os.path.dirname(db_path), ".jwt_secret")
    try:
        os.makedirs(os.path.dirname(secret_file), exist_ok=True)
        if os.path.exists(secret_file):
            with open(secret_file, "r", encoding="utf-8") as file:
                stored_secret = file.read().strip()
                if stored_secret:
                    return stored_secret

        generated_secret = secrets.token_urlsafe(32)
        with open(secret_file, "w", encoding="utf-8") as file:
            file.write(generated_secret)
        os.chmod(secret_file, 0o600)
        print(f"Warning: JWT_SECRET is not set; generated persistent secret at {secret_file}.")
        return generated_secret
    except Exception:
        print("Warning: JWT_SECRET is not set and persistent secret creation failed; using an ephemeral per-process secret.")
        return secrets.token_urlsafe(32)

SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

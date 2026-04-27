import os
import binascii
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException, status
from app.config import get_settings

settings = get_settings()

ALGORITHM = "RS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(subject: str, role: str, tenant_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": subject, "role": role, "tenant_id": tenant_id, "type": "access", "exp": expire},
        settings.jwt_private_key,
        algorithm=ALGORITHM,
    )


def create_refresh_token(subject: str, role: str, tenant_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    return jwt.encode(
        {"sub": subject, "role": role, "tenant_id": tenant_id, "type": "refresh", "exp": expire},
        settings.jwt_private_key,
        algorithm=ALGORITHM,
    )


def create_widget_token(tenant_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.widget_token_expire_days)
    return jwt.encode(
        {"sub": f"tenant:{tenant_id}", "type": "widget", "exp": expire},
        settings.jwt_private_key,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_public_key, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def encrypt_api_key(plaintext: str) -> str:
    key = binascii.unhexlify(settings.encryption_master_key)
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return binascii.hexlify(nonce + ciphertext).decode()


def decrypt_api_key(encrypted: str) -> str:
    key = binascii.unhexlify(settings.encryption_master_key)
    raw = binascii.unhexlify(encrypted)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

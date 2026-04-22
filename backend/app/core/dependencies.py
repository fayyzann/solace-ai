import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import decode_token

bearer = HTTPBearer()


async def get_current_tenant_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> uuid.UUID:
    payload = decode_token(credentials.credentials)
    if payload.get("type") not in ("access", "widget"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    token_type = payload["type"]
    if token_type == "widget":
        sub: str = payload["sub"]  # "tenant:<uuid>"
        tenant_id_str = sub.removeprefix("tenant:")
    else:
        tenant_id_str = payload["tenant_id"]

    return uuid.UUID(tenant_id_str)


async def get_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token required")
    if payload.get("role") not in ("tenant_admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return payload


async def get_super_admin(
    payload: dict = Depends(get_admin_user),
) -> dict:
    if payload.get("role") != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin required")
    return payload

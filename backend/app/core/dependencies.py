import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import decode_token
from app.core.supabase_jwt import decode_supabase_jwt

bearer = HTTPBearer()


async def get_current_tenant_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> uuid.UUID:
    """Used by the chat endpoint — validates our custom widget JWT (RS256)."""
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
    """Validate a Supabase JWT and return a dict with sub, email, tenant_id, role."""
    payload = decode_supabase_jwt(credentials.credentials)

    if payload.get("role") != "authenticated":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token required")

    app_meta: dict = payload.get("app_metadata", {})
    tenant_id = app_meta.get("tenant_id")
    role = app_meta.get("solace_role", "tenant_admin")

    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Profile setup incomplete — no tenant associated with this account",
        )

    return {
        "sub": payload["sub"],
        "email": payload.get("email", ""),
        "tenant_id": tenant_id,
        "role": role,
    }


async def get_super_admin(
    payload: dict = Depends(get_admin_user),
) -> dict:
    if payload.get("role") != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin required")
    return payload

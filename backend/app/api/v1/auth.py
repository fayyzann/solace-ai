import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, EmailStr, Field
from app.database import get_db
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.core.security import (
    verify_password_async, hash_password,
    create_access_token, create_refresh_token, create_widget_token, decode_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email == payload.email, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not await verify_password_async(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value, str(user.tenant_id)),
        refresh_token=create_refresh_token(str(user.id), user.role.value, str(user.tenant_id)),
    )


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    claims = decode_token(payload.refresh_token)
    if claims.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    result = await db.execute(
        select(User).where(User.id == claims["sub"], User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value, str(user.tenant_id)),
        refresh_token=create_refresh_token(str(user.id), user.role.value, str(user.tenant_id)),
    )


# ── Self-service signup ───────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8)


class SignupResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    widget_token: str
    tenant_id: str


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Unique email check
    existing_user = await db.execute(
        select(User).where(User.email == payload.email, User.deleted_at.is_(None))
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    # Derive unique slug from company name
    base_slug = re.sub(r"[^a-z0-9]+", "-", payload.company_name.lower()).strip("-") or "tenant"
    slug, suffix = base_slug, 0
    while True:
        taken = await db.execute(
            select(Tenant).where(Tenant.slug == slug, Tenant.deleted_at.is_(None))
        )
        if not taken.scalar_one_or_none():
            break
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    tenant = Tenant(name=payload.company_name, slug=slug)
    db.add(tenant)
    await db.flush()

    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant.id}'"))

    user = User(
        tenant_id=tenant.id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.tenant_admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return SignupResponse(
        access_token=create_access_token(str(user.id), user.role.value, str(tenant.id)),
        refresh_token=create_refresh_token(str(user.id), user.role.value, str(tenant.id)),
        widget_token=create_widget_token(str(tenant.id)),
        tenant_id=str(tenant.id),
    )

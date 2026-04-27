import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.core.dependencies import get_super_admin
from app.core.security import hash_password, create_widget_token
from app.models.tenant import Tenant
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateTenantRequest(BaseModel):
    name: str
    slug: str


class TenantResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    created_at: datetime
    widget_token: str

    class Config:
        from_attributes = True


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.tenant_admin


class UserResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class TenantListItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/tenants", response_model=list[TenantListItem])
async def list_tenants(
    _: dict = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tenant)
        .where(Tenant.deleted_at.is_(None))
        .order_by(Tenant.created_at.desc())
    )
    return result.scalars().all()


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    payload: CreateTenantRequest,
    _: dict = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Tenant).where(Tenant.slug == payload.slug, Tenant.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already in use")

    tenant = Tenant(name=payload.name, slug=payload.slug)
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)

    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        created_at=tenant.created_at,
        widget_token=create_widget_token(str(tenant.id)),
    )


@router.post(
    "/tenants/{tenant_id}/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    tenant_id: uuid.UUID,
    payload: CreateUserRequest,
    _: dict = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))
    )
    if not tenant_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    existing = await db.execute(
        select(User).where(User.email == payload.email, User.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    user = User(
        tenant_id=tenant_id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: uuid.UUID,
    _: dict = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant.deleted_at = datetime.now(timezone.utc)
    await db.commit()

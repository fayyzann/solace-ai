import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.core.dependencies import get_super_admin
from app.core.security import create_widget_token
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.config import get_settings

settings = get_settings()

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


class InviteUserRequest(BaseModel):
    email: EmailStr
    redirect_url: str = ""  # where the invite link lands; defaults to SUPABASE_SITE_URL/accept-invite


class InviteUserResponse(BaseModel):
    email: str
    message: str


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




@router.post("/invite", response_model=InviteUserResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(
    payload: InviteUserRequest,
    _: dict = Depends(get_super_admin),
):
    """Send a Supabase invite email. The user clicks the link → /accept-invite page."""
    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY",
        )

    from supabase import create_client
    sb = create_client(settings.supabase_url, settings.supabase_service_key)

    redirect_to = payload.redirect_url or None
    try:
        sb.auth.admin.invite_user_by_email(payload.email, options={"redirect_to": redirect_to} if redirect_to else {})
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return InviteUserResponse(
        email=payload.email,
        message=f"Invite sent to {payload.email}",
    )


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

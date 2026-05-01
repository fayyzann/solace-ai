import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.core.security import create_widget_token
from app.core.supabase_jwt import decode_supabase_jwt
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()
settings = get_settings()


class CompleteProfileRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=80)


class CompleteProfileResponse(BaseModel):
    widget_token: str
    tenant_id: str


@router.post("/complete-profile", response_model=CompleteProfileResponse, status_code=status.HTTP_201_CREATED)
async def complete_profile(
    payload: CompleteProfileRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    """Called by the frontend after a user accepts an invitation and sets their password.
    Creates the Tenant + User records and sets app_metadata.tenant_id via Supabase Admin API.
    """
    claims = decode_supabase_jwt(credentials.credentials)
    supabase_id: str = claims["sub"]
    email: str = claims.get("email", "")

    # Idempotent — if the user already completed setup, return their existing token
    existing = await db.execute(
        select(User).where(User.supabase_id == supabase_id, User.deleted_at.is_(None))
    )
    user = existing.scalar_one_or_none()
    if user:
        return CompleteProfileResponse(
            widget_token=create_widget_token(str(user.tenant_id)),
            tenant_id=str(user.tenant_id),
        )

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
        email=email,
        supabase_id=supabase_id,
        hashed_password=None,
        role=UserRole.tenant_admin,
    )
    db.add(user)
    await db.commit()

    # Stamp tenant_id + role into Supabase app_metadata so the JWT carries it on next login
    if settings.supabase_url and settings.supabase_service_key:
        try:
            from supabase import create_client
            sb = create_client(settings.supabase_url, settings.supabase_service_key)
            sb.auth.admin.update_user_by_id(
                supabase_id,
                {"app_metadata": {"tenant_id": str(tenant.id), "solace_role": "tenant_admin"}},
            )
        except Exception:
            pass  # non-fatal — user can still use the app; metadata updates on next login

    return CompleteProfileResponse(
        widget_token=create_widget_token(str(tenant.id)),
        tenant_id=str(tenant.id),
    )


class WidgetTokenResponse(BaseModel):
    widget_token: str


@router.post("/widget-token", response_model=WidgetTokenResponse)
async def get_widget_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    """Returns a fresh 30-day widget embed token for the authenticated admin's tenant."""
    claims = decode_supabase_jwt(credentials.credentials)
    tenant_id = claims.get("app_metadata", {}).get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profile setup incomplete")
    return WidgetTokenResponse(widget_token=create_widget_token(tenant_id))

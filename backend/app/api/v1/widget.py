import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from app.database import get_db
from app.core.dependencies import get_admin_user
from app.core.security import create_widget_token
from app.models.tenant import Tenant

router = APIRouter(prefix="/widget", tags=["widget"])


class WidgetTokenResponse(BaseModel):
    token: str
    embed_url: str


@router.post("/token", response_model=WidgetTokenResponse)
async def generate_widget_token(
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    token = create_widget_token(str(tenant_id))
    return WidgetTokenResponse(
        token=token,
        embed_url=f"/widget/embed?token={token}",
    )

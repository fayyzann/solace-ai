import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from app.database import get_db
from app.core.dependencies import get_admin_user
from app.core.security import encrypt_api_key
from app.models.chat import TenantLLMConfig

router = APIRouter(prefix="/settings", tags=["settings"])

SUPPORTED_PROVIDERS = {"groq", "openai", "anthropic"}


class LLMConfigRequest(BaseModel):
    provider: str
    model: str
    api_key: str


class LLMConfigResponse(BaseModel):
    provider: str
    model: str
    has_custom_key: bool = True


@router.get("/llm", response_model=LLMConfigResponse | None)
async def get_llm_config(
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    result = await db.execute(
        select(TenantLLMConfig).where(TenantLLMConfig.tenant_id == tenant_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        return None
    return LLMConfigResponse(provider=config.provider, model=config.model)


@router.put("/llm", response_model=LLMConfigResponse)
async def upsert_llm_config(
    payload: LLMConfigRequest,
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider. Choose from: {', '.join(sorted(SUPPORTED_PROVIDERS))}",
        )

    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    result = await db.execute(
        select(TenantLLMConfig).where(TenantLLMConfig.tenant_id == tenant_id)
    )
    config = result.scalar_one_or_none()

    encrypted = encrypt_api_key(payload.api_key)

    if config:
        config.provider = payload.provider
        config.model = payload.model
        config.encrypted_api_key = encrypted
    else:
        config = TenantLLMConfig(
            tenant_id=tenant_id,
            provider=payload.provider,
            model=payload.model,
            encrypted_api_key=encrypted,
        )
        db.add(config)

    await db.commit()
    return LLMConfigResponse(provider=payload.provider, model=payload.model)


@router.delete("/llm", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_config(
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    result = await db.execute(
        select(TenantLLMConfig).where(TenantLLMConfig.tenant_id == tenant_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No custom LLM config set")

    await db.delete(config)
    await db.commit()

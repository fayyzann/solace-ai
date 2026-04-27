import uuid
import aiofiles
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, HttpUrl
from app.database import get_db
from app.core.dependencies import get_admin_user
from app.models.knowledge import KnowledgeSource, SourceType, SourceStatus
from app.tasks.ingestion import ingest_knowledge_source

UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class AddURLRequest(BaseModel):
    name: str
    url: HttpUrl


class KnowledgeSourceResponse(BaseModel):
    id: uuid.UUID
    name: str
    source_type: str
    status: str
    chunk_count: int

    class Config:
        from_attributes = True


@router.get("/", response_model=list[KnowledgeSourceResponse])
async def list_sources(
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    result = await db.execute(
        select(KnowledgeSource)
        .where(KnowledgeSource.tenant_id == tenant_id, KnowledgeSource.deleted_at.is_(None))
        .order_by(KnowledgeSource.created_at.desc())
    )
    return result.scalars().all()


@router.post("/url", response_model=KnowledgeSourceResponse, status_code=status.HTTP_201_CREATED)
async def add_url_source(
    payload: AddURLRequest,
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    source = KnowledgeSource(
        tenant_id=tenant_id,
        name=payload.name,
        source_type=SourceType.url,
        source_url=str(payload.url),
        status=SourceStatus.pending,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    ingest_knowledge_source.delay(str(source.id), str(tenant_id))
    return source


@router.post("/upload", response_model=KnowledgeSourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ("application/pdf", "application/octet-stream") and not (
        file.filename or ""
    ).lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    source = KnowledgeSource(
        tenant_id=tenant_id,
        name=file.filename or "Uploaded PDF",
        source_type=SourceType.pdf,
        status=SourceStatus.pending,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    dest_dir = UPLOAD_DIR / str(tenant_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"{source.id}.pdf"

    async with aiofiles.open(dest_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    source.storage_path = str(dest_path)
    await db.commit()

    ingest_knowledge_source.delay(str(source.id), str(tenant_id))
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: uuid.UUID,
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    result = await db.execute(
        select(KnowledgeSource).where(
            KnowledgeSource.id == source_id,
            KnowledgeSource.tenant_id == tenant_id,
            KnowledgeSource.deleted_at.is_(None),
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")

    from datetime import datetime, timezone
    source.deleted_at = datetime.now(timezone.utc)
    await db.commit()

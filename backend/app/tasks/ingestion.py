import asyncio
import uuid
import logging
from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.knowledge import KnowledgeSource, KnowledgeChunk, SourceStatus
from app.services.ingestion.scraper import scrape_url
from app.services.ingestion.parser import extract_text_from_pdf
from app.services.ingestion.chunker import chunk_text
from app.services.ingestion.embedder import embed_texts
from sqlalchemy import select, text

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def ingest_knowledge_source(self, source_id: str, tenant_id: str):
    asyncio.run(_ingest(source_id, tenant_id))


async def _ingest(source_id: str, tenant_id: str):
    async with AsyncSessionLocal() as db:
        await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

        result = await db.execute(
            select(KnowledgeSource).where(KnowledgeSource.id == uuid.UUID(source_id))
        )
        source = result.scalar_one_or_none()
        if not source:
            logger.error("KnowledgeSource %s not found", source_id)
            return

        source.status = SourceStatus.processing
        await db.commit()

        try:
            if source.source_type.value == "url":
                raw_text = await scrape_url(source.source_url)
            elif source.source_type.value == "pdf":
                raw_text = extract_text_from_pdf(source.storage_path)
            else:
                logger.error("Unsupported source type: %s", source.source_type)
                source.status = SourceStatus.failed
                await db.commit()
                return

            chunks = chunk_text(raw_text)
            embeddings = await embed_texts(chunks)

            for i, (content, embedding) in enumerate(zip(chunks, embeddings)):
                db.add(KnowledgeChunk(
                    tenant_id=uuid.UUID(tenant_id),
                    source_id=source.id,
                    content=content,
                    embedding=embedding,
                    chunk_index=i,
                ))

            source.status = SourceStatus.ready
            source.chunk_count = len(chunks)
            await db.commit()
            logger.info("Ingested %d chunks for source %s", len(chunks), source_id)

        except Exception as exc:
            logger.exception("Ingestion failed for source %s", source_id)
            source.status = SourceStatus.failed
            await db.commit()
            raise exc

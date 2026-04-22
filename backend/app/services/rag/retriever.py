import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.knowledge import KnowledgeChunk
from app.services.ingestion.embedder import embed_query
from app.config import get_settings

settings = get_settings()


async def retrieve_chunks(
    query: str,
    tenant_id: uuid.UUID,
    db: AsyncSession,
    top_k: int | None = None,
) -> list[tuple[KnowledgeChunk, float]]:
    top_k = top_k or settings.retriever_top_k
    query_embedding = await embed_query(query)

    # Set tenant context for RLS
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    result = await db.execute(
        select(
            KnowledgeChunk,
            KnowledgeChunk.embedding.cosine_distance(query_embedding).label("distance"),
        )
        .where(KnowledgeChunk.tenant_id == tenant_id)
        .order_by("distance")
        .limit(top_k)
    )

    rows = result.all()
    # Convert distance to similarity score (0-1, higher is better)
    return [(chunk, 1 - distance) for chunk, distance in rows]

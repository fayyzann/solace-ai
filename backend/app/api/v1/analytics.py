import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, Integer
from pydantic import BaseModel
from app.database import get_db
from app.core.dependencies import get_admin_user
from app.models.chat import ChatMessage, ChatSession

router = APIRouter(prefix="/analytics", tags=["analytics"])


class AnalyticsSummary(BaseModel):
    total_sessions: int
    total_messages: int
    escalation_rate: float
    avg_confidence: float


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    admin: dict = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = uuid.UUID(admin["tenant_id"])
    await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

    sessions_result = await db.execute(
        select(func.count()).where(ChatSession.tenant_id == tenant_id)
    )
    total_sessions = sessions_result.scalar() or 0

    msgs_result = await db.execute(
        select(
            func.count().label("total"),
            func.avg(ChatMessage.confidence).label("avg_conf"),
            func.sum(func.cast(ChatMessage.escalated, Integer)).label("escalated"),
        ).where(ChatMessage.tenant_id == tenant_id)
    )
    row = msgs_result.one()

    total_messages = row.total or 0
    avg_confidence = round(float(row.avg_conf or 0), 4)
    escalation_rate = round((row.escalated or 0) / total_messages, 4) if total_messages else 0.0

    return AnalyticsSummary(
        total_sessions=total_sessions,
        total_messages=total_messages,
        escalation_rate=escalation_rate,
        avg_confidence=avg_confidence,
    )

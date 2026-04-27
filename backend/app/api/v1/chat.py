import uuid
import json
import logging
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.database import AsyncSessionLocal
from app.core.dependencies import get_current_tenant_id
from app.models.tenant import Tenant
from app.models.chat import ChatSession, ChatMessage, TenantLLMConfig, MessageRole
from app.services.rag.retriever import retrieve_chunks
from app.services.rag.prompt_builder import build_messages
from app.services.rag.confidence import compute_confidence, should_escalate
from app.services.llm.router import stream_chat
from app.core.security import decrypt_api_key
from app.config import get_settings

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)
settings = get_settings()


class ChatRequest(BaseModel):
    session_id: uuid.UUID | None = None
    message: str
    visitor_id: str = "anonymous"


async def _event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
):
    async def generate():
        async with AsyncSessionLocal() as db:
            try:
                await db.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

                # Load tenant
                tenant_result = await db.execute(
                    select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))
                )
                tenant = tenant_result.scalar_one_or_none()
                if not tenant:
                    yield await _event({"type": "error", "message": "Service unavailable"})
                    yield await _event({"type": "done"})
                    return

                # Get or create chat session.
                # Always use selectinload so session.messages is never lazy-loaded.
                history: list[dict] = []
                if payload.session_id:
                    session_result = await db.execute(
                        select(ChatSession)
                        .where(
                            ChatSession.id == payload.session_id,
                            ChatSession.tenant_id == tenant_id,
                        )
                        .options(selectinload(ChatSession.messages))
                    )
                    session = session_result.scalar_one_or_none()
                    if session:
                        history = [
                            {"role": m.role.value, "content": m.content}
                            for m in session.messages[-6:]
                        ]
                    else:
                        session = ChatSession(tenant_id=tenant_id, visitor_id=payload.visitor_id)
                        db.add(session)
                        await db.commit()
                        await db.refresh(session)
                else:
                    session = ChatSession(tenant_id=tenant_id, visitor_id=payload.visitor_id)
                    db.add(session)
                    await db.commit()
                    await db.refresh(session)
                    # history stays []

                # RAG retrieval
                chunk_scores = await retrieve_chunks(payload.message, tenant_id, db)
                chunks = [c for c, _ in chunk_scores]
                scores = [s for _, s in chunk_scores]
                confidence = compute_confidence(scores)

                # Resolve LLM config (BYOK or default Groq)
                llm_result = await db.execute(
                    select(TenantLLMConfig).where(TenantLLMConfig.tenant_id == tenant_id)
                )
                llm_config = llm_result.scalar_one_or_none()

                if llm_config:
                    provider = llm_config.provider
                    model = llm_config.model
                    api_key = decrypt_api_key(llm_config.encrypted_api_key)
                else:
                    provider = settings.default_llm_provider
                    model = settings.default_llm_model
                    api_key = settings.groq_api_key

                messages = build_messages(payload.message, chunks, tenant.name, history)

                # Stream LLM tokens
                full_response: list[str] = []
                async for token in stream_chat(messages, provider, model, api_key):
                    full_response.append(token)
                    yield await _event({"type": "token", "content": token})

                response_text = "".join(full_response)

                # Persist both turns
                db.add(ChatMessage(
                    session_id=session.id, tenant_id=tenant_id,
                    role=MessageRole.user, content=payload.message,
                ))
                db.add(ChatMessage(
                    session_id=session.id, tenant_id=tenant_id,
                    role=MessageRole.assistant, content=response_text,
                    confidence=confidence,
                    sources=[str(c.source_id) for c in chunks],
                    escalated=should_escalate(confidence),
                ))
                await db.commit()

                yield await _event({
                    "type": "metadata",
                    "confidence": confidence,
                    "sources": [str(c.source_id) for c in chunks],
                })

                if should_escalate(confidence):
                    yield await _event({
                        "type": "escalation",
                        "message": "I'm not confident in my answer. Would you like to speak with a human agent?",
                    })

                yield await _event({"type": "done"})

            except Exception:
                logger.exception("Chat stream error for tenant %s", tenant_id)
                yield await _event({"type": "error", "message": "Something went wrong. Please try again."})
                yield await _event({"type": "done"})

    return StreamingResponse(generate(), media_type="text/event-stream")

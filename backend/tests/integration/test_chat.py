import json
import pytest
import pytest_asyncio
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.models.tenant import Tenant
from app.core.security import create_widget_token

pytestmark = pytest.mark.asyncio


def parse_sse(text: str) -> list[dict]:
    return [
        json.loads(line[6:])
        for line in text.splitlines()
        if line.startswith("data: ")
    ]


@pytest_asyncio.fixture
async def tenant(db: AsyncSession):
    t = Tenant(name="Chat Corp", slug="chat-corp")
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


@pytest_asyncio.fixture
async def chat_client(tenant):
    token = create_widget_token(str(tenant.id))
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as c:
        yield c


async def _fake_stream(*args, **kwargs):
    yield "Hello"
    yield " there"


async def test_chat_stream_returns_sse_events(chat_client):
    with patch("app.api.v1.chat.retrieve_chunks", return_value=[]), \
         patch("app.api.v1.chat.stream_chat", new=_fake_stream):
        resp = await chat_client.post("/chat/stream", json={"message": "Hi"})

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]

    events = parse_sse(resp.text)
    types = [e["type"] for e in events]
    assert "token" in types
    assert "metadata" in types
    assert "done" in types
    assert types[-1] == "done"


async def test_chat_stream_token_content(chat_client):
    with patch("app.api.v1.chat.retrieve_chunks", return_value=[]), \
         patch("app.api.v1.chat.stream_chat", new=_fake_stream):
        resp = await chat_client.post("/chat/stream", json={"message": "Hi"})

    events = parse_sse(resp.text)
    tokens = [e["content"] for e in events if e["type"] == "token"]
    assert "".join(tokens) == "Hello there"


async def test_chat_stream_low_confidence_escalates(chat_client):
    # No chunks → confidence = 0.0 → should escalate
    with patch("app.api.v1.chat.retrieve_chunks", return_value=[]), \
         patch("app.api.v1.chat.stream_chat", new=_fake_stream):
        resp = await chat_client.post("/chat/stream", json={"message": "What is the meaning of life?"})

    events = parse_sse(resp.text)
    types = [e["type"] for e in events]
    assert "escalation" in types


async def test_chat_stream_metadata_has_confidence(chat_client):
    with patch("app.api.v1.chat.retrieve_chunks", return_value=[]), \
         patch("app.api.v1.chat.stream_chat", new=_fake_stream):
        resp = await chat_client.post("/chat/stream", json={"message": "Tell me something"})

    events = parse_sse(resp.text)
    meta = next(e for e in events if e["type"] == "metadata")
    assert "confidence" in meta
    assert isinstance(meta["confidence"], float)


async def test_chat_stream_session_id_accepted(chat_client):
    # First message — creates session implicitly
    with patch("app.api.v1.chat.retrieve_chunks", return_value=[]), \
         patch("app.api.v1.chat.stream_chat", new=_fake_stream):
        resp1 = await chat_client.post("/chat/stream", json={"message": "First message"})

    # Pass a random (non-matching) session_id — route creates a new session gracefully
    import uuid
    with patch("app.api.v1.chat.retrieve_chunks", return_value=[]), \
         patch("app.api.v1.chat.stream_chat", new=_fake_stream):
        resp2 = await chat_client.post("/chat/stream", json={
            "message": "Follow-up",
            "session_id": str(uuid.uuid4()),
        })

    assert resp2.status_code == 200
    events = parse_sse(resp2.text)
    assert events[-1]["type"] == "done"


async def test_chat_stream_rejects_admin_token(tenant):
    from app.core.security import create_access_token
    admin_token = create_access_token(str(tenant.id), "tenant_admin", str(tenant.id))
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {admin_token}"},
    ) as c:
        resp = await c.post("/chat/stream", json={"message": "Hi"})

    assert resp.status_code == 401


async def test_chat_stream_unknown_tenant_returns_error(db: AsyncSession):
    import uuid
    # Widget token for a tenant that doesn't exist in DB
    ghost_tenant_id = str(uuid.uuid4())
    token = create_widget_token(ghost_tenant_id)
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as c:
        with patch("app.api.v1.chat.retrieve_chunks", return_value=[]), \
             patch("app.api.v1.chat.stream_chat", new=_fake_stream):
            resp = await c.post("/chat/stream", json={"message": "Hi"})

    events = parse_sse(resp.text)
    types = [e["type"] for e in events]
    assert "error" in types
    assert "done" in types

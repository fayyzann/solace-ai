import io
import pytest
import pytest_asyncio
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.models.tenant import Tenant
from app.core.security import create_access_token

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def tenant(db: AsyncSession):
    t = Tenant(name="Knowledge Corp", slug="knowledge-corp")
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


@pytest_asyncio.fixture
async def knowledge_client(tenant):
    token = create_access_token(str(tenant.id), "tenant_admin", str(tenant.id))
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as c:
        yield c


async def test_list_knowledge_empty(knowledge_client):
    resp = await knowledge_client.get("/knowledge/")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_add_url_source(knowledge_client):
    with patch("app.api.v1.knowledge.ingest_knowledge_source") as mock_task:
        resp = await knowledge_client.post("/knowledge/url", json={
            "name": "Help Docs",
            "url": "https://example.com/docs",
        })

    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Help Docs"
    assert data["source_type"] == "url"
    assert data["status"] == "pending"
    assert data["chunk_count"] == 0
    mock_task.delay.assert_called_once()


async def test_add_url_source_appears_in_list(knowledge_client):
    with patch("app.api.v1.knowledge.ingest_knowledge_source"):
        await knowledge_client.post("/knowledge/url", json={
            "name": "FAQ",
            "url": "https://example.com/faq",
        })

    resp = await knowledge_client.get("/knowledge/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "FAQ"


async def test_upload_pdf(knowledge_client, tmp_path):
    with patch("app.api.v1.knowledge.ingest_knowledge_source") as mock_task, \
         patch("app.api.v1.knowledge.UPLOAD_DIR", tmp_path):
        pdf_bytes = b"%PDF-1.4 fake pdf content"
        resp = await knowledge_client.post(
            "/knowledge/upload",
            files={"file": ("manual.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "manual.pdf"
    assert data["source_type"] == "pdf"
    assert data["status"] == "pending"
    mock_task.delay.assert_called_once()


async def test_upload_non_pdf_rejected(knowledge_client):
    resp = await knowledge_client.post(
        "/knowledge/upload",
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400


async def test_delete_source(knowledge_client):
    with patch("app.api.v1.knowledge.ingest_knowledge_source"):
        create_resp = await knowledge_client.post("/knowledge/url", json={
            "name": "To Delete",
            "url": "https://example.com/delete-me",
        })
    source_id = create_resp.json()["id"]

    del_resp = await knowledge_client.delete(f"/knowledge/{source_id}")
    assert del_resp.status_code == 204

    list_resp = await knowledge_client.get("/knowledge/")
    assert all(s["id"] != source_id for s in list_resp.json())


async def test_delete_nonexistent_source_returns_404(knowledge_client):
    resp = await knowledge_client.delete("/knowledge/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_knowledge_isolated_between_tenants(db: AsyncSession, tmp_path):
    tenant_a = Tenant(name="Corp A", slug="corp-a")
    tenant_b = Tenant(name="Corp B", slug="corp-b")
    db.add(tenant_a)
    db.add(tenant_b)
    await db.commit()
    await db.refresh(tenant_a)
    await db.refresh(tenant_b)

    token_a = create_access_token(str(tenant_a.id), "tenant_admin", str(tenant_a.id))
    token_b = create_access_token(str(tenant_b.id), "tenant_admin", str(tenant_b.id))

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token_a}"},
    ) as client_a:
        with patch("app.api.v1.knowledge.ingest_knowledge_source"):
            await client_a.post("/knowledge/url", json={"name": "A Docs", "url": "https://a.com"})

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token_b}"},
    ) as client_b:
        resp = await client_b.get("/knowledge/")

    assert resp.json() == []

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.core.security import hash_password

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def seeded_user(db: AsyncSession):
    tenant = Tenant(name="Test Corp", slug="test-corp")
    db.add(tenant)
    await db.flush()
    user = User(
        tenant_id=tenant.id,
        email="admin@test.com",
        hashed_password=hash_password("password123"),
        role=UserRole.tenant_admin,
    )
    db.add(user)
    await db.commit()
    return tenant, user


async def test_login_success(client, seeded_user):
    resp = await client.post("/auth/login", json={"email": "admin@test.com", "password": "password123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client, seeded_user):
    resp = await client.post("/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert resp.status_code == 401


async def test_login_unknown_email(client):
    resp = await client.post("/auth/login", json={"email": "nobody@test.com", "password": "pass"})
    assert resp.status_code == 401


async def test_refresh_returns_new_token(client, seeded_user):
    login = await client.post("/auth/login", json={"email": "admin@test.com", "password": "password123"})
    refresh_token = login.json()["refresh_token"]

    resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_refresh_rejects_access_token(client, seeded_user):
    login = await client.post("/auth/login", json={"email": "admin@test.com", "password": "password123"})
    access_token = login.json()["access_token"]

    resp = await client.post("/auth/refresh", json={"refresh_token": access_token})
    assert resp.status_code == 401


async def test_signup_creates_tenant_and_returns_tokens(client):
    resp = await client.post("/auth/signup", json={
        "company_name": "New Corp",
        "email": "new@corp.com",
        "password": "secure123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "widget_token" in data
    assert "tenant_id" in data


async def test_signup_duplicate_email_returns_409(client, seeded_user):
    resp = await client.post("/auth/signup", json={
        "company_name": "Dup Corp",
        "email": "admin@test.com",
        "password": "secure123",
    })
    assert resp.status_code == 409


async def test_signup_short_password_rejected(client):
    resp = await client.post("/auth/signup", json={
        "company_name": "Short Pass Co",
        "email": "short@pass.com",
        "password": "abc",
    })
    assert resp.status_code == 422

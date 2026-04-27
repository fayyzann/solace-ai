"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-28
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.execute("CREATE TYPE userrole    AS ENUM ('tenant_admin', 'super_admin')")
    op.execute("CREATE TYPE sourcetype  AS ENUM ('url', 'pdf', 'text')")
    op.execute("CREATE TYPE sourcestatus AS ENUM ('pending', 'processing', 'ready', 'failed')")
    op.execute("CREATE TYPE messagerole AS ENUM ('user', 'assistant')")

    op.execute("""
        CREATE TABLE tenants (
            id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            name          VARCHAR(255) NOT NULL,
            slug          VARCHAR(100) NOT NULL,
            widget_config TEXT,
            created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            deleted_at    TIMESTAMPTZ,
            CONSTRAINT uq_tenants_slug UNIQUE (slug)
        )
    """)

    op.execute("""
        CREATE TABLE users (
            id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id       UUID         NOT NULL REFERENCES tenants(id),
            email           VARCHAR(255) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            role            userrole     NOT NULL DEFAULT 'tenant_admin',
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            deleted_at      TIMESTAMPTZ,
            CONSTRAINT uq_users_email UNIQUE (email)
        )
    """)
    op.execute("CREATE INDEX ix_users_tenant_id ON users (tenant_id)")

    op.execute("""
        CREATE TABLE knowledge_sources (
            id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id    UUID         NOT NULL REFERENCES tenants(id),
            name         VARCHAR(255) NOT NULL,
            source_type  sourcetype   NOT NULL,
            source_url   TEXT,
            storage_path TEXT,
            status       sourcestatus NOT NULL DEFAULT 'pending',
            chunk_count  INTEGER      NOT NULL DEFAULT 0,
            created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            deleted_at   TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX ix_knowledge_sources_tenant_id ON knowledge_sources (tenant_id)")

    op.execute("""
        CREATE TABLE knowledge_chunks (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID        NOT NULL REFERENCES tenants(id),
            source_id   UUID        NOT NULL REFERENCES knowledge_sources(id),
            content     TEXT        NOT NULL,
            embedding   vector(1024) NOT NULL,
            chunk_index INTEGER     NOT NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute(
        "CREATE INDEX ix_knowledge_chunks_embedding ON knowledge_chunks "
        "USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)"
    )
    op.execute("CREATE INDEX ix_knowledge_chunks_tenant ON knowledge_chunks (tenant_id)")

    op.execute("""
        CREATE TABLE chat_sessions (
            id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id  UUID         NOT NULL REFERENCES tenants(id),
            visitor_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX ix_chat_sessions_tenant_id ON chat_sessions (tenant_id)")

    op.execute("""
        CREATE TABLE chat_messages (
            id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID        NOT NULL REFERENCES chat_sessions(id),
            tenant_id  UUID        NOT NULL REFERENCES tenants(id),
            role       messagerole NOT NULL,
            content    TEXT        NOT NULL,
            confidence DOUBLE PRECISION,
            sources    JSONB,
            escalated  BOOLEAN     NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX ix_chat_messages_session_id ON chat_messages (session_id)")
    op.execute("CREATE INDEX ix_chat_messages_tenant_id ON chat_messages (tenant_id)")

    op.execute("""
        CREATE TABLE tenant_llm_configs (
            id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id         UUID         NOT NULL REFERENCES tenants(id),
            provider          VARCHAR(50)  NOT NULL,
            model             VARCHAR(100) NOT NULL,
            encrypted_api_key TEXT         NOT NULL,
            created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_llm_configs_tenant_id UNIQUE (tenant_id)
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS tenant_llm_configs")
    op.execute("DROP TABLE IF EXISTS chat_messages")
    op.execute("DROP TABLE IF EXISTS chat_sessions")
    op.execute("DROP TABLE IF EXISTS knowledge_chunks")
    op.execute("DROP TABLE IF EXISTS knowledge_sources")
    op.execute("DROP TABLE IF EXISTS users")
    op.execute("DROP TABLE IF EXISTS tenants")

    op.execute("DROP TYPE IF EXISTS messagerole")
    op.execute("DROP TYPE IF EXISTS sourcestatus")
    op.execute("DROP TYPE IF EXISTS sourcetype")
    op.execute("DROP TYPE IF EXISTS userrole")

# Solace — AI Customer Support Agent
> White-label, multi-tenant, RAG-powered support chatbot with BYOK LLM support.

## Project Name Suggestion
**Solace** — *comfort for customers, clarity for teams.*

---

## Stack at a Glance
- **Backend:** Python 3.12, FastAPI, LangChain, SQLAlchemy 2.0 (async)
- **AI/Vector:** pgvector (HNSW), LangChain RAG pipeline, BYOK LLM routing
- **Embeddings:** Jina AI `jina-embeddings-v3` (1024 dims, 1M tokens/month free)
- **Default LLM:** Groq (Llama 3.1, free tier — 14,400 req/day)
- **Workers:** Celery 5 + Redis (broker + cache)
- **Storage:** PostgreSQL 16 (Supabase), File storage (Supabase Storage), Redis (Upstash)
- **Frontend:** React 18 + Vite (widget iFrame + admin dashboard)
- **Infra:** Render (backend + workers), Vercel (frontend), Supabase (DB + storage), Upstash (Redis)

---

## Hosting Stack (Free Tier)

| Component | Platform | Free Limits |
|---|---|---|
| PostgreSQL 16 + pgvector | **Supabase** | 500MB DB, 1GB file storage |
| Redis (broker + cache) | **Upstash** | 10K commands/day, 256MB |
| FastAPI backend | **Render** | 1 web service (sleeps after 15min idle) |
| Celery worker | **Render** | 1 background worker |
| React widget + dashboard | **Vercel** | Generous free tier, global CDN |
| Embeddings | **Jina AI** | 1M tokens/month free, no credit card |
| Default LLM | **Groq** | 14,400 req/day free, no credit card |
| Secrets / env vars | Platform env vars | All platforms support natively |

> **Migration path:** When revenue justifies it, swap Supabase → AWS RDS, Upstash → ElastiCache,
> Render → EC2, Vercel → CloudFront/S3. Connection strings and env vars change; code does not.

---

## Repo Layout
```
backend/app/
  api/v1/          # Route handlers (auth, knowledge, chat, widget, analytics)
  core/            # security.py, middleware.py, logging.py
  services/
    ingestion/     # URL scraper, doc parser, chunker, embedder
    rag/           # retriever.py, prompt_builder.py, confidence.py
    llm/           # router.py + providers/ (openai, azure, anthropic)
  models/          # SQLAlchemy ORM models
  schemas/         # Pydantic v2 request/response schemas
  tasks/           # Celery task definitions
widget/            # iFrame chat widget (React)
dashboard/         # Admin dashboard (React)
```

---

## Key Commands
```bash
# Local dev (run from project root)
docker-compose up -d postgres redis   # local Postgres + Redis for dev
cd backend && alembic upgrade head
uvicorn app.main:app --reload --port 8000
celery -A app.tasks.celery_app worker --loglevel=info

# Tests
pytest tests/ --cov=app --cov-fail-under=80
pip-audit                          # CVE scan

# Migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1               # rollback one step
```

---

## Critical Architecture Rules
1. **Never accept `tenant_id` from request body/query** — always extract from JWT claims.
2. **Always parameterize DB queries** — no raw SQL string formatting, ever.
3. **Set PostgreSQL tenant context** before any query: `SET LOCAL app.current_tenant_id = '<id>'`
4. **Decrypt API keys at call time only** — never log, cache, or return decrypted keys.
5. **All chat endpoint errors** must return a generic message to the client; full error goes to logs only.
6. **SSRF protection** — validate all user-supplied URLs against `validate_url_for_scraping()` before passing to crawler.

---

## Auth & Tokens
- **Admin JWT (RS256):** 15-min access token + 7-day refresh. Role: `tenant_admin` or `super_admin`.
- **Widget JWT (RS256):** 30-day token embedded in iFrame URL. Payload: `{ "sub": "tenant:<id>", "type": "widget" }`.
- Secrets (JWT private key, AES master key) stored as **platform environment variables** (Render secret env vars).

---

## Database
- Hosted on **Supabase** (dev + prod). Connect via `postgresql+asyncpg://` connection string from Supabase dashboard.
- All tenant-scoped tables have `tenant_id UUID` + RLS enabled.
- Vector column: `VECTOR(1024)` — matches Jina AI `jina-embeddings-v3`. Change requires migration.
- HNSW index on `embeddings.embedding` — do not drop or recreate without downtime plan.
- Soft deletes on `tenants`, `users`, `knowledge_sources` (check `deleted_at IS NULL`).
- **pgvector** is pre-installed on Supabase — enable with `CREATE EXTENSION IF NOT EXISTS vector;`

---

## Environment Variables
```bash
# Local dev — copy to backend/.env
DATABASE_URL=postgresql+asyncpg://aisupport:localpassword@localhost:5432/aisupport_dev
REDIS_URL=redis://localhost:6379/0
ENCRYPTION_MASTER_KEY=<32-byte hex>   # generate: python -c "import os; print(os.urandom(32).hex())"
JWT_PRIVATE_KEY=<RS256 PEM>
JWT_PUBLIC_KEY=<RS256 PEM>
SUPABASE_STORAGE_URL=<from Supabase dashboard>
SUPABASE_SERVICE_KEY=<from Supabase dashboard>
JINA_API_KEY=<from jina.ai dashboard>
GROQ_API_KEY=<from console.groq.com>
ENVIRONMENT=development

# Staging/Prod — set as Render environment variables (never commit)
DATABASE_URL=<Supabase pooler connection string>
REDIS_URL=<Upstash Redis URL>
SUPABASE_STORAGE_URL=<from Supabase dashboard>
SUPABASE_SERVICE_KEY=<from Supabase dashboard>
JINA_API_KEY=<from jina.ai dashboard>
GROQ_API_KEY=<from console.groq.com>
ENCRYPTION_MASTER_KEY=<32-byte hex>
JWT_PRIVATE_KEY=<RS256 PEM>
JWT_PUBLIC_KEY=<RS256 PEM>
ENVIRONMENT=production
```

---

## File Storage (Supabase Storage)
- Replaces AWS S3. Use Supabase Python client (`supabase-py`) for uploads/downloads.
- Bucket: `solace-documents` — private, tenant-scoped paths: `/<tenant_id>/<filename>`
- Access via signed URLs (short-lived, generated at request time).

---

## SSE Streaming Contract
Chat endpoint streams `text/event-stream`. Each line: `data: <json>\n\n`
- `{"type":"token","content":"..."}` — LLM token chunk
- `{"type":"metadata","confidence":0.92,"sources":["id1"]}` — sent after full response
- `{"type":"escalation","message":"..."}` — when confidence < threshold
- `{"type":"error","message":"..."}` — generic error (never expose internals)
- `{"type":"done"}` — always the final event

---

## Adding a New LLM Provider
1. Create `backend/app/services/llm/providers/<name>.py` implementing `stream_chat(messages) -> AsyncGenerator`.
2. Register in `LLMRouter.PROVIDER_MAP`.
3. Add provider to `tenant_llm_configs.provider` check constraint in a new Alembic migration.
4. Update the admin dashboard provider dropdown in `dashboard/src/pages/Settings.tsx`.

---

## Testing Conventions
- Unit tests mock all external I/O (DB, Redis, LLM APIs).
- Integration tests use a real test DB (`TEST_DATABASE_URL`), rolled back after each test.
- Fixture for authenticated client: `tests/conftest.py` → `client`, `admin_client`, `widget_client`.
- Never use production API keys in tests — use `pytest-mock` to patch `APIKeyVault.decrypt`.

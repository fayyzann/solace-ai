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
backend/
  alembic/versions/        # DB migrations (0001_initial_schema.py)
  app/
    api/v1/                # auth, admin, knowledge, chat, widget, analytics, settings
    core/                  # security.py, middleware.py, logging.py, dependencies.py, ssrf.py
    services/
      ingestion/           # scraper.py, parser.py (PDF), chunker.py, embedder.py
      rag/                 # retriever.py, prompt_builder.py, confidence.py
      llm/                 # router.py + providers/ (groq, openai, anthropic)
    models/                # tenant.py, user.py, knowledge.py, chat.py
    tasks/                 # ingestion.py (Celery)
  scripts/
    create_super_admin.py  # one-time bootstrap script
  tests/
    unit/                  # test_security.py, test_confidence.py (no DB needed)
    integration/           # conftest.py with real DB fixtures
uploads/                   # local PDF storage (dev only; use Supabase Storage in prod)
widget/                    # iFrame chat widget (React + Vite, port 5174)
  src/
    hooks/useChat.ts       # SSE streaming hook, session tracking
    components/ChatWidget.tsx
    index.css
dashboard/                 # Admin dashboard (React + Vite, port 5173)
  src/
    api/client.ts          # axios + token refresh interceptor
    context/AuthContext.tsx
    pages/                 # Login, Knowledge, Analytics, Settings
    components/            # Layout (sidebar nav), ProtectedRoute
```

---

## Key Commands
```bash
# Local dev (run from project root)
docker-compose up -d postgres redis            # local Postgres + Redis
docker-compose exec postgres psql -U aisupport -d aisupport_dev -c "CREATE DATABASE aisupport_test;"

cd backend
alembic upgrade head                           # apply migrations
uvicorn app.main:app --reload --port 8000      # API server
celery -A app.tasks.celery_app worker --loglevel=info  # task worker (separate terminal)

cd ../dashboard && npm run dev                 # admin dashboard → http://localhost:5173
cd ../widget && npm run dev                    # chat widget   → http://localhost:5174?token=<widget_jwt>

# Bootstrap first super admin (one-time)
python scripts/create_super_admin.py --email admin@example.com --password secret

# Tests
pytest tests/unit/ -v                          # unit tests (no DB, no external calls)
pytest tests/integration/ -v                   # integration tests (requires test DB)
pytest tests/ --cov=app --cov-fail-under=80
pip-audit                                      # CVE scan

# Migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1                           # rollback one step
```

---

## Critical Architecture Rules
1. **Never accept `tenant_id` from request body/query** — always extract from JWT claims.
2. **Always parameterize DB queries** — no raw SQL string formatting, ever.
3. **Set PostgreSQL tenant context** before any query: `SET LOCAL app.current_tenant_id = '<id>'`
4. **Decrypt API keys at call time only** — never log, cache, or return decrypted keys.
5. **All chat endpoint errors** must return a generic message to the client; full error goes to logs only.
6. **SSRF protection** — validate all user-supplied URLs against `validate_url_for_scraping()` before passing to crawler.
7. **No lazy loading in async SQLAlchemy** — always use `selectinload()` for relationships accessed in async context. Lazy loads trigger `MissingGreenlet` errors.
8. **StreamingResponse + DB sessions** — do not pass a FastAPI dependency-injected `AsyncSession` into a `StreamingResponse` generator. Open `AsyncSessionLocal()` directly inside the generator instead.

---

## Auth & Tokens
- **Admin JWT (RS256):** 15-min access token + 7-day refresh. Role: `tenant_admin` or `super_admin`.
- **Widget JWT (RS256):** 30-day token embedded in iFrame URL. Payload: `{ "sub": "tenant:<id>", "type": "widget" }`.
- JWT keys: set `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` (file paths) or `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (raw PEM). File paths are simpler for local dev.
- Secrets (JWT private key, AES master key) stored as **platform environment variables** (Render secret env vars).

---

## Database
- Local dev: Docker (`pgvector/pgvector:pg16` image). Prod: Supabase.
- Connect via `postgresql+asyncpg://` connection string.
- All tenant-scoped tables have `tenant_id UUID` column.
- Vector column: `VECTOR(1024)` — matches Jina AI `jina-embeddings-v3`. Change requires migration.
- HNSW index on `knowledge_chunks.embedding` — do not drop or recreate without downtime plan.
- Soft deletes on `tenants`, `users`, `knowledge_sources` (always filter `deleted_at IS NULL`).
- Migration files use pure `op.execute()` SQL — do not use `sa.Enum` in `op.create_table()` (causes duplicate type errors with asyncpg).

---

## Environment Variables
```bash
# Local dev — copy to backend/.env
DATABASE_URL=postgresql+asyncpg://aisupport:localpassword@localhost:5432/aisupport_dev
REDIS_URL=redis://localhost:6379/0
ENCRYPTION_MASTER_KEY=<32-byte hex>   # generate: python -c "import os; print(os.urandom(32).hex())"

# JWT keys — use file paths for local dev (avoids multiline .env issues)
JWT_PRIVATE_KEY_PATH=../private.pem
JWT_PUBLIC_KEY_PATH=../public.pem
# OR pass raw PEM (with literal \n or actual newlines):
# JWT_PRIVATE_KEY=<RS256 PEM>
# JWT_PUBLIC_KEY=<RS256 PEM>

SUPABASE_URL=<from Supabase dashboard>
SUPABASE_SERVICE_KEY=<from Supabase dashboard>
JINA_API_KEY=<from jina.ai dashboard>
GROQ_API_KEY=<from console.groq.com>
ENVIRONMENT=development

# Staging/Prod — set as Render environment variables (never commit)
DATABASE_URL=<Supabase pooler connection string>
REDIS_URL=<Upstash Redis URL>
SUPABASE_URL=<from Supabase dashboard>
SUPABASE_SERVICE_KEY=<from Supabase dashboard>
JINA_API_KEY=<from jina.ai dashboard>
GROQ_API_KEY=<from console.groq.com>
ENCRYPTION_MASTER_KEY=<32-byte hex>
JWT_PRIVATE_KEY=<RS256 PEM, literal \n between lines>
JWT_PUBLIC_KEY=<RS256 PEM, literal \n between lines>
ENVIRONMENT=production
```

---

## API Surface (v1)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | Email/password → token pair |
| POST | `/auth/refresh` | — | Refresh token → new token pair |
| GET | `/admin/tenants` | super_admin | List all tenants |
| POST | `/admin/tenants` | super_admin | Create tenant |
| POST | `/admin/tenants/{id}/users` | super_admin | Create user for tenant |
| DELETE | `/admin/tenants/{id}` | super_admin | Soft-delete tenant |
| GET | `/knowledge/` | tenant_admin | List knowledge sources |
| POST | `/knowledge/url` | tenant_admin | Add URL source (async ingestion) |
| POST | `/knowledge/upload` | tenant_admin | Upload PDF (async ingestion) |
| DELETE | `/knowledge/{id}` | tenant_admin | Soft-delete source |
| POST | `/chat/stream` | widget JWT | SSE chat stream (RAG pipeline) |
| POST | `/widget/token` | tenant_admin | Generate 30-day widget embed token |
| GET | `/analytics/summary` | tenant_admin | Sessions, messages, escalation rate |
| GET | `/settings/llm` | tenant_admin | Get BYOK LLM config |
| PUT | `/settings/llm` | tenant_admin | Upsert BYOK LLM config |
| DELETE | `/settings/llm` | tenant_admin | Remove BYOK config (revert to default) |

---

## File Storage (Local Dev vs Prod)
- **Local dev:** PDFs saved to `uploads/{tenant_id}/{source_id}.pdf` in the repo root.
- **Production:** Use Supabase Storage. Bucket: `solace-documents`, paths: `/{tenant_id}/{source_id}.pdf`.
- Supabase storage integration not yet wired up — `uploads/` dir is the current implementation.

---

## SSE Streaming Contract
Chat endpoint streams `text/event-stream`. Each line: `data: <json>\n\n`
- `{"type":"token","content":"..."}` — LLM token chunk
- `{"type":"metadata","confidence":0.92,"sources":["id1"]}` — sent after full response
- `{"type":"escalation","message":"..."}` — when confidence < threshold (default 0.7)
- `{"type":"error","message":"..."}` — generic error (never expose internals)
- `{"type":"done"}` — always the final event

---

## Adding a New LLM Provider
1. Create `backend/app/services/llm/providers/<name>.py` implementing `stream_chat(messages, api_key, model) -> AsyncGenerator`.
2. Register in `PROVIDER_MAP` in `services/llm/router.py`.
3. Add provider name to `SUPPORTED_PROVIDERS` in `api/v1/settings.py`.
4. Add provider to `tenant_llm_configs.provider` check constraint in a new Alembic migration.
5. Update the admin dashboard provider dropdown in `dashboard/src/pages/Settings.tsx` (Phase 3).

---

## Testing Conventions
- **Unit tests** (`tests/unit/`): no DB, no external calls — pure function tests. Run without any services.
- **Integration tests** (`tests/integration/`): real test DB (`aisupport_test`), tables created/dropped per test via `autouse` fixture in `tests/integration/conftest.py`.
- `tests/conftest.py` is intentionally minimal — only settings helpers. DB fixtures live in integration conftest only.
- Never use production API keys in tests — mock `embed_texts`, `stream_chat`, and `decrypt_api_key`.
- `passlib` removed — use `bcrypt` directly (passlib 1.7.4 incompatible with bcrypt ≥ 4.0 on Python 3.12).

---

## Phase Status
- ✅ **Phase 1** — Backend scaffold (models, services, routes, auth, RAG pipeline)
- ✅ **Phase 2** — DB migration, super admin API, LLM config API, PDF ingestion, end-to-end RAG chat
- ✅ **Phase 3** — Frontend (React widget iFrame + admin dashboard with Knowledge/Analytics/Settings pages)
- 🔲 **Phase 4** — Integration tests, Supabase storage wiring, deployment

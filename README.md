# Solace — AI Customer Support Agent

> White-label, multi-tenant, RAG-powered support chatbot with BYOK LLM support.

---

## What is Solace?

Solace lets businesses embed an AI-powered support chatbot on their website in minutes. Each tenant brings their own LLM API key, uploads their knowledge base (docs, URLs), and gets a customizable chat widget. When the AI isn't confident, it automatically escalates to a human agent.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, LangChain, SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 16 + pgvector (via Supabase) |
| Embeddings | Jina AI `jina-embeddings-v3` (1024 dims) |
| Default LLM | Groq — Llama 3.1 (free tier) |
| BYOK LLM | OpenAI, Anthropic, Azure (tenant-supplied keys) |
| Workers | Celery 5 + Redis (via Upstash) |
| Frontend | React 18 + Vite (widget iFrame + admin dashboard) |
| Hosting | Render (backend), Vercel (frontend), Supabase (DB), Upstash (Redis) |

---

## Features

- **Multi-tenant** — full data isolation via PostgreSQL RLS, tenant context from JWT claims
- **RAG pipeline** — URL scraping → chunking → Jina embeddings → pgvector HNSW retrieval
- **SSE streaming** — real-time token-by-token chat responses
- **BYOK LLM** — tenants plug in their own OpenAI/Anthropic/Azure keys, AES-GCM encrypted at rest
- **Confidence scoring** — auto-escalates to human when retrieval confidence is low
- **Embeddable widget** — single `<iframe>` snippet, 30-day signed JWT

---

## Project Structure

```
backend/app/
  api/v1/          # auth, knowledge, chat, widget, analytics
  core/            # security, middleware, logging, SSRF guard
  services/
    ingestion/     # scraper, chunker, Jina embedder
    rag/           # retriever, prompt builder, confidence scorer
    llm/           # router + providers (groq, openai, anthropic)
  models/          # SQLAlchemy ORM models
  tasks/           # Celery ingestion workers
widget/            # iFrame chat widget (React + Vite)
dashboard/         # Admin dashboard (React + Vite)
```

---

## Local Development

### Prerequisites
- Docker + Docker Compose
- Python 3.12
- Node.js 20+

### 1. Clone & configure

```bash
git clone https://github.com/fayyzann/solace-ai.git
cd solace-ai
cp .env.example backend/.env
# Fill in backend/.env with your Jina, Groq, and JWT keys
```

### 2. Generate JWT keys

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# Paste contents into JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in backend/.env
```

### 3. Generate encryption key

```bash
python -c "import os; print(os.urandom(32).hex())"
# Paste into ENCRYPTION_MASTER_KEY in backend/.env
```

### 4. Start services

```bash
docker-compose up -d          # Postgres + Redis
cd backend
pip install -r requirements.txt
alembic upgrade head          # Run migrations
uvicorn app.main:app --reload --port 8000
```

### 5. Start Celery worker (separate terminal)

```bash
cd backend
celery -A app.tasks.celery_app worker --loglevel=info
```

API docs available at `http://localhost:8000/docs`

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Get access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/knowledge/` | List knowledge sources |
| POST | `/api/v1/knowledge/url` | Add URL knowledge source |
| DELETE | `/api/v1/knowledge/{id}` | Remove knowledge source |
| POST | `/api/v1/chat/stream` | SSE streaming chat |
| POST | `/api/v1/widget/token` | Generate widget embed token |
| GET | `/api/v1/analytics/summary` | Usage analytics |

### SSE Streaming Events

```
data: {"type":"token","content":"Hello"}
data: {"type":"metadata","confidence":0.92,"sources":["uuid"]}
data: {"type":"escalation","message":"..."}   # when confidence < 0.7
data: {"type":"error","message":"..."}
data: {"type":"done"}
```

---

## Running Tests

```bash
cd backend
pytest tests/ --cov=app --cov-fail-under=80
```

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Backend | Render | Set env vars from `.env.example` |
| Celery worker | Render background worker | Same repo, different start command |
| Frontend | Vercel | Import `widget/` and `dashboard/` as separate projects |
| Database | Supabase | Enable pgvector: `CREATE EXTENSION IF NOT EXISTS vector;` |
| Redis | Upstash | Copy `rediss://` URL to `REDIS_URL` |

---

## Adding a New LLM Provider

1. Create `backend/app/services/llm/providers/<name>.py` implementing `stream_chat(messages, api_key, model) -> AsyncGenerator`
2. Register it in `PROVIDER_MAP` in `backend/app/services/llm/router.py`
3. Add a migration to update the `provider` check constraint on `tenant_llm_configs`
4. Add the provider to the dropdown in `dashboard/src/pages/Settings.tsx`

---

## License

MIT

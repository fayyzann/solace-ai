#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"

# ── colours ───────────────────────────────────────────────────────────────────
C_RESET='\033[0m'; C_BOLD='\033[1m'
C_SETUP='\033[0;36m'   # cyan    — setup messages
C_API='\033[0;34m'     # blue    — FastAPI
C_WORKER='\033[0;35m'  # magenta — Celery
C_DASH='\033[0;32m'    # green   — Dashboard
C_WIDGET='\033[0;33m'  # yellow  — Widget

info()  { printf "${C_SETUP}[setup    ]${C_RESET} %s\n" "$*"; }
fatal() { printf "\033[0;31m[error    ]${C_RESET} %s\n" "$*" >&2; exit 1; }

# ── pre-flight checks ─────────────────────────────────────────────────────────
[ -f "$ROOT/docker-compose.yml" ] \
  || fatal "docker-compose.yml not found at project root."

if   [ -d "$BACKEND/.venv" ]; then BIN="$BACKEND/.venv/bin"
elif [ -d "$BACKEND/venv"  ]; then BIN="$BACKEND/venv/bin"
else fatal "No Python venv found. Run: cd backend && python -m venv .venv && pip install -r requirements.txt"; fi

[ -d "$ROOT/dashboard/node_modules" ] \
  || fatal "dashboard/node_modules missing — run: cd dashboard && npm install"
[ -d "$ROOT/widget/node_modules" ] \
  || fatal "widget/node_modules missing — run: cd widget && npm install"

# ── PID registry + cleanup ────────────────────────────────────────────────────
PIDS=()

cleanup() {
  printf "\n${C_SETUP}Shutting down all services…${C_RESET}\n"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  printf "${C_SETUP}Done.${C_RESET}\n"
}
trap cleanup EXIT INT TERM

# ── start NAME COLOR WORKDIR CMD [ARGS…] ──────────────────────────────────────
start() {
  local name="$1" color="$2" dir="$3"; shift 3
  (
    cd "$dir"
    "$@" 2>&1 | while IFS= read -r line; do
      printf "${color}[%-9s]${C_RESET} %s\n" "$name" "$line"
    done
  ) &
  PIDS+=($!)
}

# ── 1. Docker services ────────────────────────────────────────────────────────
info "Starting postgres + redis (waiting for healthy)…"
docker compose -f "$ROOT/docker-compose.yml" up -d --wait postgres redis \
  || fatal "docker compose failed — is Docker running?"
info "postgres + redis are healthy."

# ── 2. Backend ────────────────────────────────────────────────────────────────
start "api"    "$C_API"    "$BACKEND" "$BIN/uvicorn" app.main:app --reload --port 8000
start "worker" "$C_WORKER" "$BACKEND" "$BIN/celery" -A app.tasks.celery_app worker --loglevel=info

# ── 3. Frontend ───────────────────────────────────────────────────────────────
start "dashboard" "$C_DASH"   "$ROOT/dashboard" npm run dev
start "widget"    "$C_WIDGET" "$ROOT/widget"    npm run dev

# ── summary ───────────────────────────────────────────────────────────────────
printf "\n${C_BOLD}All services running:${C_RESET}\n"
printf "  ${C_API}[api      ]${C_RESET}  http://localhost:8000/docs\n"
printf "  ${C_DASH}[dashboard]${C_RESET}  http://localhost:5173\n"
printf "  ${C_WIDGET}[widget   ]${C_RESET}  http://localhost:5174?token=<widget_jwt>\n"
printf "  ${C_WORKER}[worker   ]${C_RESET}  Celery (background tasks)\n"
printf "\n${C_BOLD}Press Ctrl+C to stop all services.${C_RESET}\n\n"

wait

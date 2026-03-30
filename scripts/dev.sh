#!/usr/bin/env sh
set -e

# Start full local dev stack:
# - Postgres + API via docker compose
# - Frontend via Next.js dev server

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "[dev] Starting Postgres + API (docker compose)…"
docker compose up -d --build

echo "[dev] Waiting for API health…"
API_URL="${API_URL:-http://127.0.0.1:8080}"
HEALTH_URL="$API_URL/health"

# Wait up to ~60s
i=0
while [ $i -lt 60 ]; do
  if command -v curl >/dev/null 2>&1; then
    code=$(curl -sS -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)
    if [ "$code" = "200" ]; then
      break
    fi
  else
    # Fallback: no curl, just break and let frontend run.
    break
  fi
  i=$((i + 1))
  sleep 1
done

echo "[dev] API: $API_URL"

echo "[dev] Starting frontend (Next.js)…"
cd "$ROOT_DIR/frontend"

if [ ! -d node_modules ]; then
  echo "[dev] Installing frontend dependencies…"
  npm install
fi

export NEXT_PUBLIC_API_BASE_URL="$API_URL"
FRONTEND_PORT="${FRONTEND_PORT:-8888}"

echo "[dev] Frontend: http://127.0.0.1:$FRONTEND_PORT"
npm run dev -- -p "$FRONTEND_PORT"

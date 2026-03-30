# MultiTenantPlatform (API)

## Start everything (recommended)

Starts:

- Docker Postgres (host port `5433`)
- Docker API (host port `8080`)
- Next.js frontend (host port `8888`)

Windows (PowerShell):

- `powershell -ExecutionPolicy Bypass -File scripts/dev.ps1`

macOS/Linux/Git Bash:

- `./scripts/dev.sh`

URLs:

- API: `http://127.0.0.1:8080`
- Frontend: `http://127.0.0.1:8888`

Notes:

- `scripts/dev.*` sets `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080` for the frontend dev server.
- Docker Postgres data persists in the named volume `multitenant_pgdata` (see `docker-compose.yml`).

## Local (Docker + Postgres only)

- Build + run:
  - `docker compose up -d --build`
- API: `http://127.0.0.1:8080`
- Postgres: `localhost:5433` (mapped to container `5432`)

This will:

- start Postgres
- run Alembic migrations on container startup
- start FastAPI via Uvicorn

## Local (no Docker)

- Create a `.env` from `.env.example` and set `DATABASE_URL`
- Install deps: `pip install -r requirements.txt`
- Run migrations: `python -m alembic -c alembic/alembic.ini upgrade head`
- Start API: `uvicorn app.main:app --reload --port 8000`

If you already have local Postgres on `5432`, keep using it and set:

- `DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/saas_platform`

## Deploy (Render)

Recommended approach:

- Deploy the API using the included `Dockerfile`
- Use a managed Postgres instance (Render Postgres)
- Set environment variables:
  - `DATABASE_URL` (Render provides `postgres://...`; the app normalizes this automatically)
  - `SECRET_KEY`
  - `ALGORITHM` (default `HS256`)
  - `ACCESS_TOKEN_EXPIRE_MINUTES` (default 10 days)

The container entrypoint runs `python -m alembic -c alembic/alembic.ini upgrade head` before starting the server.

## Frontend (Vercel)

Vercel is a good fit for the React frontend. The API is typically hosted separately (e.g., Render) and the frontend calls it via the deployed API base URL.

# MultiTenantPlatform (API)

## Local (Docker + Postgres)

- Build + run:
  - `docker compose up --build`
- API: `http://127.0.0.1:8000`

This will:

- start Postgres
- run Alembic migrations on container startup
- start FastAPI via Uvicorn

## Local (no Docker)

- Create a `.env` from `.env.example` and set `DATABASE_URL`
- Install deps: `pip install -r requirements.txt`
- Run migrations: `python -m alembic -c alembic/alembic.ini upgrade head`
- Start API: `uvicorn app.main:app --reload`

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

from contextlib import asynccontextmanager
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import router
from app.db.session import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="🌍 SaaS Platform API",
    description="Multi-Tenant Modular SaaS Platform",
    version="1.0.0",
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "SaaS Platform is running 🚀"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
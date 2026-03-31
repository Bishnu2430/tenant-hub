from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Safe defaults for local/dev. In production, override via environment variables.
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/saas_platform"
    SECRET_KEY: str = "change-me-in-prod"
    ALGORITHM: str = "HS256"
    # Default: 10 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 10

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        if not isinstance(v, str) or not v:
            return v

        # Render (and some providers) provide URLs like: postgres://user:pass@host:port/db
        # SQLAlchemy expects postgresql+driver://...
        if v.startswith("postgres://"):
            return "postgresql+psycopg2://" + v[len("postgres://") :]

        # Allow plain postgresql://... and rely on psycopg2.
        if v.startswith("postgresql://"):
            return "postgresql+psycopg2://" + v[len("postgresql://") :]

        return v

    class Config:
        env_file = ".env"

settings = Settings()
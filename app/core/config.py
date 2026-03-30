from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    # Default: 10 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 10

    class Config:
        env_file = ".env"

settings = Settings()
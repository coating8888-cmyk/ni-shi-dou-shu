from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "倪師斗數 API"
    debug: bool = True
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

    model_config = {
        "env_file": ".env",
        "extra": "ignore",  # Ignore extra fields from .env
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

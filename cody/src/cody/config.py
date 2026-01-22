"""Configuration settings for Cody backend."""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server settings
    host: str = "127.0.0.1"
    port: int = 8000

    # Database settings
    db_path: str = "./data/sessions.db"

    # Authentication
    auth_token: str | None = None

    # Claude API settings (optional - can be passed per-session)
    anthropic_api_key: str | None = None
    anthropic_base_url: str | None = None
    anthropic_model: str = "claude-sonnet-4-20250514"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    @property
    def database_path(self) -> Path:
        """Get the database path as a Path object."""
        return Path(self.db_path)


settings = Settings()

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    app_name: str = "AI Character Chat API"
    openai_api_key: str | None = None
    openai_model_name: str = "gpt-4.1-mini"
    openai_api_base_url: str = "https://api.openai.com/v1"
    gemini_api_key: str | None = None
    gemini_model_name: str = "gemini-2.0-flash"
    gemini_api_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    local_ai_api_key: str | None = None
    local_ai_model_name: str = "llama3.1"
    local_ai_api_base_url: str = "http://127.0.0.1:11434/v1"
    local_ai_max_tokens: int = 180
    local_ai_history_message_limit: int = 12
    local_ai_num_ctx: int = 2048
    cors_allow_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_app_settings() -> AppSettings:
    return AppSettings()

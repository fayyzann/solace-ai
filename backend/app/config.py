from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    environment: str = "development"
    log_level: str = "INFO"
    allowed_origins: str = ""  # comma-separated list; empty = allow all in dev

    # Database
    database_url: str
    test_database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Supabase (storage + auth)
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""  # Project Settings → API → JWT Secret

    # AI
    jina_api_key: str
    groq_api_key: str

    # Encryption
    encryption_master_key: str  # 32-byte hex

    # JWT — set either the raw PEM content or a file path, not both
    jwt_private_key: str = ""
    jwt_public_key: str = ""
    jwt_private_key_path: str = ""  # e.g. ../private.pem
    jwt_public_key_path: str = ""   # e.g. ../public.pem

    # JWT config
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    widget_token_expire_days: int = 30

    # RAG config
    confidence_threshold: float = 0.7
    retriever_top_k: int = 5
    embedding_model: str = "jina-embeddings-v3"
    embedding_dims: int = 1024
    default_llm_provider: str = "groq"
    default_llm_model: str = "llama-3.1-8b-instant"

    @model_validator(mode="after")
    def resolve_jwt_keys(self) -> "Settings":
        def _resolve(raw: str, path: str) -> str:
            # Explicit path field takes priority
            if path:
                return Path(path).read_text().strip()
            # Raw value looks like a file path rather than PEM content
            if raw and not raw.lstrip().startswith("-----"):
                return Path(raw.strip()).read_text().strip()
            # Normalize literal \n sequences (common in CI/CD env vars)
            if raw and "\\n" in raw:
                return raw.replace("\\n", "\n")
            return raw

        self.jwt_private_key = _resolve(self.jwt_private_key, self.jwt_private_key_path)
        self.jwt_public_key = _resolve(self.jwt_public_key, self.jwt_public_key_path)

        if not self.jwt_private_key or not self.jwt_public_key:
            raise ValueError(
                "JWT keys must be set via JWT_PRIVATE_KEY / JWT_PUBLIC_KEY "
                "or JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH"
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()

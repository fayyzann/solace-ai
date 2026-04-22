from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    environment: str = "development"
    log_level: str = "INFO"

    # Database
    database_url: str
    test_database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Supabase storage
    supabase_url: str = ""
    supabase_service_key: str = ""

    # AI
    jina_api_key: str
    groq_api_key: str

    # Encryption
    encryption_master_key: str  # 32-byte hex
    jwt_private_key: str
    jwt_public_key: str

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

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()

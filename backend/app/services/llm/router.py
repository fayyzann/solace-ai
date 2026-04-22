from typing import AsyncGenerator
from app.services.llm.providers import groq, openai, anthropic
from app.config import get_settings

settings = get_settings()

PROVIDER_MAP = {
    "groq": groq.stream_chat,
    "openai": openai.stream_chat,
    "anthropic": anthropic.stream_chat,
}


async def stream_chat(
    messages: list[dict],
    provider: str,
    model: str,
    api_key: str,
) -> AsyncGenerator[str, None]:
    handler = PROVIDER_MAP.get(provider)
    if not handler:
        raise ValueError(f"Unknown LLM provider: {provider}")
    async for token in handler(messages, api_key=api_key, model=model):
        yield token

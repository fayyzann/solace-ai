import httpx
from app.config import get_settings

settings = get_settings()

JINA_EMBED_URL = "https://api.jina.ai/v1/embeddings"


async def embed_texts(texts: list[str]) -> list[list[float]]:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            JINA_EMBED_URL,
            headers={"Authorization": f"Bearer {settings.jina_api_key}"},
            json={
                "model": settings.embedding_model,
                "input": texts,
                "dimensions": settings.embedding_dims,
            },
        )
        response.raise_for_status()
        data = response.json()
        return [item["embedding"] for item in data["data"]]


async def embed_query(text: str) -> list[float]:
    results = await embed_texts([text])
    return results[0]

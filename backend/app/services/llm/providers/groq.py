from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage


def _build_messages(messages: list[dict]) -> list:
    role_map = {"user": HumanMessage, "assistant": AIMessage, "system": SystemMessage}
    return [role_map[m["role"]](content=m["content"]) for m in messages]


async def stream_chat(messages: list[dict], api_key: str, model: str) -> AsyncGenerator[str, None]:
    llm = ChatGroq(api_key=api_key, model=model, streaming=True)
    async for chunk in llm.astream(_build_messages(messages)):
        if chunk.content:
            yield chunk.content

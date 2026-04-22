from app.models.knowledge import KnowledgeChunk

SYSTEM_TEMPLATE = """You are a helpful customer support assistant for {tenant_name}.
Answer questions using only the context provided below. If the answer is not in the context, say you don't know and offer to escalate to a human agent.
Be concise, friendly, and accurate.

Context:
{context}"""


def build_messages(
    query: str,
    chunks: list[KnowledgeChunk],
    tenant_name: str,
    history: list[dict] | None = None,
) -> list[dict]:
    context = "\n\n---\n\n".join(chunk.content for chunk in chunks)
    system_msg = SYSTEM_TEMPLATE.format(tenant_name=tenant_name, context=context)

    messages = [{"role": "system", "content": system_msg}]
    if history:
        messages.extend(history[-6:])  # last 3 turns
    messages.append({"role": "user", "content": query})
    return messages

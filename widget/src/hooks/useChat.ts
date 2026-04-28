import { useState, useCallback, useRef } from "react";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export type ChatMeta = {
  confidence: number | null;
  escalated: boolean;
  escalationMessage: string | null;
};

export function useChat(token: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<ChatMeta>({
    confidence: null,
    escalated: false,
    escalationMessage: null,
  });
  const sessionIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLoading(true);
      setMeta({ confidence: null, escalated: false, escalationMessage: null });

      try {
        const res = await fetch("/api/v1/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionIdRef.current ?? undefined,
            visitor_id: "widget-visitor",
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const event = JSON.parse(line.slice(6));

            if (event.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
            } else if (event.type === "metadata") {
              if (!sessionIdRef.current && event.session_id) {
                sessionIdRef.current = event.session_id;
              }
              setMeta((prev) => ({
                ...prev,
                confidence: event.confidence,
              }));
            } else if (event.type === "escalation") {
              setMeta((prev) => ({
                ...prev,
                escalated: true,
                escalationMessage: event.message,
              }));
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: event.message, streaming: false }
                    : m
                )
              );
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Something went wrong. Please try again.",
                  streaming: false,
                }
              : m
          )
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m
          )
        );
        setLoading(false);
      }
    },
    [token, loading]
  );

  return { messages, loading, meta, sendMessage };
}

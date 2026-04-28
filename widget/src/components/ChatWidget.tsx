import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useChat } from "../hooks/useChat";

interface Props {
  token: string;
}

export default function ChatWidget({ token }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, meta, sendMessage } = useChat(token);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>Support Chat</span>
            <button className="close-btn" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="empty-state">
                Hi there! How can I help you today?
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="bubble">
                  {msg.content}
                  {msg.streaming && <span className="cursor" />}
                </div>
              </div>
            ))}
            {meta.escalated && meta.escalationMessage && (
              <div className="escalation-banner">{meta.escalationMessage}</div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={submit}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        className={`fab ${open ? "fab-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle chat"
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}

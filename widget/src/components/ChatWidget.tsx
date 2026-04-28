import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useChat } from "../hooks/useChat";

interface Props {
  token: string;
}

export default function ChatWidget({ token }: Props) {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, meta, sendMessage } = useChat(token);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

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
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="12" cy="5" r="3"/>
                <path d="M7 11V9a5 5 0 0110 0v2"/>
              </svg>
            </div>
            <div className="chat-header-info">
              <div className="chat-header-name">Acme Support</div>
              <div className="chat-header-status">
                <span className="chat-header-dot" />
                <span className="chat-header-status-text">Online · usually replies instantly</span>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setOpen(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Escalation banner */}
          {meta.escalated && meta.escalationMessage && (
            <div className="escalation-banner">{meta.escalationMessage}</div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                <div style={{ fontWeight: 600, color: "var(--slate-700)", marginBottom: 4 }}>Hi there!</div>
                <div>How can I help you today?</div>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`msg-row ${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="msg-avatar">🤖</div>
                )}
                <div className={`bubble ${msg.role}`}>
                  {msg.content}
                  {msg.streaming && <span className="cursor-blink" />}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-row">
              <textarea
                ref={inputRef}
                className="chat-textarea"
                rows={1}
                placeholder="Type a message…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={submit}
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <div className="powered-by">Powered by <strong>Solace</strong></div>
          </div>
        </div>
      )}

      {/* FAB pill */}
      <button
        className="fab-pill"
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle support chat"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>Support Chat</span>
            <span className="fab-pill-dot" />
          </>
        )}
      </button>
    </>
  );
}

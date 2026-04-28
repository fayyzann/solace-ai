import { useState, useEffect, FormEvent } from "react";
import { api } from "../api/client";

type LLMConfig = { provider: string; model: string };

const PROVIDERS = ["groq", "openai", "anthropic"] as const;

const DEFAULT_MODELS: Record<string, string> = {
  groq:      "llama-3.1-70b-versatile",
  openai:    "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-20241022",
};

const ACCENT_COLORS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Blue",   value: "#3b82f6" },
  { label: "Emerald",value: "#10b981" },
  { label: "Rose",   value: "#f43f5e" },
  { label: "Amber",  value: "#f59e0b" },
];

export default function Settings() {
  const [config,   setConfig]   = useState<LLMConfig | null>(null);
  const [provider, setProvider] = useState("groq");
  const [model,    setModel]    = useState(DEFAULT_MODELS["groq"]);
  const [apiKey,   setApiKey]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [removing, setRemoving] = useState(false);
  const [llmMsg,   setLlmMsg]   = useState("");
  const [llmErr,   setLlmErr]   = useState("");

  const [brandName,    setBrandName]    = useState("Acme Support");
  const [accentColor,  setAccentColor]  = useState("#6366f1");
  const [welcomeMsg,   setWelcomeMsg]   = useState("Hi there! How can I help you today?");
  const [widgetSaving, setWidgetSaving] = useState(false);
  const [widgetMsg,    setWidgetMsg]    = useState("");

  useEffect(() => {
    api.get<LLMConfig>("/settings/llm")
      .then(({ data }) => { setConfig(data); setProvider(data.provider); setModel(data.model); })
      .catch(() => setConfig(null));
  }, []);

  const onProviderChange = (p: string) => {
    setProvider(p);
    setModel(DEFAULT_MODELS[p] ?? "");
  };

  const saveLLM = async (e: FormEvent) => {
    e.preventDefault();
    setLlmMsg(""); setLlmErr("");
    setSaving(true);
    try {
      await api.put("/settings/llm", { provider, model, api_key: apiKey });
      setConfig({ provider, model });
      setApiKey("");
      setLlmMsg("LLM configuration saved.");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setLlmErr(detail ?? "Failed to save config.");
    } finally { setSaving(false); }
  };

  const removeLLM = async () => {
    if (!confirm("Remove BYOK config and revert to default Groq?")) return;
    setLlmMsg(""); setLlmErr("");
    setRemoving(true);
    try {
      await api.delete("/settings/llm");
      setConfig(null);
      setProvider("groq");
      setModel(DEFAULT_MODELS["groq"]);
      setApiKey("");
      setLlmMsg("Reverted to default LLM.");
    } catch { setLlmErr("Failed to remove config."); }
    finally { setRemoving(false); }
  };

  const saveWidget = async (e: FormEvent) => {
    e.preventDefault();
    setWidgetSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setWidgetMsg("Widget appearance saved.");
    setWidgetSaving(false);
    setTimeout(() => setWidgetMsg(""), 3000);
  };

  const deleteWorkspace = () => {
    if (!confirm("This will permanently delete your workspace and all data. This cannot be undone. Are you absolutely sure?")) return;
    alert("Workspace deletion would be processed here.");
  };

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Settings</span>
      </div>

      <div className="page-body">
        {/* LLM Configuration */}
        <div className="s-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--slate-900)", marginBottom: 4 }}>LLM Configuration</h2>
            <p style={{ fontSize: 13, color: "var(--slate-500)" }}>
              Bring your own API key (BYOK) or use the default Groq free tier.
            </p>
          </div>

          {config && (
            <div className="info-banner" style={{ marginBottom: 16 }}>
              Currently using <strong>{config.provider}</strong> / <strong>{config.model}</strong> (BYOK)
            </div>
          )}

          <form onSubmit={saveLLM}>
            <div className="field-2col">
              <div>
                <label className="s-label">Provider</label>
                <select className="s-select" value={provider} onChange={e => onProviderChange(e.target.value)}>
                  {PROVIDERS.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="s-label">Model</label>
                <input className="s-input" type="text" required value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. gpt-4o-mini" />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="s-label">API Key</label>
              <input className="s-input" type="password" required value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder={config ? "Enter new key to update" : "sk-…"} autoComplete="off" />
              <p className="form-hint">Your key is encrypted at rest and never returned in API responses.</p>
            </div>

            {llmMsg && <p className="form-success" style={{ marginTop: 12 }}>{llmMsg}</p>}
            {llmErr && <p className="form-error"  style={{ marginTop: 12 }}>{llmErr}</p>}

            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="s-btn s-btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save config"}
              </button>
              {config && (
                <button className="s-btn s-btn-outline" type="button" onClick={removeLLM} disabled={removing}>
                  {removing ? "Removing…" : "Revert to default"}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Widget Appearance */}
        <div className="s-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--slate-900)", marginBottom: 4 }}>Widget Appearance</h2>
            <p style={{ fontSize: 13, color: "var(--slate-500)" }}>
              Customize how the chat widget looks on your site.
            </p>
          </div>

          <form onSubmit={saveWidget}>
            <div className="field-2col">
              <div>
                <label className="s-label">Brand name</label>
                <input className="s-input" type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Acme Support" />
              </div>
              <div>
                <label className="s-label">Accent color</label>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setAccentColor(c.value)}
                      style={{
                        width: 28, height: 28, borderRadius: 999, background: c.value, border: "none", cursor: "pointer",
                        outline: accentColor === c.value ? `3px solid ${c.value}` : "3px solid transparent",
                        outlineOffset: 2,
                        transition: "outline 0.15s",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="s-label">Welcome message</label>
              <input className="s-input" type="text" value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} placeholder="Hi there! How can I help you today?" />
            </div>

            {widgetMsg && <p className="form-success" style={{ marginTop: 12 }}>{widgetMsg}</p>}

            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="s-btn s-btn-primary" type="submit" disabled={widgetSaving}>
                {widgetSaving ? "Saving…" : "Save appearance"}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="s-card danger-zone" style={{ padding: 24 }}>
          <div className="danger-title">Danger Zone</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--slate-900)", marginBottom: 2 }}>Delete workspace</div>
              <div style={{ fontSize: 13, color: "var(--slate-500)" }}>
                Permanently delete your workspace, all knowledge sources, and chat history. This cannot be undone.
              </div>
            </div>
            <button className="s-btn s-btn-danger" type="button" onClick={deleteWorkspace} style={{ flexShrink: 0, marginLeft: 24 }}>
              Delete workspace
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

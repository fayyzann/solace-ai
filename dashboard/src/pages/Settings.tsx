import { useState, useEffect, FormEvent } from "react";
import { api } from "../api/client";

type LLMConfig = {
  provider: string;
  model: string;
};

const PROVIDERS = ["groq", "openai", "anthropic"] as const;

const DEFAULT_MODELS: Record<string, string> = {
  groq: "llama-3.1-70b-versatile",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-20241022",
};

export default function Settings() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [provider, setProvider] = useState("groq");
  const [model, setModel] = useState(DEFAULT_MODELS["groq"]);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<LLMConfig>("/settings/llm")
      .then(({ data }) => {
        setConfig(data);
        setProvider(data.provider);
        setModel(data.model);
      })
      .catch(() => setConfig(null));
  }, []);

  const onProviderChange = (p: string) => {
    setProvider(p);
    setModel(DEFAULT_MODELS[p] ?? "");
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      await api.put("/settings/llm", { provider, model, api_key: apiKey });
      setConfig({ provider, model });
      setApiKey("");
      setMsg("LLM configuration saved.");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(detail ?? "Failed to save config.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remove BYOK config and revert to default Groq?")) return;
    setMsg("");
    setError("");
    setRemoving(true);
    try {
      await api.delete("/settings/llm");
      setConfig(null);
      setProvider("groq");
      setModel(DEFAULT_MODELS["groq"]);
      setApiKey("");
      setMsg("Reverted to default LLM.");
    } catch {
      setError("Failed to remove config.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="page">
      <h2 className="page-title">LLM Settings</h2>

      {config && (
        <div className="info-banner">
          Currently using <strong>{config.provider}</strong> /{" "}
          <strong>{config.model}</strong> (BYOK)
        </div>
      )}

      <div className="card">
        <h3 className="card-title">
          {config ? "Update LLM Config" : "Add BYOK LLM Config"}
        </h3>
        <form onSubmit={save} className="settings-form">
          <div className="field-row">
            <label className="field-label">Provider</label>
            <select
              className="field-select"
              value={provider}
              onChange={(e) => onProviderChange(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <label className="field-label">Model</label>
            <input
              className="field-input"
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o-mini"
            />
          </div>

          <div className="field-row">
            <label className="field-label">API Key</label>
            <input
              className="field-input"
              type="password"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config ? "Enter new key to update" : "sk-…"}
              autoComplete="off"
            />
          </div>

          {msg && <p className="form-success">{msg}</p>}
          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Config"}
            </button>
            {config && (
              <button
                className="btn-danger"
                type="button"
                onClick={remove}
                disabled={removing}
              >
                {removing ? "Removing…" : "Remove (use default)"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

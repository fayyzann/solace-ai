import { useState, useEffect, useRef, FormEvent } from "react";
import { api } from "../api/client";

type Source = {
  id: string;
  name: string;
  source_type: string;
  status: string;
  chunk_count: number;
  created_at: string;
};

type Tab = "url" | "pdf";

const WIDGET_BASE = import.meta.env.VITE_WIDGET_URL ?? "http://localhost:5174";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = { ready: "green", processing: "amber", pending: "gray", failed: "red" };
  const cls = map[status] ?? "gray";
  return (
    <span className={`s-badge s-badge-${cls}`}>
      <span className="s-badge-dot" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function Knowledge() {
  const [sources, setSources]       = useState<Source[]>([]);
  const [tab, setTab]               = useState<Tab>("url");
  const [url, setUrl]               = useState("");
  const [urlName, setUrlName]       = useState("");
  const [file, setFile]             = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await api.get<Source[]>("/knowledge/");
    setSources(data);
  };

  useEffect(() => {
    load();
    api.post("/widget/token").then(({ data }) => setWidgetToken(data.token)).catch(() => {});
  }, []);

  const iframeCode = widgetToken
    ? `<iframe\n  src="${WIDGET_BASE}?token=${widgetToken}"\n  width="360" height="540"\n  frameborder="0"\n></iframe>`
    : "Loading embed code…";

  const copyCode = async () => {
    if (!widgetToken) return;
    await navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addUrl = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/knowledge/url", { url, name: urlName || undefined });
      setUrl(""); setUrlName("");
      await load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to add URL.");
    } finally { setSubmitting(false); }
  };

  const uploadPdf = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/knowledge/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Upload failed.");
    } finally { setSubmitting(false); }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Delete this knowledge source and all its chunks?")) return;
    await api.delete(`/knowledge/${id}`);
    await load();
  };

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Knowledge Base</span>
        <div className="topbar-actions">
          <button className="s-btn s-btn-outline s-btn-sm" onClick={() => setTab("url")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            Add URL
          </button>
          <button className="s-btn s-btn-primary s-btn-sm" onClick={() => setTab("pdf")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload PDF
          </button>
        </div>
      </div>

      <div className="page-body-wide">
        {/* Embed card */}
        <div className="s-card-indigo" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--indigo-500)" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)" }}>Embed your widget</h2>
              </div>
              <p style={{ fontSize: 13, color: "var(--slate-500)" }}>
                Paste this before the closing <code style={{ background: "var(--slate-100)", padding: "1px 4px", borderRadius: 4, fontSize: 12 }}>&lt;/body&gt;</code> tag on any page.
              </p>
            </div>
            <button className="s-btn s-btn-primary s-btn-sm" onClick={copyCode} disabled={!widgetToken}>
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>
          <div className="code-block">{iframeCode}</div>
        </div>

        {/* Add source form */}
        <div className="s-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {(["url", "pdf"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`s-btn s-btn-sm ${tab === t ? "s-btn-primary" : "s-btn-ghost"}`}>
                {t === "url" ? "Add URL" : "Upload PDF"}
              </button>
            ))}
          </div>

          {tab === "url" && (
            <form onSubmit={addUrl} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <input className="s-input" type="url" placeholder="https://example.com/docs" required value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 2, minWidth: 200 }} />
              <input className="s-input" placeholder="Name (optional)" value={urlName} onChange={e => setUrlName(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
              <button className="s-btn s-btn-primary" type="submit" disabled={submitting}>{submitting ? "Adding…" : "Add URL"}</button>
            </form>
          )}
          {tab === "pdf" && (
            <form onSubmit={uploadPdf} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <input ref={fileRef} className="s-input" type="file" accept="application/pdf" required onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ flex: 1 }} />
              <button className="s-btn s-btn-primary" type="submit" disabled={submitting || !file}>{submitting ? "Uploading…" : "Upload PDF"}</button>
            </form>
          )}
          {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}
        </div>

        {/* Sources table */}
        <div className="s-card">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--slate-100)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)" }}>
              Sources <span style={{ fontSize: 12, fontWeight: 400, color: "var(--slate-400)", marginLeft: 6 }}>{sources.length} document{sources.length !== 1 ? "s" : ""}</span>
            </span>
          </div>
          {sources.length === 0 ? (
            <p className="empty-msg">No knowledge sources yet. Add a URL or upload a PDF above.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th>Status</th><th>Chunks</th><th>Added</th><th />
                </tr>
              </thead>
              <tbody>
                {sources.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontSize: 14, color: "var(--slate-800)", fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</td>
                    <td><span className="s-badge s-badge-gray">{s.source_type.toUpperCase()}</span></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td style={{ fontSize: 14, color: "var(--slate-600)", fontVariantNumeric: "tabular-nums" }}>{s.chunk_count || "—"}</td>
                    <td style={{ fontSize: 13, color: "var(--slate-400)" }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className="s-btn s-btn-ghost s-btn-sm" style={{ padding: "4px 8px", color: "var(--slate-400)" }} title="Retry" onClick={() => load()}>↻</button>
                        <button className="s-btn s-btn-ghost s-btn-sm" style={{ padding: "4px 8px", color: "var(--red-500)" }} title="Delete" onClick={() => deleteSource(s.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

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

export default function Knowledge() {
  const [sources, setSources] = useState<Source[]>([]);
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [urlName, setUrlName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await api.get<Source[]>("/knowledge/");
    setSources(data);
  };

  useEffect(() => { load(); }, []);

  const addUrl = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/knowledge/url", { url, name: urlName || undefined });
      setUrl("");
      setUrlName("");
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(msg ?? "Failed to add URL.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadPdf = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/knowledge/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(msg ?? "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Delete this knowledge source?")) return;
    await api.delete(`/knowledge/${id}`);
    await load();
  };

  const statusColor = (s: string) => {
    if (s === "ready") return "#16a34a";
    if (s === "failed") return "#dc2626";
    if (s === "processing") return "#d97706";
    return "#6b7280";
  };

  return (
    <div className="page">
      <h2 className="page-title">Knowledge Base</h2>

      <div className="card">
        <div className="tab-bar">
          <button
            className={"tab-btn" + (tab === "url" ? " active" : "")}
            onClick={() => setTab("url")}
          >
            Add URL
          </button>
          <button
            className={"tab-btn" + (tab === "pdf" ? " active" : "")}
            onClick={() => setTab("pdf")}
          >
            Upload PDF
          </button>
        </div>

        {tab === "url" && (
          <form onSubmit={addUrl} className="inline-form">
            <input
              className="field-input"
              type="url"
              placeholder="https://example.com/docs"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <input
              className="field-input"
              type="text"
              placeholder="Name (optional)"
              value={urlName}
              onChange={(e) => setUrlName(e.target.value)}
            />
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add URL"}
            </button>
          </form>
        )}

        {tab === "pdf" && (
          <form onSubmit={uploadPdf} className="inline-form">
            <input
              ref={fileRef}
              className="field-input"
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              className="btn-primary"
              type="submit"
              disabled={submitting || !file}
            >
              {submitting ? "Uploading…" : "Upload PDF"}
            </button>
          </form>
        )}

        {error && <p className="form-error">{error}</p>}
      </div>

      <div className="card">
        {sources.length === 0 ? (
          <p className="empty-msg">No knowledge sources yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Chunks</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="td-name">{s.name}</td>
                  <td>{s.source_type.toUpperCase()}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ color: statusColor(s.status) }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>{s.chunk_count}</td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-danger-sm"
                      onClick={() => deleteSource(s.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

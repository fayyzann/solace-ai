import { useState, useEffect } from "react";
import { api } from "../api/client";

type Summary = {
  total_sessions: number;
  total_messages: number;
  escalation_rate: number;
  avg_confidence: number;
};

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Summary>("/analytics/summary")
      .then(({ data }) => setSummary(data))
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h2 className="page-title">Analytics</h2>
      {loading && <p className="loading-msg">Loading…</p>}
      {error && <p className="form-error">{error}</p>}
      {summary && (
        <div className="stat-grid">
          <StatCard label="Total Sessions" value={summary.total_sessions} />
          <StatCard label="Total Messages" value={summary.total_messages} />
          <StatCard
            label="Escalation Rate"
            value={`${(summary.escalation_rate * 100).toFixed(1)}%`}
          />
          <StatCard
            label="Avg Confidence"
            value={`${(summary.avg_confidence * 100).toFixed(1)}%`}
          />
        </div>
      )}
    </div>
  );
}

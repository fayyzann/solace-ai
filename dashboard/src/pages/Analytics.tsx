import { useState, useEffect } from "react";
import { api } from "../api/client";

type Summary = {
  total_sessions: number;
  total_messages: number;
  escalation_rate: number;
  avg_confidence: number;
};

type Range = "7d" | "14d" | "30d";

const MOCK_POINTS: Record<Range, number[]> = {
  "7d":  [12, 19, 15, 27, 22, 31, 28],
  "14d": [8, 12, 19, 15, 27, 22, 31, 28, 35, 29, 40, 38, 44, 42],
  "30d": [5,8,12,9,14,19,15,22,27,22,31,28,35,29,40,38,25,44,42,37,48,52,45,55,50,58,62,59,66,70],
};

const TOP_QUESTIONS = [
  { question: "How do I reset my password?", count: 142, confidence: 0.95 },
  { question: "Where can I find my invoice?",  count: 98,  confidence: 0.88 },
  { question: "How do I cancel my subscription?", count: 76, confidence: 0.82 },
  { question: "What payment methods do you accept?", count: 61, confidence: 0.91 },
  { question: "How long does shipping take?",  count: 44,  confidence: 0.74 },
];

function MiniLineChart({ points }: { points: number[] }) {
  const w = 560, h = 120, pad = 12;
  const max = Math.max(...points, 1);
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
  const ys = points.map(v => h - pad - (v / max) * (h - pad * 2));
  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const areaPath = `${linePath} L${xs[xs.length-1]},${h - pad} L${xs[0]},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 120 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--indigo-500)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--indigo-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGrad)" />
      <path d={linePath} fill="none" stroke="var(--indigo-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3" fill="var(--indigo-500)" />
      ))}
    </svg>
  );
}

function StatCard({ label, value, delta, up }: { label: string; value: string; delta?: string; up?: boolean }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta && (
        <div className={up ? "stat-delta-up" : "stat-delta-down"}>
          {up ? "↑" : "↓"} {delta} vs last period
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState("");
  const [range, setRange]      = useState<Range>("7d");

  useEffect(() => {
    api.get<Summary>("/analytics/summary")
      .then(({ data }) => setSummary(data))
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Analytics</span>
        <div className="topbar-actions">
          {(["7d", "14d", "30d"] as Range[]).map(r => (
            <button
              key={r}
              className={`s-btn s-btn-sm ${range === r ? "s-btn-primary" : "s-btn-outline"}`}
              onClick={() => setRange(r)}
            >{r}</button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {loading && <p className="loading-msg">Loading…</p>}
        {error   && <p className="form-error">{error}</p>}

        {summary && (
          <>
            <div className="stat-grid">
              <StatCard label="Total Sessions"  value={summary.total_sessions.toLocaleString()} delta="12%" up />
              <StatCard label="Total Messages"  value={summary.total_messages.toLocaleString()} delta="8%"  up />
              <StatCard label="Escalation Rate" value={`${(summary.escalation_rate * 100).toFixed(1)}%`} delta="2.1%" up={false} />
              <StatCard label="Avg Confidence"  value={`${(summary.avg_confidence * 100).toFixed(1)}%`} delta="3.4%" up />
            </div>

            {/* Sessions over time */}
            <div className="s-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)" }}>Sessions over time</span>
                <span style={{ fontSize: 12, color: "var(--slate-400)" }}>Last {range}</span>
              </div>
              <MiniLineChart points={MOCK_POINTS[range]} />
            </div>

            {/* Top questions */}
            <div className="s-card">
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--slate-100)" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)" }}>Top questions</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>Question</th>
                    <th style={{ width: 80 }}>Asked</th>
                    <th style={{ width: 160 }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_QUESTIONS.map((q, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--slate-400)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                      <td style={{ fontSize: 14, color: "var(--slate-800)", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question}</td>
                      <td style={{ fontSize: 14, color: "var(--slate-600)", fontVariantNumeric: "tabular-nums" }}>{q.count}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "var(--slate-100)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ width: `${q.confidence * 100}%`, height: "100%", background: q.confidence >= 0.8 ? "var(--emerald-500)" : "var(--amber-500)", borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, color: "var(--slate-500)", fontVariantNumeric: "tabular-nums", minWidth: 34 }}>{(q.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

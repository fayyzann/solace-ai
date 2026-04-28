import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/knowledge");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, background: "var(--indigo-500)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 9.5c-.828 0-1.5-.672-1.5-1.5S7.172 8.5 8 8.5s1.5.672 1.5 1.5S8.828 11.5 8 11.5zm1.5-4.5h-3V4.5h3V7z" fill="white"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 20, color: "var(--slate-900)", letterSpacing: "-0.3px" }}>Solace</span>
      </div>

      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your Solace dashboard.</p>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label className="s-label">Email</label>
            <input className="s-input" type="email" placeholder="you@company.com" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="auth-field">
            <div className="auth-field-header">
              <label className="s-label" style={{ marginBottom: 0 }}>Password</label>
              <a href="#" className="auth-link">Forgot password?</a>
            </div>
            <input className="s-input" type="password" placeholder="••••••••" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="s-btn s-btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px", fontSize: 15, fontWeight: 600, marginTop: 4 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup" className="auth-link">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}

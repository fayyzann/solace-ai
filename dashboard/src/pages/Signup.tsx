import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [agreed, setAgreed]           = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const { loginWithTokens }           = useAuth();
  const navigate                      = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError("Please accept the terms to continue."); return; }
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", {
        company_name: companyName,
        email,
        password,
      });
      loginWithTokens(data.access_token, data.refresh_token);
      navigate("/knowledge");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(detail ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "linear-gradient(135deg, var(--slate-50) 0%, var(--indigo-50) 100%)", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ marginBottom: 36, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, background: "var(--indigo-500)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 9.5c-.828 0-1.5-.672-1.5-1.5S7.172 8.5 8 8.5s1.5.672 1.5 1.5S8.828 11.5 8 11.5zm1.5-4.5h-3V4.5h3V7z" fill="white"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 20, color: "var(--slate-900)", letterSpacing: "-0.3px" }}>Solace</span>
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--slate-200)", boxShadow: "0 8px 32px rgba(99,102,241,0.1), 0 2px 8px rgba(0,0,0,0.06)", padding: "48px", width: 440 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.02em", marginBottom: 8 }}>Create your account</h1>
        <p style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 32 }}>Start for free — no credit card required.</p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field-group">
            <label className="s-label">Company name</label>
            <input className="s-input" placeholder="Acme Corp" required value={companyName} onChange={e => setCompanyName(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="s-label">Work email</label>
            <input className="s-input" type="email" placeholder="you@company.com" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field-group">
            <label className="s-label">Password</label>
            <input className="s-input" type="password" placeholder="Min. 8 characters" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          </div>

          <div style={{ background: "var(--slate-50)", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }} onClick={() => setAgreed(v => !v)}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: agreed ? "none" : "2px solid var(--slate-300)", background: agreed ? "var(--indigo-500)" : "white", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
              {agreed && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ fontSize: 12, color: "var(--slate-500)", lineHeight: 1.5 }}>
              I agree to the <span style={{ color: "var(--indigo-500)", cursor: "pointer" }}>Terms of Service</span> and <span style={{ color: "var(--indigo-500)", cursor: "pointer" }}>Privacy Policy</span>
            </span>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="s-btn s-btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, fontWeight: 600, marginTop: 4 }}>
            {loading ? "Creating account…" : "Create account →"}
          </button>
        </form>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        <button className="s-btn s-btn-outline" style={{ width: "100%", justifyContent: "center" }} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <p className="auth-footer">Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
      </div>
    </div>
  );
}

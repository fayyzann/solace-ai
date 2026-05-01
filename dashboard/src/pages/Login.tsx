import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      navigate("/knowledge");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/knowledge` },
    });
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

        {/* Google SSO */}
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleLoading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "10px 16px", border: "1.5px solid var(--slate-200)", borderRadius: 8,
            background: "white", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--slate-700)",
            fontFamily: "inherit", marginBottom: 20, transition: "border-color 0.15s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "var(--slate-200)" }} />
          <span style={{ fontSize: 12, color: "var(--slate-400)", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--slate-200)" }} />
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label className="s-label">Email</label>
            <input className="s-input" type="email" placeholder="you@company.com" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="s-label">Password</label>
            <input className="s-input" type="password" placeholder="••••••••" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="s-btn s-btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px", fontSize: 15, fontWeight: 600, marginTop: 4 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--slate-500)" }}>
          Don't have an account? Contact your administrator for an invite.
        </p>
      </div>
    </div>
  );
}

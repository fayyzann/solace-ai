import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { api } from "../api/client";

type Step = "loading" | "form" | "error";

export default function AcceptInvite() {
  const [step, setStep]               = useState<Step>("loading");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [errorMsg, setErrorMsg]       = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically picks up the #access_token from the URL hash
    // and fires onAuthStateChange. We listen for the "SIGNED_IN" event which
    // fires when the invite token is exchanged for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStep("form");
      } else if (event === "INITIAL_SESSION" && session) {
        // Already signed in (e.g. user refreshed the page mid-flow)
        setStep("form");
      }
    });

    // Timeout: if no session arrives in 5s the token is likely expired
    const timer = setTimeout(() => {
      setStep(s => s === "loading" ? "error" : s);
      setErrorMsg("Invite link expired or already used. Ask your admin to resend the invite.");
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      // 1. Set the user's password in Supabase
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // 2. Provision the tenant in our backend
      await api.post("/auth/complete-profile", { company_name: companyName });

      navigate("/knowledge");
    } catch (err: unknown) {
      const msg = (err as { message?: string; response?: { data?: { detail?: string } } })
      setErrorMsg(msg?.response?.data?.detail ?? msg?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="auth-page">
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--indigo-200)", borderTopColor: "var(--indigo-500)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--slate-500)", fontSize: 14 }}>Verifying your invite…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--red-50, #fef2f2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--slate-900)", marginBottom: 8 }}>Invite link invalid</h2>
          <p style={{ fontSize: 14, color: "var(--slate-500)", lineHeight: 1.6 }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

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
        <h1 className="auth-title">Set up your account</h1>
        <p className="auth-subtitle">You've been invited to Solace. Fill in your details to get started.</p>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label className="s-label">Company / workspace name</label>
            <input
              className="s-input"
              type="text"
              placeholder="Acme Corp"
              required
              minLength={2}
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
            <p className="form-hint">This will be used as your workspace name and knowledge base label.</p>
          </div>

          <div className="auth-field">
            <label className="s-label">Password</label>
            <input
              className="s-input"
              type="password"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="s-label">Confirm password</label>
            <input
              className="s-input"
              type="password"
              placeholder="Re-enter password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>

          {errorMsg && <p className="form-error">{errorMsg}</p>}

          <button
            className="s-btn s-btn-primary"
            type="submit"
            disabled={submitting}
            style={{ width: "100%", justifyContent: "center", padding: "11px", fontSize: 15, fontWeight: 600, marginTop: 4 }}
          >
            {submitting ? "Creating your workspace…" : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}

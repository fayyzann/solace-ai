import { Link } from "react-router-dom";

const LogoMark = () => (
  <div style={{ width: 32, height: 32, background: "var(--indigo-500)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 9.5c-.828 0-1.5-.672-1.5-1.5S7.172 8.5 8 8.5s1.5.672 1.5 1.5S8.828 11.5 8 11.5zm1.5-4.5h-3V4.5h3V7z" fill="white"/>
    </svg>
  </div>
);

const Logo = ({ size = 16 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <LogoMark />
    <span style={{ fontWeight: 700, fontSize: size, color: "var(--slate-900)", letterSpacing: "-0.3px" }}>Solace</span>
  </div>
);

const features = [
  { icon: "⬡", title: "Multi-tenant", desc: "Isolated knowledge bases per customer. Complete data separation." },
  { icon: "◈", title: "RAG-Powered", desc: "pgvector embeddings + semantic search. Accurate, grounded answers." },
  { icon: "⌥", title: "BYOK LLM", desc: "Bring your own OpenAI, Anthropic, or Groq API key." },
  { icon: "↗", title: "Auto-escalation", desc: "Low-confidence answers route to human agents automatically." },
  { icon: "≋", title: "SSE Streaming", desc: "Real-time token streaming for a fast, native chat experience." },
  { icon: "◎", title: "Confidence Scoring", desc: "Every response includes a scored certainty signal." },
];

const steps = [
  { n: "01", title: "Upload your docs", desc: "Add URLs, PDFs, or paste text. Solace chunks and embeds everything automatically." },
  { n: "02", title: "Embed the widget", desc: "Copy one line of code. Drop it into your product, docs site, or marketing page." },
  { n: "03", title: "AI answers instantly", desc: "Your users get accurate, grounded answers in seconds — 24/7, at zero marginal cost." },
];

export default function Landing() {
  return (
    <div style={{ background: "white", fontFamily: "'Inter', sans-serif" }}>
      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 80px", height: 64, borderBottom: "1px solid var(--slate-100)", position: "sticky", top: 0, background: "white", zIndex: 10 }}>
        <Logo size={16} />
        <div style={{ display: "flex", gap: 32 }}>
          {["Features", "Pricing", "Docs"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize: 14, color: "var(--slate-600)", textDecoration: "none", fontWeight: 450 }}>{l}</a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/login" className="s-btn s-btn-ghost s-btn-sm">Sign in</Link>
          <Link to="/signup" className="s-btn s-btn-primary s-btn-sm">Start for free</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "96px 80px 80px", display: "flex", alignItems: "center", gap: 80, background: "linear-gradient(160deg, white 55%, var(--indigo-50) 100%)", maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ flex: "1 1 520px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--indigo-50)", color: "var(--indigo-600)", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100, marginBottom: 24, border: "1px solid var(--indigo-100)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--indigo-500)", display: "inline-block" }} />
            Now in public beta
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.025em", color: "var(--slate-900)", marginBottom: 24 }}>
            AI support that<br /><span style={{ color: "var(--indigo-500)" }}>knows your product</span>
          </h1>
          <p style={{ fontSize: 18, color: "var(--slate-500)", lineHeight: 1.7, maxWidth: 460, marginBottom: 36 }}>
            White-label AI customer support for SaaS businesses. Upload your docs, embed the widget, watch support tickets disappear.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link to="/signup" className="s-btn s-btn-primary s-btn-lg" style={{ fontSize: 16, padding: "13px 28px" }}>Start for free</Link>
            <a href="#features" className="s-btn s-btn-outline s-btn-lg">See features →</a>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--slate-400)" }}>No credit card required · Free forever on the Starter plan</p>
        </div>

        {/* Widget preview */}
        <div style={{ flex: "0 0 360px", position: "relative" }}>
          <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--slate-200)", boxShadow: "0 24px 60px rgba(99,102,241,0.15), 0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden", width: 340 }}>
            <div style={{ background: "var(--indigo-500)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              </div>
              <div>
                <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Acme Support</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Powered by Solace AI</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Online</span>
              </div>
            </div>
            <div style={{ padding: 16, background: "var(--slate-50)", display: "flex", flexDirection: "column", gap: 12, height: 280 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--indigo-100)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🤖</div>
                <div style={{ background: "white", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: 13, color: "var(--slate-700)", maxWidth: 220, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid var(--slate-100)" }}>
                  Hi! I'm your Acme support assistant. How can I help today?
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "var(--indigo-500)", borderRadius: "12px 4px 12px 12px", padding: "10px 14px", fontSize: 13, color: "white", maxWidth: 220 }}>
                  How do I add team members to my workspace?
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--indigo-100)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🤖</div>
                <div style={{ background: "white", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: 13, color: "var(--slate-700)", maxWidth: 220, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid var(--slate-100)" }}>
                  Go to <strong>Settings → Team</strong> and click "Invite member". They'll get an email invite.
                  <span style={{ display: "inline-block", width: 2, height: 13, background: "var(--indigo-500)", marginLeft: 2, verticalAlign: "middle", animation: "blink 1s step-end infinite" }} />
                </div>
              </div>
              <div style={{ marginTop: "auto", display: "flex", gap: 8, background: "white", borderRadius: 10, padding: "8px 12px", border: "1.5px solid var(--slate-200)" }}>
                <span style={{ fontSize: 13, color: "var(--slate-400)", flex: 1 }}>Ask a question…</span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--indigo-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: -16, right: -20, background: "white", borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", border: "1px solid var(--slate-200)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald-500)" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--slate-700)" }}>98% confidence · 0.3s</span>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section style={{ borderTop: "1px solid var(--slate-100)", borderBottom: "1px solid var(--slate-100)", padding: "20px 80px", display: "flex", alignItems: "center", background: "var(--slate-50)" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--slate-400)", marginRight: 32, letterSpacing: "0.05em", textTransform: "uppercase" }}>Powered by</span>
        {["pgvector", "Groq", "Jina AI", "OpenAI", "Anthropic"].map((p, i) => (
          <span key={p} style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-500)", padding: "0 24px" }}>{p}</span>
            {i < 4 && <span style={{ color: "var(--slate-200)", fontSize: 18 }}>·</span>}
          </span>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 40 }}>
          {[["10M+", "Messages handled"], ["99.9%", "Uptime SLA"], ["< 400ms", "Avg response"]].map(([num, lbl]) => (
            <div key={num} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--slate-900)" }}>{num}</div>
              <div style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "96px 80px", maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: 40, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.02em", marginBottom: 16 }}>Up and running in minutes</h2>
          <p style={{ fontSize: 16, color: "var(--slate-500)", maxWidth: 440, margin: "0 auto" }}>No ML expertise required. Just three steps from signup to live AI support.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ padding: 36, background: i === 1 ? "var(--indigo-500)" : "var(--slate-50)", borderRadius: 16, border: `1px solid ${i === 1 ? "transparent" : "var(--slate-200)"}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: i === 1 ? "rgba(255,255,255,0.5)" : "var(--indigo-400)", letterSpacing: "0.1em", marginBottom: 20 }}>{s.n}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: i === 1 ? "white" : "var(--slate-900)", marginBottom: 12, letterSpacing: "-0.01em" }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: i === 1 ? "rgba(255,255,255,0.75)" : "var(--slate-500)", lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "96px 80px", background: "var(--slate-50)" }}>
        <div style={{ textAlign: "center", marginBottom: 64, maxWidth: 1440, margin: "0 auto 64px" }}>
          <h2 style={{ fontSize: 40, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.02em", marginBottom: 16 }}>Built for production, not demos</h2>
          <p style={{ fontSize: 16, color: "var(--slate-500)" }}>Enterprise-grade infrastructure without the enterprise price tag.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 1440, margin: "0 auto" }}>
          {features.map(f => (
            <div key={f.title} style={{ background: "white", borderRadius: 12, border: "1px solid var(--slate-200)", padding: 28 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--indigo-50)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 18, color: "var(--indigo-500)" }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--slate-900)", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: "var(--slate-500)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "96px 80px", maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: 40, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.02em", marginBottom: 16 }}>Simple pricing</h2>
          <p style={{ fontSize: 16, color: "var(--slate-500)" }}>Start free. Scale as you grow.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 800, margin: "0 auto" }}>
          {[
            { name: "Starter", price: "$0", sub: "Forever free", primary: false, cta: "Start for free", features: ["1 knowledge base", "500 messages / month", "pgvector RAG", "Solace branding", "Community support"] },
            { name: "Pro", price: "$49", sub: "per month", primary: true, cta: "Start Pro trial", features: ["Unlimited knowledge bases", "50,000 messages / month", "BYOK LLM (any provider)", "White-label widget", "Auto-escalation", "Priority support", "SSE streaming", "Analytics dashboard"] },
          ].map(plan => (
            <div key={plan.name} style={{ borderRadius: 16, border: plan.primary ? "2px solid var(--indigo-500)" : "1px solid var(--slate-200)", padding: 40, position: "relative", background: plan.primary ? "linear-gradient(145deg, var(--indigo-50), white)" : "white" }}>
              {plan.primary && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "var(--indigo-500)", color: "white", fontSize: 12, fontWeight: 600, padding: "4px 16px", borderRadius: 100 }}>Most popular</div>}
              <div style={{ fontSize: 14, fontWeight: 600, color: plan.primary ? "var(--indigo-500)" : "var(--slate-600)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>{plan.name}</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.03em", marginBottom: 4 }}>{plan.price}</div>
              <div style={{ fontSize: 14, color: "var(--slate-400)", marginBottom: 32 }}>{plan.sub}</div>
              <Link to="/signup" className={`s-btn s-btn-lg ${plan.primary ? "s-btn-primary" : "s-btn-outline"}`} style={{ width: "100%", justifyContent: "center", marginBottom: 28, display: "flex" }}>{plan.cta}</Link>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--slate-600)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill={plan.primary ? "var(--indigo-100)" : "var(--slate-100)"}/><path d="M8 12l3 3 5-5" stroke={plan.primary ? "var(--indigo-500)" : "var(--slate-500)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--slate-100)", padding: "48px 80px", background: "var(--slate-50)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", maxWidth: 1440, margin: "0 auto" }}>
          <div>
            <Logo size={14} />
            <p style={{ fontSize: 13, color: "var(--slate-400)", marginTop: 12, maxWidth: 260, lineHeight: 1.6 }}>AI customer support for SaaS teams who care about the experience.</p>
          </div>
          {[["Product", "Features", "Pricing", "Changelog", "Roadmap"], ["Developers", "Docs", "API Reference", "Widget SDK", "Status"], ["Company", "Blog", "Careers", "Privacy", "Terms"]].map(([title, ...links]) => (
            <div key={title}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 14, letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(l => <a key={l} style={{ fontSize: 13, color: "var(--slate-500)", textDecoration: "none", cursor: "pointer" }}>{l}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1440, margin: "48px auto 0", paddingTop: 24, borderTop: "1px solid var(--slate-200)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--slate-400)" }}>© 2026 Solace Technologies, Inc.</span>
          <span style={{ fontSize: 12, color: "var(--slate-400)" }}>Built with ♥ for support teams</span>
        </div>
      </footer>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

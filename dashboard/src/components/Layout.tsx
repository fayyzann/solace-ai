import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const IconKnowledge = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);
const IconAnalytics = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const nav = [
  { to: "/knowledge", label: "Knowledge", Icon: IconKnowledge },
  { to: "/analytics", label: "Analytics", Icon: IconAnalytics },
  { to: "/settings",  label: "Settings",  Icon: IconSettings  },
];

function initials(email: string) {
  const parts = email.split("@")[0].split(/[._-]/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function Layout() {
  const { logout } = useAuth();
  const email = localStorage.getItem("access_token")
    ? (() => {
        try {
          const payload = JSON.parse(atob(localStorage.getItem("access_token")!.split(".")[1]));
          return payload.email ?? "";
        } catch { return ""; }
      })()
    : "";

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "var(--indigo-500)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 9.5c-.828 0-1.5-.672-1.5-1.5S7.172 8.5 8 8.5s1.5.672 1.5 1.5S8.828 11.5 8 11.5zm1.5-4.5h-3V4.5h3V7z" fill="white"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--slate-900)", letterSpacing: "-0.3px" }}>Solace</span>
          </div>
          <div className="sidebar-workspace">
            <div className="sidebar-workspace-label">Workspace</div>
            <div className="sidebar-workspace-name">My Company</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section-label">Menu</div>
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials(email)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email || "Admin"}</div>
              <div className="sidebar-user-email">Tenant admin</div>
            </div>
          </div>
          <button className="s-btn s-btn-ghost s-btn-sm" onClick={logout} style={{ width: "100%", justifyContent: "center", color: "var(--slate-500)" }}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

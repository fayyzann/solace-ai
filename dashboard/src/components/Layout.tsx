import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/knowledge", label: "Knowledge" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Solace</div>
        <nav className="sidebar-nav">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

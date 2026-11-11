import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import AdminIcon from "./AdminIcon.jsx";
import "../../../css/admin-shell.css";

const GROUPS = [
  { label: "Overview", links: [{ to: "/dashboard", label: "Dashboard", icon: "dashboard", end: true }] },
  {
    label: "Scheduling",
    links: [
      { to: "/admin/schedule", label: "Timetable", icon: "timetable" },
      { to: "/admin/private-lessons", label: "Private lessons", icon: "lessons" },
    ],
  },
  {
    label: "Records",
    links: [
      { to: "/admin/students", label: "Students", icon: "students" },
      { to: "/admin/attendance", label: "Attendance", icon: "attendance" },
      { to: "/admin/applications", label: "Membership Applications", icon: "applications" },
    ],
  },
  { label: "Setup", links: [{ to: "/admin/dojos", label: "Dojos", icon: "dojos" }] },
];

export default function AdminShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function handleSignOut() {
    logout();
    navigate("/");
  }

  const initial = (user?.fullName || "A").trim().charAt(0).toUpperCase();
  const shellClass = menuOpen ? "adm-shell adm-shell-menu-open" : "adm-shell";

  return (
    <div className={shellClass}>
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="adm-topbar">
        <Link to="/dashboard" className="adm-brand">
          <img src="/images/logo.png" alt="" width="36" height="36" />
          <span className="adm-brand-text">
            <span className="adm-brand-name">Aikido Shinju-Kai</span>
            <span className="adm-brand-sub">Admin</span>
          </span>
        </Link>
        <button
          type="button"
          className="adm-menu-button"
          aria-expanded={menuOpen}
          aria-controls="adm-sidebar"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <AdminIcon name={menuOpen ? "close" : "menu"} />
          <span>{menuOpen ? "Close" : "Menu"}</span>
        </button>
      </header>

      <aside id="adm-sidebar" className="adm-sidebar" aria-label="Admin">
        <Link to="/dashboard" className="adm-brand adm-sidebar-brand" title="Aikido Shinju-Kai">
          <img src="/images/logo.png" alt="" width="40" height="40" />
          <span className="adm-brand-text">
            <span className="adm-brand-name">Aikido Shinju-Kai</span>
            <span className="adm-brand-sub">Admin</span>
          </span>
        </Link>

        <nav className="adm-nav" aria-label="Admin pages">
          {GROUPS.map((group) => (
            <div key={group.label} className="adm-nav-group">
              <p className="adm-nav-label">{group.label}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.to}>
                    <NavLink to={link.to} end={link.end} className="adm-nav-link">
                      <AdminIcon name={link.icon} />
                      <span className="adm-nav-text">{link.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="adm-sidebar-foot">
          <div className="adm-user">
            <span className="adm-avatar" aria-hidden="true">{initial}</span>
            <span className="adm-user-text">
              <span className="adm-user-name">{user?.fullName}</span>
              <span className="adm-user-role">Admin</span>
            </span>
            <button type="button" className="adm-signout" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
              <AdminIcon name="signOut" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <button type="button" className="adm-scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setMenuOpen(false)} />

      <main id="main" className="adm-main">
        {children}
      </main>
    </div>
  );
}

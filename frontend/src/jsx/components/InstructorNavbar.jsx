import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Instructor links. Each page is added here once it exists.
const links = [
  { to: "/dashboard", label: "My Classes" },
  { to: "/instructor/calendar", label: "Calendar" },
];

// Same look as the student navbar, using its classes from index.css.
// instructor.css hides the site-wide Navbar on pages that show this one.
export default function InstructorNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const close = () => { setOpen(false); setAccountOpen(false); };

  // Close both menus whenever the page changes.
  useEffect(() => { close(); }, [pathname]);

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onClick = (e) => { if (!accountRef.current?.contains(e.target)) setAccountOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setAccountOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  function handleSignOut() {
    logout();
    close();
    navigate("/");
  }

  return (
    <header className="navbar navbar-student instructor-navbar">
      <div className="container navbar-inner">
        <button
          className="menu-toggle instructor-menu-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="instructor-nav"
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <Link to="/dashboard" className="brand" onClick={close}>
          <img src="/images/logo.png" alt="" width="44" height="44" />
          <span className="brand-name">Aikido <span className="instructor-brand-line">Shinju-Kai</span></span>
        </Link>

        {/* Phones: always visible beside the logo */}
        <div className="instructor-phone-actions">
          <button type="button" className="btn btn-outline btn-small" onClick={handleSignOut}>Sign Out</button>
          <span className="instructor-avatar" title={user.fullName}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
            </svg>
          </span>
        </div>

        <nav id="instructor-nav" aria-label="Instructor" className={open ? "nav open" : "nav"}>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={close} className="nav-link">
              {link.label}
            </NavLink>
          ))}

          {/* Desktop: name opens a small menu */}
          <div className="account" ref={accountRef}>
            <button
              type="button"
              className="account-toggle"
              aria-expanded={accountOpen}
              aria-controls="instructor-account-menu"
              onClick={() => setAccountOpen(!accountOpen)}
            >
              {user.fullName} <span aria-hidden="true">▾</span>
            </button>
            <div id="instructor-account-menu" className={accountOpen ? "account-menu open" : "account-menu"}>
              <button type="button" onClick={handleSignOut}>Sign Out</button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/classes", label: "Classes" },
  { to: "/about", label: "About" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Controls the dropdown menu on mobile screens
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  function handleSignOut() {
    logout();
    close();
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          <img src="/images/logo.png" alt="" width="44" height="44" />
          <span className="brand-name">Aikido Shinju-Kai</span>
        </Link>

        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <nav id="main-nav" aria-label="Main" className={open ? "nav open" : "nav"}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={close} className="nav-link">
              {l.label}
            </NavLink>
          ))}

          {user ? (
            <>
              <NavLink to="/dashboard" onClick={close} className="nav-link">Dashboard</NavLink>
              <button type="button" className="btn btn-outline btn-small" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" onClick={close} className="btn btn-outline btn-small">Sign In</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

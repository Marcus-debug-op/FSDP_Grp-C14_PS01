import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Visitors, instructors and admins.
const links = [
  { to: "/", label: "Home", end: true },
  { to: "/classes", label: "Classes" },
  { to: "/dojos", label: "Dojos" },
  { to: "/about", label: "About" },
];

// Signed-in students. Each link maps to the Jira stories it covers.
// The dashboard (SD-1 to SD-4, TP-2) is reached through the logo.
const studentLinks = [
  { to: "/timetable", label: "My Timetable" },  // SD-5, TP-1
  { to: "/lessons", label: "Book Lessons" },    // BK-1 to BK-5
  { to: "/payments", label: "Payments" },       // PAY-1, PAY-6
  { to: "/grading", label: "Grading" },         // GR-1 to GR-3 (teammate's part)
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Mobile dropdown menu, and the student's account menu (Settings, Sign out)
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

  const isStudent = user?.role === "student";
  const navLinks = isStudent ? studentLinks : links;
  const firstName = user?.fullName?.split(" ")[0] || "Account";

  function handleSignOut() {
    logout();
    close();
    navigate("/");
  }

  return (
    <header className={isStudent ? "navbar navbar-student" : "navbar"}>
      <div className="container navbar-inner">
        <Link to={isStudent ? "/dashboard" : "/"} className="brand" onClick={close}>
          <img src="/images/logo.png" alt="" width="44" height="44" />
          <span className="brand-name">Aikido Shinju-Kai</span>
        </Link>

        {/* Students: Check in stays visible on phones, outside the menu (AT-1) */}
        {isStudent && (
          <Link to="/check-in" className="btn btn-primary btn-small nav-checkin nav-checkin-mobile">Check In</Link>
        )}

        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <nav id="main-nav" aria-label="Main" className={open ? "nav open" : "nav"}>
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={close} className="nav-link">
              {l.label}
            </NavLink>
          ))}

          {isStudent ? (
            <>
              <Link to="/check-in" className="btn btn-primary btn-small nav-checkin nav-checkin-desktop">Check In</Link>

              {/* Desktop: name opens a small menu */}
              <div className="account" ref={accountRef}>
                <button
                  type="button"
                  className="account-toggle"
                  aria-expanded={accountOpen}
                  aria-controls="account-menu"
                  onClick={() => setAccountOpen(!accountOpen)}
                >
                  {firstName} <span aria-hidden="true">▾</span>
                </button>
                <div id="account-menu" className={accountOpen ? "account-menu open" : "account-menu"}>
                  <Link to="/settings" onClick={close}>Settings</Link>
                  <button type="button" onClick={handleSignOut}>Sign Out</button>
                </div>
              </div>

              {/* Phones: the same two items, listed in the menu */}
              <NavLink to="/settings" onClick={close} className="nav-link nav-mobile-only">Settings</NavLink>
              <button type="button" className="btn btn-outline btn-small nav-mobile-only" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : user ? (
            <>
              <NavLink to="/dashboard" onClick={close} className="nav-link">Dashboard</NavLink>
              <button type="button" className="btn btn-outline btn-small" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/signin" onClick={close} className="btn btn-outline btn-small">Sign In</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

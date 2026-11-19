import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useMembershipAccess } from "../context/MembershipAccessContext.jsx";

// Visitors who are not signed in. Ordered by what a newcomer looks for;
// the logo already goes Home, and "Join now" sits on the right as the main action.
const publicLinks = [
  { to: "/classes", label: "Classes" },
  { to: "/schedule", label: "Timetable" },
  { to: "/dojos", label: "Dojos" },
  { to: "/join", label: "Join & Fees" },
  { to: "/about", label: "About" },
];

// Signed-in instructors. "Classes" still opens the timetable, as before.
const links = [
  { to: "/", label: "Home", end: true },
  { to: "/schedule", label: "Classes" },
  { to: "/dojos", label: "Dojos" },
  { to: "/about", label: "About" },
];

const adminLinks = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/admin/schedule", label: "Timetable" },
  { to: "/admin/attendance", label: "Attendance" },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/applications", label: "Applications" },
  { to: "/admin/private-lessons", label: "Lessons" },
  { to: "/admin/dojos", label: "Dojos" },
];

// Signed-in students. Each link maps to the Jira stories it covers.
// The dashboard (SD-1 to SD-4, TP-2) is reached through the logo.
const studentLinks = [
  { to: "/timetable", label: "My Timetable" },  // SD-5, TP-1
  { to: "/lessons", label: "Book Lessons" },    // BK-1 to BK-5
  { to: "/payments", label: "Payments" },       // PAY-1, PAY-6
];

const studentMenuLinks = [
  { to: "/grading", label: "Grading" },
  { to: "/belt-progress", label: "My Belt" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isActiveMember } = useMembershipAccess();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Mobile dropdown menu, and the student's account menu (Settings, Sign out)
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const studentsRef = useRef(null);
  const close = () => { setOpen(false); setAccountOpen(false); setStudentsOpen(false); };

  // Close both menus whenever the page changes.
  useEffect(() => { close(); }, [pathname]);

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!accountOpen && !studentsOpen) return undefined;
    const onClick = (e) => {
      if (!accountRef.current?.contains(e.target)) setAccountOpen(false);
      if (!studentsRef.current?.contains(e.target)) setStudentsOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setAccountOpen(false); setStudentsOpen(false); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen, studentsOpen]);

  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin";
  const navLinks = isStudent ? (isActiveMember ? studentLinks : []) : isAdmin ? adminLinks : user ? links : publicLinks;
  const firstName = user?.fullName?.split(" ")[0] || "Account";
  const studentsActive = studentMenuLinks.some((l) => pathname === l.to);

  function handleSignOut() {
    logout();
    close();
    navigate("/");
  }

  return (
    <header className={isStudent ? "navbar navbar-student" : isAdmin ? "navbar navbar-admin" : "navbar"}>
      <div className="container navbar-inner">
        <Link to={isStudent ? "/dashboard" : "/"} className="brand" onClick={close}>
          <img src="/images/logo.png" alt="" width="44" height="44" />
          <span className="brand-name">Aikido Shinju-Kai</span>
        </Link>

        {/* Students: Check in stays visible on phones, outside the menu (AT-1) */}
        {isStudent && isActiveMember && (
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
              {isActiveMember && (<div className="account nav-dropdown" ref={studentsRef}>
                <button
                  type="button"
                  className={studentsActive ? "nav-link nav-dropdown-toggle active" : "nav-link nav-dropdown-toggle"}
                  aria-expanded={studentsOpen}
                  aria-controls="students-menu"
                  onClick={() => setStudentsOpen(!studentsOpen)}
                >
                  Students <span aria-hidden="true">▾</span>
                </button>
                <div id="students-menu" className={studentsOpen ? "account-menu nav-dropdown-menu open" : "account-menu nav-dropdown-menu"}>
                  {studentMenuLinks.map((l) => (
                    <NavLink key={l.to} to={l.to} onClick={close}>{l.label}</NavLink>
                  ))}
                </div>
              </div>
              )}
              {isActiveMember && studentMenuLinks.map((l) => (
                <NavLink key={l.to} to={l.to} onClick={close} className="nav-link nav-mobile-only">{l.label}</NavLink>
              ))}
              

              {isActiveMember && <Link to="/check-in" className="btn btn-primary btn-small nav-checkin nav-checkin-desktop">Check In</Link>}

              {!isActiveMember && <NavLink to="/profile" onClick={close} className="nav-link">Application Status</NavLink>}
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
                  <Link to="/profile" onClick={close}>My Profile</Link>
                  <Link to="/inbox" onClick={close}>Inbox</Link>
                  <Link to="/settings" onClick={close}>Settings</Link>
                  <button type="button" onClick={handleSignOut}>Sign Out</button>
                </div>
              </div>

              {/* Phones: the same items, listed in the menu */}
              <NavLink to="/profile" onClick={close} className="nav-link nav-mobile-only">My Profile</NavLink>
              <NavLink to="/inbox" onClick={close} className="nav-link nav-mobile-only">Inbox</NavLink>
              <NavLink to="/settings" onClick={close} className="nav-link nav-mobile-only">Settings</NavLink>
              <button type="button" className="btn btn-outline btn-small nav-mobile-only" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : user ? (
            <>
              {!isAdmin && <NavLink to="/dashboard" onClick={close} className="nav-link">Dashboard</NavLink>}
              <button type="button" className="btn btn-outline btn-small" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/signin" onClick={close} className="nav-link">Sign in</NavLink>
              <Link to="/signup" onClick={close} className="btn btn-primary btn-small nav-join">Join now</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
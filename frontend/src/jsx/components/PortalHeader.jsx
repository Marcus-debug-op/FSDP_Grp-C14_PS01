import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Student portal header from the design: logo, club name, four links.
// The site-wide Navbar hides itself on portal pages, so Sign out lives here.
// active = "home" | "classes" | "grading" | "payments"
export default function PortalHeader({ active = "home" }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate("/");
  }

  const link = (key, to, label) => (
    <Link
      to={to}
      className={`sp-nav-link${active === key ? " is-active" : ""}`}
      aria-current={active === key ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return (
    <header className="sp-header">
      <Link to="/" className="sp-brand">
        <img src="/images/logo.png" alt="" width="52" height="52" />
        <span>Shinju-kai</span>
      </Link>
      <nav className="sp-nav" aria-label="Student portal">
        {link("home", "/dashboard", "Home")}
        {link("classes", "/classes", "Classes")}
        {/* Grading points at the dashboard's rank card until the grading page exists. */}
        {active === "home"
          ? <a href="#grading" className="sp-nav-link">Grading</a>
          : link("grading", "/dashboard", "Grading")}
        {link("payments", "/payments", "Payments")}
        <button type="button" className="sp-nav-link sp-signout" onClick={handleSignOut}>Sign out</button>
      </nav>
    </header>
  );
}

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import usePageTitle from "../../js/hooks/usePageTitle.js";

// Shown for any address that doesn't exist, instead of silently showing Home.
export default function NotFound() {
  const { user } = useAuth();
  usePageTitle("Page not found");

  return (
    <section className="section">
      <div className="container center">
        <p className="eyebrow center">Error 404</p>
        <h1>Page not found</h1>
        <p className="lead" style={{ margin: "0 auto" }}>The page you are looking for doesn't exist or has moved.</p>
        <div className="button-row center-row">
          {user
            ? <Link to="/dashboard" className="btn btn-primary">Go to my dashboard</Link>
            : <Link to="/" className="btn btn-primary">Go to the home page</Link>}
          <Link to="/classes" className="btn btn-outline">Browse classes</Link>
          <Link to="/contact" className="btn btn-outline">Contact us</Link>
        </div>
      </div>
    </section>
  );
}

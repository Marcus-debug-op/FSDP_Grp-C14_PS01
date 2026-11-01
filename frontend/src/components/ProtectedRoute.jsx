import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Wrap a page with this so only signed-in users can open it.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <section className="section">
        <div className="container"><p>Loading...</p></div>
      </section>
    );
  }
  return user ? children : <Navigate to="/signin" replace />;
}

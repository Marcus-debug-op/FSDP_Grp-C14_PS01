import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Wrap a page with this so only signed-in users can open it.
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <section className="section">
        <div className="container"><p>Loading...</p></div>
      </section>
    );
  }
  if (!user) return <Navigate to="/signin" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

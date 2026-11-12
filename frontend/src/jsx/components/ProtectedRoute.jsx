import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useMembershipAccess } from "../context/MembershipAccessContext.jsx";

// Wrap a page with this so only signed-in users can open it.
export default function ProtectedRoute({ children, role, activeMembership = false }) {
  const { user, loading } = useAuth();
  const { isActiveMember, loading: membershipLoading } = useMembershipAccess();

  if (loading) {
    return (
      <section className="section">
        <div className="container"><p>Loading...</p></div>
      </section>
    );
  }
  if (!user) return <Navigate to="/signin" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  if (activeMembership && user.role === "student") {
    if (membershipLoading) return <section className="section"><div className="container"><p>Checking membership…</p></div></section>;
    if (!isActiveMember) return <Navigate to="/profile" replace />;
  }
  return children;
}

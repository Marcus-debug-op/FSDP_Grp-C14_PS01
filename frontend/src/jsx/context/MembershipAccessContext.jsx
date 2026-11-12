import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getApplicationStatus } from "../../js/services/studentService.js";

// UI access state only. The backend must independently authorize member-only APIs.
const MembershipAccessContext = createContext(null);

export function MembershipAccessProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const isStudent = user?.role === "student";
  const [check, setCheck] = useState({ userId: null, loading: true, application: null, error: null });

  useEffect(() => {
    if (authLoading) return undefined;
    if (!isStudent) {
      setCheck({ userId: null, loading: false, application: null, error: null });
      return undefined;
    }
    let cancelled = false;
    setCheck({ userId: user.id, loading: true, application: null, error: null });
    getApplicationStatus()
      .then((data) => {
        if (!cancelled) setCheck({ userId: user.id, loading: false, application: data.application ?? null, error: null });
      })
      .catch((error) => {
        if (!cancelled) setCheck({ userId: user.id, loading: false, application: null, error: error.message || "Could not verify membership" });
      });
    return () => { cancelled = true; };
  }, [authLoading, isStudent, user?.id]);

  const loading = authLoading || (isStudent && (check.loading || check.userId !== user?.id));
  const isActiveMember = isStudent && !loading && check.application?.status === "active_member";
  return (
    <MembershipAccessContext.Provider value={{ isActiveMember, loading, application: check.application, error: check.error }}>
      {children}
    </MembershipAccessContext.Provider>
  );
}

export function useMembershipAccess() {
  const context = useContext(MembershipAccessContext);
  if (!context) throw new Error("MembershipAccessProvider is missing");
  return context;
}

import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SignInForm from "../components/SignInForm.jsx";
import SignUpForm from "../components/SignUpForm.jsx";
import "../auth.css";

// One page for both Sign In and Sign Up.
// The address decides which form shows (/signin or /signup), so links such as
// "Get Started" can open the right one, and the toggle just switches the address.
export default function AuthPage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Already signed in? Go straight to the dashboard.
  if (user) return <Navigate to="/dashboard" replace />;

  const isSignUp = pathname === "/signup";

  return (
    <section className="section">
      <div className="container narrow">
        <p className="eyebrow">{isSignUp ? "Join us" : "Welcome back"}</p>
        <h1>{isSignUp ? "Student Sign Up" : "Sign In"}</h1>
        <p className="lead">
          {isSignUp
            ? "Create your student account to book classes and track your training."
            : "Students, instructors and administrators sign in here."}
        </p>

        {/* The toggle button */}
        <div className="auth-toggle" role="group" aria-label="Choose sign in or sign up">
          <button type="button" aria-pressed={!isSignUp} onClick={() => navigate("/signin", { replace: true })}>
            Sign In
          </button>
          <button type="button" aria-pressed={isSignUp} onClick={() => navigate("/signup", { replace: true })}>
            Sign Up
          </button>
        </div>

        {/* key makes React start with a clean form when you switch */}
        {isSignUp ? <SignUpForm key="up" /> : <SignInForm key="in" />}
      </div>
    </section>
  );
}

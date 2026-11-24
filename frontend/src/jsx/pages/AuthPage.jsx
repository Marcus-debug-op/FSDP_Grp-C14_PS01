import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getApplicationStatus } from "../../js/services/studentService.js";
import SignInForm from "../components/SignInForm.jsx";
import SignUpForm from "../components/SignUpForm.jsx";
import AuthSlideshow from "../components/AuthSlideshow.jsx";
import "../../css/auth.css";
import usePageTitle from "../../js/hooks/usePageTitle.js";

// The signup-only sessionStorage value is NOT proof that registration payment is outstanding.
// Always check the authenticated student's application before redirecting them to checkout.
export default function AuthPage() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  usePageTitle(pathname === "/signup" ? "Sign up" : "Sign in");
  const [resolvingStudent, setResolvingStudent] = useState(false);

  useEffect(() => {
    if (loading || !user) return undefined;
    if (user.role !== "student") {
      navigate("/dashboard", { replace: true });
      return undefined;
    }

    let cancelled = false;
    setResolvingStudent(true);
    async function resolveDestination() {
      try {
        const { application } = await getApplicationStatus();
        if (cancelled) return;
        if (!application) {
          sessionStorage.removeItem("pending_registration_plan_id");
          navigate("/dashboard", { replace: true });
          return;
        }
        // A completed payment must never be followed by another registration charge.
        if (application.paymentStatus === "succeeded" || application.status === "active_member") {
          sessionStorage.removeItem("pending_registration_plan_id");
          navigate("/dashboard", { replace: true });
          return;
        }
        // An unpaid application always resumes registration checkout, even after a crash,
        // a closed tab or a different device (the status API is scoped to this student).
        if (application.status === "pending_payment") {
          navigate("/registration/checkout", { replace: true });
          return;
        }
        navigate("/dashboard", { replace: true });
      } catch (error) {
        // Fail closed: if status can't be verified, never redirect to a payment page.
        if (!cancelled) navigate("/dashboard", { replace: true });
      } finally {
        if (!cancelled) setResolvingStudent(false);
      }
    }
    resolveDestination();
    return () => { cancelled = true; };
  }, [user, loading, navigate]);

  if (loading || (user && resolvingStudent) || user) {
    return <section className="section"><div className="container narrow"><p>Checking your account...</p></div></section>;
  }

  const isSignUp = pathname === "/signup";

  // Sign in: two columns, an animated dojo panel on the left and the form on the right.
  // Sign up keeps the single wide column because its four-step form needs the space.
  if (!isSignUp) {
    return (
      <section className="auth-split">
        <aside className="auth-visual" aria-hidden="true">
          <AuthSlideshow />
          <div className="auth-visual-content">
            {/* Ensō: the brush-drawn circle of Zen, echoing Aikido's circular movement */}
            <div className="auth-mark">
              <svg className="auth-enso" viewBox="0 0 200 200">
                <path d="M141 41 A72 72 0 1 0 171 87" />
              </svg>
              <p className="auth-visual-kanji" lang="ja">合気道</p>
            </div>
            <p className="auth-visual-line">The way of harmony</p>
            <p className="auth-visual-sub">Training together in Singapore since 1988</p>
          </div>
        </aside>
        <div className="auth-panel">
          <p className="eyebrow">Welcome back</p>
          <h1>Sign In</h1>
          <p className="lead">Students, instructors and administrators sign in here.</p>
          <div className="auth-toggle" role="group" aria-label="Choose sign in or sign up">
            <button type="button" aria-pressed="true" onClick={() => navigate("/signin", { replace: true })}>Sign In</button>
            <button type="button" aria-pressed="false" onClick={() => navigate("/signup", { replace: true })}>Sign Up</button>
          </div>
          <SignInForm key="in" />
          <p className="auth-panel-note">New to Aikido Shinju-Kai? <Link to="/join">See how to join</Link></p>
        </div>
      </section>
    );
  }

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
        <div className="auth-toggle" role="group" aria-label="Choose sign in or sign up">
          <button type="button" aria-pressed={!isSignUp} onClick={() => navigate("/signin", { replace: true })}>
            Sign In
          </button>
          <button type="button" aria-pressed={isSignUp} onClick={() => navigate("/signup", { replace: true })}>
            Sign Up
          </button>
        </div>
        {isSignUp ? <SignUpForm key="up" /> : <SignInForm key="in" />}
      </div>
    </section>
  );
}

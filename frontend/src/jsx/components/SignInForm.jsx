import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Sign-in form for all three roles (student, instructor, admin).
// After a successful sign in, AuthPage sees the user and redirects to the dashboard.
export default function SignInForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser reloading the page
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="current-password" required />
      </label>
      {/* FSDP-90 */}
      <p className="auth-form-link"><Link to="/forgot-password">Forgot password?</Link></p>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

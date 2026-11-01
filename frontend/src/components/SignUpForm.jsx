import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

// Student registration only. There is no role field: the server makes every
// new account a student. Instructor and admin accounts are created by the school.
export default function SignUpForm() {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Quick checks in the browser (the server checks again)
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      await signup({ fullName, email, password });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <label>
        Full name
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
               autoComplete="name" required />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="new-password" minLength={8} required />
      </label>
      <label>
        Confirm password
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
               autoComplete="new-password" required />
      </label>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Creating account..." : "Create Account"}
      </button>
      </form>
  );
}

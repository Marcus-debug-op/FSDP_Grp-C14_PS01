import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { checkResetToken, resetPassword } from "../../js/services/authService.js";
import usePageTitle from "../../js/hooks/usePageTitle.js";
import "../../css/auth.css";

// FSDP-90: opened from the reset email (/reset-password?token=...).
// Checks the link first, then lets the user choose a new password.
export default function ResetPassword() {
  usePageTitle("Reset password");
  const [searchParams] = useSearchParams();
  // Read once, then removed from the address bar so the secret isn't left in
  // the browser history or sent to other sites in the Referer header.
  const [token] = useState(() => searchParams.get("token") || "");
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.history.replaceState(null, "", "/reset-password");
    let cancelled = false;
    if (!token) {
      setStatus("invalid");
      setMessage("This reset link is incomplete. Please request a new one.");
      return undefined;
    }
    checkResetToken(token)
      .then((result) => {
        if (cancelled) return;
        setStatus(result.valid ? "ready" : "invalid");
        setMessage(result.valid ? "" : result.message);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("invalid");
        setMessage(err.message);
      });
    return () => { cancelled = true; };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8 || password.length > 72) {
      setError("Password must be 8–72 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await resetPassword({ token, password });
      setStatus("done");
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container narrow">
        <p className="eyebrow">Account help</p>
        <h1>Choose a new password</h1>

        {status === "checking" && <p>Checking your reset link...</p>}

        {status === "invalid" && (
          <div className="auth-form">
            <p className="form-error" role="alert">{message}</p>
            <Link className="btn btn-primary" to="/forgot-password">Request a new link</Link>
          </div>
        )}

        {status === "done" && (
          <div className="auth-form">
            <p className="form-success" role="status">{message}</p>
            <Link className="btn btn-primary" to="/signin">Sign in</Link>
          </div>
        )}

        {status === "ready" && (
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <p className="form-error" role="alert">{error}</p>}
            <label>
              New password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                     autoComplete="new-password" minLength={8} maxLength={72} required />
              <span className="form-hint">8–72 characters.</span>
            </label>
            <label>
              Confirm new password
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                     autoComplete="new-password" minLength={8} maxLength={72} required />
            </label>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

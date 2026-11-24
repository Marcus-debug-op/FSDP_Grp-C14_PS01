import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../js/services/authService.js";
import usePageTitle from "../../js/hooks/usePageTitle.js";
import "../../css/auth.css";

// FSDP-90: asks for an email and sends a reset link.
// The same message shows whether or not the email has an account.
export default function ForgotPassword() {
  usePageTitle("Forgot password");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { message } = await requestPasswordReset(email.trim());
      setSentMessage(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container narrow">
        <p className="eyebrow">Account help</p>
        <h1>Forgot your password?</h1>
        {sentMessage ? (
          <div className="auth-form">
            <p className="form-success" role="status">{sentMessage}</p>
            <p className="form-hint">Can't find it? Check your spam or junk folder, or try again in a minute.</p>
            <Link className="btn btn-primary" to="/signin">Back to sign in</Link>
          </div>
        ) : (
          <>
            <p className="lead">Enter the email you signed up with and we'll send you a link to choose a new password.</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <p className="form-error" role="alert">{error}</p>}
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                       autoComplete="email" maxLength={255} required />
              </label>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Sending..." : "Send reset link"}
              </button>
              <p className="auth-form-link"><Link to="/signin">Back to sign in</Link></p>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import { requestCover } from "../../js/services/instructorService.js";

// FSDP-69 "Can't make it", on the roster page. The instructor asks the admin to
// find someone to cover the class, at least coverNoticeHours before it starts.
// The lesson stays on for students. Once another instructor accepts it, the
// class moves to them and leaves this instructor's calendar.
export default function CantMakeIt({ session, onChanged }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (session.coverStatus === "open") {
    return (
      <div className="notice cover-box" role="status">
        <strong>You've asked for cover.</strong> The admin is finding another instructor. This class stays
        yours until someone accepts it, so you'll still see it here until then.
      </div>
    );
  }

  if (session.coverTooLate) {
    return (
      <p className="notice cover-box">
        Can't make it? It's less than {session.coverNoticeHours} hours to this class, so cover can't be asked
        for online. Please contact the dojo directly.
      </p>
    );
  }

  if (!session.canRequestCover) return null;

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onChanged(await requestCover(session.id, reason));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="cover-box cover-start">
        <button type="button" className="btn btn-outline btn-small" onClick={() => setOpen(true)}>Can't make it</button>
        <p>Ask the admin to find another instructor. Lessons stay on for students. At least {session.coverNoticeHours} hours before the class.</p>
      </div>
    );
  }

  return (
    <form className="cover-box cover-form" onSubmit={send}>
      <h2 className="cover-title">Ask for cover</h2>
      <p className="cover-help">
        The admin will offer this class to another instructor. Booked students keep their place.
      </p>
      <label htmlFor="cover-reason">Why can't you make it?</label>
      <textarea
        id="cover-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        minLength={3}
        maxLength={300}
        required
      />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="offer-actions">
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          {busy ? "Sending..." : "Send to Admin"}
        </button>
        <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => setOpen(false)}>
          Back
        </button>
      </div>
    </form>
  );
}

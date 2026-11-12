import { useEffect, useState } from "react";
import { getSession, cancelSession, moveSession } from "../../js/services/sessionService.js";
import "../../css/session-change.css";

// FSDP-56: lets the instructor teaching a lesson (or an admin) cancel it or
// move it to another dojo for the day. Every student who booked it gets a
// notice on their dashboard and an email; cancelling also returns their credits.
// Drop it into any page that knows the session id:
//   <SessionChangeActions sessionId={id} onChanged={reload} />

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function SessionChangeActions({ sessionId, onChanged }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState(null); // null | "cancel" | "move"
  const [reason, setReason] = useState("");
  const [centreId, setCentreId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = () => getSession(sessionId).then(setData).catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, [sessionId]);

  if (!data) return error ? <p className="sc-error" role="alert">{error}</p> : null;
  const { session, centres } = data;

  function close() {
    setMode(null);
    setReason("");
    setCentreId("");
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "cancel") {
        const r = await cancelSession(sessionId, reason);
        setDone(
          `Lesson cancelled. ${plural(r.studentsTold, "student")} told by email and on their dashboard` +
          (r.creditsReturned ? `, ${plural(r.creditsReturned, "credit")} returned.` : ".")
        );
      } else {
        const r = await moveSession(sessionId, Number(centreId), reason);
        setDone(`Lesson moved to ${r.centre}. ${plural(r.studentsTold, "student")} told by email and on their dashboard.`);
      }
      close();
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sc">
      {session.status === "cancelled" && (
        <p className="sc-state is-cancelled">
          This lesson is cancelled.{session.changeNote ? ` Reason: ${session.changeNote}` : ""}
        </p>
      )}
      {session.status !== "cancelled" && session.movedFromUsual && (
        <p className="sc-state is-moved">
          This lesson has moved to {session.centre} for the day.{session.changeNote ? ` ${session.changeNote}` : ""}
        </p>
      )}
      {done && <p className="sc-done" role="status">{done}</p>}

      {session.canChange && !mode && (
        <div className="sc-buttons">
          <button type="button" className="btn btn-outline btn-small" onClick={() => { setDone(""); setMode("move"); }}>
            Change venue
          </button>
          <button type="button" className="btn btn-outline btn-small sc-danger" onClick={() => { setDone(""); setMode("cancel"); }}>
            Cancel lesson
          </button>
        </div>
      )}

      {mode && (
        <form className="sc-form" onSubmit={submit}>
          <h2 className="sc-title">{mode === "cancel" ? "Cancel this lesson" : "Move this lesson to another dojo"}</h2>
          <p className="sc-help">
            {session.booked === 0
              ? "No students have booked it yet."
              : mode === "cancel"
                ? `${plural(session.booked, "student")} booked. They'll get their credits back and an email.`
                : `${plural(session.booked, "student")} booked. They'll get an email with the new dojo.`}
          </p>
          {mode === "move" && (
            <label>
              New dojo
              <select value={centreId} onChange={(e) => setCentreId(e.target.value)} required>
                <option value="">Choose a dojo</option>
                {centres.filter((c) => c.id !== session.centreId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            {mode === "cancel" ? "Reason (students will see this)" : "Message for students (optional)"}
            <input
              type="text"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              required={mode === "cancel"}
              placeholder={mode === "cancel" ? "For example: instructor unwell" : "For example: usual hall closed for repairs"}
            />
          </label>
          {error && <p className="sc-error" role="alert">{error}</p>}
          <div className="sc-buttons">
            <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
              {busy ? "Saving..." : mode === "cancel" ? "Cancel lesson and tell students" : "Move lesson and tell students"}
            </button>
            <button type="button" className="btn btn-outline btn-small" onClick={close} disabled={busy}>Back</button>
          </div>
        </form>
      )}
    </div>
  );
}

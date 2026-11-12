import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPrivateLessons, requestPrivateLesson, withdrawPrivateLesson,
} from "../../../js/services/lessonService.js";
import { formatShortDate, formatTime, todayString } from "../../../js/utils/formatters.js";
import "../../../css/private-lessons.css";

// FSDP-54 Book or request a 1-on-1 session.
// The student asks for a date, time of day and dojo. The dojo schedules it
// (admin Private Lessons page), which is when the credits are taken, and the
// student gets a notice and an email.

const STATUS = {
  requested: { label: "Waiting for the dojo", tone: "wait" },
  scheduled: { label: "Booked", tone: "ok" },
  completed: { label: "Attended", tone: "ok" },
  no_show: { label: "Missed", tone: "muted" },
  cancelled: { label: "Cancelled by the dojo", tone: "alert" },
  declined: { label: "Not scheduled", tone: "muted" },
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const EMPTY = { centreId: "", preferredDate: "", preferredTime: "", note: "" };

function LessonRow({ lesson, onWithdraw, busy }) {
  const [confirming, setConfirming] = useState(false);
  const s = STATUS[lesson.status] || STATUS.requested;
  const withdrawn = lesson.status === "declined" && lesson.dojoNote === "Withdrawn by the student.";

  return (
    <li className="pl-item">
      <div className="pl-item-main">
        <p className="pl-item-title">
          {lesson.date
            ? `${formatShortDate(lesson.date)}, ${formatTime(lesson.startTime)} to ${formatTime(lesson.endTime)}`
            : `Around ${formatShortDate(lesson.preferredDate)} · ${lesson.preferredTime}`}
        </p>
        <p className="pl-item-sub">
          {lesson.centre}
          {lesson.instructor && ` · with ${lesson.instructor}`}
          {lesson.status === "requested" && ` · asked on ${formatShortDate(lesson.requestedOn)}`}
        </p>
        {lesson.note && <p className="pl-item-note">Your note: {lesson.note}</p>}
        {lesson.dojoNote && !withdrawn && <p className="pl-item-note">From the dojo: {lesson.dojoNote}</p>}
      </div>
      <div className="pl-item-side">
        <span className={`pl-status pl-status-${s.tone}`}>{withdrawn ? "Withdrawn" : s.label}</span>
        {lesson.status === "requested" && !confirming && (
          <button type="button" className="btn btn-outline btn-small" onClick={() => setConfirming(true)}>
            Withdraw
          </button>
        )}
        {confirming && (
          <div className="pl-confirm" role="group" aria-label="Withdraw this request">
            <p>Withdraw this request?</p>
            <div className="pl-buttons">
              <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={() => onWithdraw(lesson)}>
                {busy ? "Withdrawing..." : "Withdraw"}
              </button>
              <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export default function PrivateLessons({ membershipActive, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null); // { type, text }

  const load = () => getPrivateLessons().then(setData).catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  function change(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setMessage(null);
    if (!form.centreId || !form.preferredDate || !form.preferredTime) {
      setMessage({ type: "error", text: "Please choose a dojo, a date and a time of day." });
      return;
    }
    setSending(true);
    try {
      await requestPrivateLesson({ ...form, centreId: Number(form.centreId) });
      setForm(EMPTY);
      setMessage({
        type: "success",
        text: "Request sent. The dojo will pick an instructor and a time, and you'll get an email once it's booked.",
      });
      await load();
      onChanged?.();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSending(false);
    }
  }

  async function withdraw(lesson) {
    setBusyId(lesson.id);
    setMessage(null);
    try {
      await withdrawPrivateLesson(lesson.id);
      setMessage({ type: "success", text: "Request withdrawn." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="notice" role="alert">{error}</p>;
  if (!data) return <p>Loading 1-on-1 sessions...</p>;

  const waiting = data.lessons.filter((l) => l.status === "requested").length;
  const tooFewCredits = data.credits < data.creditCost;
  const atLimit = waiting >= data.maxOpenRequests;
  const blocked = !membershipActive || tooFewCredits || atLimit;

  return (
    <section className="pl" aria-labelledby="pl-title">
      <div className="pl-intro">
        <h2 id="pl-title">1-on-1 sessions</h2>
        <p>
          Personal training with an instructor. Each session uses {plural(data.creditCost, "credit")}, taken
          when the dojo books it. You have {plural(data.credits, "credit")}.
        </p>
      </div>

      <form className="pl-form" onSubmit={submit} noValidate>
        <h3>Request a session</h3>
        {!membershipActive && (
          <p className="notice pl-block">You need an active membership to request a 1-on-1. <Link to="/payments">Renew your membership</Link>.</p>
        )}
        {membershipActive && tooFewCredits && (
          <p className="notice pl-block">
            You need {plural(data.creditCost, "credit")} for a 1-on-1. <Link to="/payments">Top up credits</Link>.
          </p>
        )}
        {membershipActive && !tooFewCredits && atLimit && (
          <p className="notice pl-block">
            You already have {plural(waiting, "request")} waiting. Wait for the dojo to reply, or withdraw one below.
          </p>
        )}
        <fieldset disabled={blocked || sending}>
          <div className="pl-fields">
            <label>
              Dojo
              <select value={form.centreId} onChange={(e) => change("centreId", e.target.value)} required>
                <option value="">Choose a dojo</option>
                {data.centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Preferred date
              <input
                type="date"
                value={form.preferredDate}
                min={todayString(1)}
                max={todayString(data.daysAhead)}
                onChange={(e) => change("preferredDate", e.target.value)}
                required
              />
            </label>
            <label>
              Time of day
              <select value={form.preferredTime} onChange={(e) => change("preferredTime", e.target.value)} required>
                <option value="">Choose a time</option>
                {data.timeChoices.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="pl-note">
            What would you like to work on? (optional)
            <textarea
              rows={3}
              maxLength={500}
              value={form.note}
              onChange={(e) => change("note", e.target.value)}
              placeholder="For example: preparing for my next grading"
            />
          </label>
          <button type="submit" className="btn btn-primary">{sending ? "Sending..." : "Send request"}</button>
        </fieldset>
        {message && (
          <p className={`pl-message ${message.type === "error" ? "is-error" : "is-success"}`} role={message.type === "error" ? "alert" : "status"}>
            {message.text}
          </p>
        )}
      </form>

      <div className="pl-list-box">
        <h3>Your requests and sessions</h3>
        {data.lessons.length === 0 ? (
          <p className="pl-empty">You haven't asked for a 1-on-1 yet.</p>
        ) : (
          <ul className="pl-list">
            {data.lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} onWithdraw={withdraw} busy={busyId === l.id} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

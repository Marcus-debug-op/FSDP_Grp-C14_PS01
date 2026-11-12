import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createGradingSession,
  getBelts,
  getCentres,
  getGradingSessions,
  getInstructors,
} from "../../../js/services/adminService.js";
import { addDays, formatShortDate, formatTime, todayString } from "../../../js/utils/formatters.js";
import PageHeader from "../../components/admin/PageHeader.jsx";
import "../../../css/auth.css";
import "../../../css/admin.css";

const VIEWS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

function beltRange(session) {
  if (!session.minBelt || !session.maxBelt) return "Not set";
  if (session.minBelt.id === session.maxBelt.id) return session.minBelt.name;
  return `${session.minBelt.name} to ${session.maxBelt.name}`;
}

function statusText(session) {
  if (session.status === "cancelled") return "Cancelled";
  if (session.status === "completed") return "Completed";
  if (!session.isUpcoming) return "Past";
  if (session.registrationOpen) return `Open until ${formatShortDate(session.registrationClosesOn)}`;
  return "Applications closed";
}

function defaultCloseDate(gradingDate) {
  const today = todayString();
  const twoWeeksBefore = addDays(gradingDate, -14);
  return twoWeeksBefore < today ? today : twoWeeksBefore;
}

function GradingForm({ centres, belts, instructors, onSaved, onCancel }) {
  const today = todayString();
  const [centreId, setCentreId] = useState("");
  const [gradingDate, setGradingDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [closesOn, setClosesOn] = useState("");
  const [closesTouched, setClosesTouched] = useState(false);
  const [minBeltId, setMinBeltId] = useState("");
  const [maxBeltId, setMaxBeltId] = useState("");
  const [examinerId, setExaminerId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function changeDate(value) {
    setGradingDate(value);
    if (!closesTouched && value) setClosesOn(defaultCloseDate(value));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const session = await createGradingSession({
        centreId: Number(centreId),
        gradingDate,
        startTime,
        registrationClosesOn: closesOn,
        minBeltId: Number(minBeltId),
        maxBeltId: Number(maxBeltId),
        examinerId: examinerId ? Number(examinerId) : null,
      });
      onSaved(session);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <section className="dojo-form-panel" aria-labelledby="grading-form-title">
      <h2 id="grading-form-title" ref={headingRef} tabIndex={-1}>New Grading Session</h2>
      <form className="auth-form lesson-form" onSubmit={handleSubmit}>
        {error && <p className="form-error" role="alert">{error}</p>}

        <label>
          Dojo
          <select value={centreId} onChange={(e) => setCentreId(e.target.value)} required>
            <option value="">Choose a dojo</option>
            {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <div className="lesson-row">
          <label>
            Grading date
            <input type="date" value={gradingDate} min={today} onChange={(e) => changeDate(e.target.value)} required />
          </label>
          <label>
            Start time
            <input type="time" value={startTime} step={900} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label>
            Applications close
            <input
              type="date"
              value={closesOn}
              min={today}
              max={gradingDate || undefined}
              onChange={(e) => {
                setClosesTouched(true);
                setClosesOn(e.target.value);
              }}
              required
            />
          </label>
        </div>
        <span className="form-hint grd-hint">Applications usually close 2 weeks before the grading.</span>

        <div className="grd-belts">
          <label>
            Lowest belt graded
            <select value={minBeltId} onChange={(e) => setMinBeltId(e.target.value)} required>
              <option value="">Choose a belt</option>
              {belts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>
            Highest belt graded
            <select value={maxBeltId} onChange={(e) => setMaxBeltId(e.target.value)} required>
              <option value="">Choose a belt</option>
              {belts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        </div>
        <span className="form-hint grd-hint">The belts students are grading for. For example, 6th Kyu to 3rd Kyu.</span>

        <label>
          Examiner
          <select value={examinerId} onChange={(e) => setExaminerId(e.target.value)}>
            <option value="">Not decided yet</option>
            {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
          </select>
        </label>

        <div className="button-row form-buttons">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creating..." : "Create Grading"}
          </button>
          <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

function SessionsTable({ sessions, view }) {
  if (sessions.length === 0) {
    return <p className="adm-empty">{view === "upcoming" ? "No gradings scheduled yet." : "No past gradings yet."}</p>;
  }
  return (
    <table className="att-table adm-table grd-table">
      <caption className="visually-hidden">{view === "upcoming" ? "Upcoming gradings" : "Past gradings"}</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Dojo</th>
          <th scope="col">Belts graded</th>
          <th scope="col">Examiner</th>
          <th scope="col">Applications</th>
          <th scope="col">Status</th>
          <th scope="col"><span className="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr key={s.id}>
            <td data-label="Date">
              <span className="att-name">{formatShortDate(s.gradingDate)}</span>
              <span className="att-sub">{formatTime(s.startTime)}</span>
            </td>
            <td data-label="Dojo">{s.centre.name}</td>
            <td data-label="Belts graded">{beltRange(s) === "Not set" ? <span className="adm-muted">Not set</span> : beltRange(s)}</td>
            <td data-label="Examiner">{s.examiner ? s.examiner.name : <span className="adm-muted">Not decided</span>}</td>
            <td data-label="Applications">
              {s.approvedCount} approved by instructor
              {s.awaitingCount > 0 && <span className="att-sub">{s.awaitingCount} waiting for instructor</span>}
            </td>
            <td data-label="Status">{statusText(s)}</td>
            <td className="lesson-actions">
              <Link to={`/admin/grading/${s.id}`} className="btn btn-outline btn-small">View Applications</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminGrading() {
  const [data, setData] = useState(null);
  const [centres, setCentres] = useState([]);
  const [belts, setBelts] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [view, setView] = useState("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function load() {
    return getGradingSessions().then(setData).catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    Promise.all([getCentres(), getBelts(), getInstructors()])
      .then(([centreList, beltList, instructorList]) => {
        setCentres(centreList.filter((c) => c.isActive));
        setBelts(beltList);
        setInstructors(instructorList);
      })
      .catch((err) => setError(err.message));
  }, []);

  function handleSaved(session) {
    setShowForm(false);
    setView("upcoming");
    setNotice(`Grading created for ${formatShortDate(session.gradingDate)} at ${session.centre.name}.`);
    load();
  }

  const sessions = data ? data[view] : [];

  return (
    <section className="section">
      <div className="container">
        <PageHeader
          eyebrow="Scheduling · Grading"
          title="Grading Sessions"
          lead="Schedule gradings, then open one to see which students are ready to grade."
          actions={
            !showForm && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setNotice("");
                  setShowForm(true);
                }}
              >
                New Grading Session
              </button>
            )
          }
        />

        {notice && <p className="notice admin-notice" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {showForm && (
          <GradingForm
            centres={centres}
            belts={belts}
            instructors={instructors}
            onSaved={handleSaved}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div className="adm-toolbar">
          <div className="auth-toggle" role="group" aria-label="Gradings to show">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => setView(v.key)}>
                {v.label}
                {data && data[v.key].length > 0 ? ` (${data[v.key].length})` : ""}
              </button>
            ))}
          </div>
        </div>

        {!data && !error && <p>Loading...</p>}
        {data && <SessionsTable sessions={sessions} view={view} />}
      </div>
    </section>
  );
}

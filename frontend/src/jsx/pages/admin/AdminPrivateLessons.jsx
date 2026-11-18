import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  cancelPrivateLesson,
  changePrivateLessonInstructor,
  createPrivateLesson,
  getCentres,
  getInstructorAvailability,
  getPrivateLessons,
  recordPrivateLessonOutcome,
  schedulePrivateLesson,
  searchStudents,
} from "../../../js/services/adminService.js";
import { formatShortDate, formatTime, todayString } from "../../../js/utils/formatters.js";
import PageHeader from "../../components/admin/PageHeader.jsx";
import OfferRow from "../../components/admin/OfferRow.jsx";
import DateInput from "../../components/admin/DateInput.jsx";
import useAutoRefresh from "../../../js/hooks/useAutoRefresh.js";
import "../../../css/auth.css";
import "../../../css/admin.css";

const VIEWS = [
  { key: "requests", label: "Requests" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

const STATUS_LABEL = {
  requested: "Requested",
  scheduled: "Scheduled",
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Cancelled",
  declined: "Declined",
};

const LESSON_COST = 3;

function credits(n) {
  return `${n} credit${n === 1 ? "" : "s"}`;
}

function when(lesson) {
  return `${formatShortDate(lesson.date)}, ${formatTime(lesson.startTime)} - ${formatTime(lesson.endTime)}`;
}

function StudentPicker({ student, onPick, locked }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      searchStudents({ q })
        .then((data) => active && setResults(data.students.slice(0, 6)))
        .catch(() => active && setResults([]))
        .finally(() => active && setSearching(false));
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  if (student) {
    return (
      <div className="lesson-field">
        <span className="lesson-label">Student</span>
        <p className="lesson-picked">
          <strong>{student.name}</strong> <span className="adm-muted">{student.email}</span>
          {!locked && <button type="button" className="link-button" onClick={() => onPick(null)}>Change</button>}
        </p>
      </div>
    );
  }

  const q = query.trim();
  return (
    <div className="lesson-field">
      <label>
        Student
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a name or email" maxLength={100} />
      </label>
      {q.length >= 2 && !searching && results.length === 0 && <p className="form-hint">No students match.</p>}
      {results.length > 0 && (
        <ul className="lesson-results">
          {results.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onPick({ id: s.id, name: s.fullName, email: s.email, credits: s.credits })}>
                <span>{s.fullName}</span>
                <span className="adm-muted">{s.email} · {credits(s.credits)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LessonForm({ request, centres, onSaved, onCancel }) {
  const today = todayString();
  const [student, setStudent] = useState(request ? request.student : null);
  const [centreId, setCentreId] = useState(request ? String(request.centre.id) : "");
  const [date, setDate] = useState(request && request.preferredDate >= today ? request.preferredDate : today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [instructors, setInstructors] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const slotReady = centreId && date && startTime && endTime && endTime > startTime;

  useEffect(() => {
    if (!slotReady) {
      setInstructors(null);
      return undefined;
    }
    let active = true;
    getInstructorAvailability({ centreId, date, startTime, endTime, lessonId: request?.id })
      .then((list) => {
        if (!active) return;
        setInstructors(list);
        setInstructorId((current) => (list.some((i) => String(i.id) === current && i.isFree) ? current : ""));
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [centreId, date, startTime, endTime, slotReady, request]);

  const cost = request ? request.creditCost : LESSON_COST;
  const short = student && student.credits < cost;
  const freeCount = instructors ? instructors.filter((i) => i.isFree).length : 0;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!student) return setError("Please choose a student.");
    if (!instructorId) return setError("Please choose an instructor who is free at that time.");
    setSaving(true);
    const body = { centreId: Number(centreId), instructorId: Number(instructorId), date, startTime, endTime, adminNote };
    try {
      const lesson = request
        ? await schedulePrivateLesson(request.id, body)
        : await createPrivateLesson({ ...body, studentId: student.id });
      onSaved(lesson);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <section className="dojo-form-panel" aria-labelledby="lesson-form-title">
      <h2 id="lesson-form-title" ref={headingRef} tabIndex={-1}>
        {request ? `Schedule ${request.student.name}'s Lesson` : "New Private Lesson"}
      </h2>
      {request && (
        <p className="lesson-request">
          Asked for {formatShortDate(request.preferredDate)}
          {request.preferredTime ? `, ${request.preferredTime}` : ""}
          {request.studentNote ? `. "${request.studentNote}"` : "."}
        </p>
      )}
      <form className="auth-form lesson-form" onSubmit={handleSubmit}>
        {error && <p className="form-error" role="alert">{error}</p>}

        <StudentPicker student={student} onPick={setStudent} locked={Boolean(request)} />
        {student && (
          <p className={short ? "form-error" : "form-hint lesson-credits"}>
            {student.name} has {credits(student.credits)}. This lesson uses {credits(cost)}.
            {short ? " Ask them to top up before you schedule it." : ""}
          </p>
        )}

        <label>
          Dojo
          <select value={centreId} onChange={(e) => setCentreId(e.target.value)} required>
            <option value="">Choose a dojo</option>
            {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <div className="lesson-row">
          <label>
            Date
            <DateInput value={date} min={today} onChange={setDate} required />
          </label>
          <label>
            Start
            <input type="time" value={startTime} step={900} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label>
            End
            <input type="time" value={endTime} step={900} onChange={(e) => setEndTime(e.target.value)} required />
          </label>
        </div>

        <label>
          Instructor
          <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} disabled={!instructors} required>
            <option value="">
              {!slotReady ? "Choose a dojo, date and time first" : !instructors ? "Checking who is free..." : `Choose an instructor (${freeCount} free)`}
            </option>
            {(instructors || []).map((i) => (
              <option key={i.id} value={i.id} disabled={!i.isFree}>
                {i.isFree
                  ? i.name
                  : `${i.name} - busy, ${i.conflicts[0].label} ${formatTime(i.conflicts[0].startTime)} to ${formatTime(i.conflicts[0].endTime)}${
                      i.conflicts[0].travelOnly ? ` at ${i.conflicts[0].centreName}, too close to travel` : ""
                    }`}
              </option>
            ))}
          </select>
          <span className="form-hint">
            Only instructors who are free can be picked. If their lesson before or after is at another dojo, it needs to be at
            least 1 hour 30 minutes apart.
          </span>
        </label>

        <label>
          Note to the student
          <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} maxLength={500} placeholder="Optional" />
        </label>

        <div className="button-row form-buttons">
          <button type="submit" className="btn btn-primary" disabled={saving || short}>
            {saving ? "Scheduling..." : "Schedule Lesson"}
          </button>
          <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

function CancelRow({ lesson, colSpan, onDone, onClose }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isRequest = lesson.status === "requested";

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      onDone(await cancelPrivateLesson(lesson.id, reason));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <tr className="att-detail-row">
      <td colSpan={colSpan}>
        <div className="lesson-cancel">
          <p>
            {isRequest
              ? `Decline ${lesson.student.name}'s request?`
              : `Cancel this lesson and give ${lesson.student.name} back ${credits(lesson.creditCost)}?`}
          </p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <label>
            Reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Optional, the student will see this" />
          </label>
          <div className="card-actions">
            <button type="button" className="btn btn-outline btn-small" onClick={confirm} disabled={saving}>
              {saving ? "Saving..." : isRequest ? "Decline Request" : "Cancel Lesson"}
            </button>
            <button type="button" className="link-button" onClick={onClose}>Keep it</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function OfferStatus({ lesson }) {
  const { offer } = lesson;
  if (!offer || offer.status === "accepted") return <span className="offer-tag offer-ok">Confirmed</span>;
  if (offer.status === "pending") return <span className="offer-tag offer-wait">Waiting for reply</span>;
  return (
    <>
      <span className="offer-tag offer-no">Declined</span>
      {offer.note && <span className="att-sub">"{offer.note}"</span>}
    </>
  );
}

function StudentCell({ student, showCredits }) {
  return (
    <td data-label="Student">
      <div>
        <Link to={`/admin/students/${student.id}`} className="adm-link att-name">{student.name}</Link>
        <span className="att-sub">{showCredits ? credits(student.credits) : student.email}</span>
      </div>
    </td>
  );
}

export default function AdminPrivateLessons() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = VIEWS.some((v) => v.key === searchParams.get("view")) ? searchParams.get("view") : "requests";
  const [data, setData] = useState(null);
  const [centres, setCentres] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [changing, setChanging] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    getCentres()
      .then((list) => setCentres(list.filter((c) => c.isActive)))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let active = true;
    setError("");
    getPrivateLessons(view)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [view, reload]);

  useAutoRefresh(() => {
    getPrivateLessons(view).then(setData).catch(() => {});
  });

  function changeView(key) {
    setCancelling(null);
    setChanging(null);
    setSearchParams(key === "requests" ? {} : { view: key }, { replace: true });
  }

  function openForm(request) {
    setNotice("");
    setCancelling(null);
    setForm({ request });
  }

  function handleSaved(lesson) {
    setForm(null);
    setNotice(
      `Scheduled ${lesson.student.name} with ${lesson.instructor.name} on ${when(lesson)}. ${credits(lesson.creditCost)} taken. Waiting for ${lesson.instructor.name} to accept.`
    );
    setReload((n) => n + 1);
  }

  function handleCancelled({ lesson, refunded }) {
    setCancelling(null);
    setNotice(
      lesson.status === "declined"
        ? `Declined ${lesson.student.name}'s request.`
        : `Cancelled ${lesson.student.name}'s lesson.${refunded ? ` ${credits(refunded)} returned.` : ""}`
    );
    setReload((n) => n + 1);
  }

  function openCancel(id) {
    setChanging(null);
    setCancelling(id);
  }

  function openChange(id) {
    setCancelling(null);
    setChanging(id);
  }

  async function changeInstructor(lesson, instructorId) {
    const updated = await changePrivateLessonInstructor(lesson.id, instructorId);
    setChanging(null);
    setNotice(`Offered ${lesson.student.name}'s lesson to ${updated.instructor.name}. No extra credits taken. Waiting for them to accept.`);
    setReload((n) => n + 1);
  }

  async function markOutcome(lesson, outcome) {
    setBusyId(lesson.id);
    setError("");
    try {
      await recordPrivateLessonOutcome(lesson.id, outcome);
      setNotice(`${lesson.student.name}'s lesson marked as ${outcome === "completed" ? "completed" : "a no-show"}.`);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const ready = data && data.view === view;
  const lessons = ready ? data.lessons : [];
  const counts = data ? data.counts : null;

  return (
    <section className="section">
      <div className="container">
        <PageHeader
          eyebrow="Scheduling"
          title="Private Lessons"
          lead="Schedule one-to-one lessons with an instructor who is free. The instructor then accepts or declines. Credits are taken when you schedule and returned if you cancel."
          actions={
            !form && (
              <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>New Private Lesson</button>
            )
          }
        />

        {notice && <p className="notice admin-notice" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {form && (
          <LessonForm
            key={form.request?.id ?? "new"}
            request={form.request}
            centres={centres}
            onSaved={handleSaved}
            onCancel={() => setForm(null)}
          />
        )}

        <div className="adm-toolbar">
          <div className="auth-toggle" role="group" aria-label="Lessons to show">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => changeView(v.key)}>
                {v.label}
                {counts && v.key !== "past" && counts[v.key] > 0 ? ` (${counts[v.key]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {!ready && !error && <p>Loading...</p>}

        {ready && lessons.length === 0 && (
          <p className="adm-empty">
            {view === "requests" ? "No requests waiting." : view === "upcoming" ? "No lessons coming up." : "No past lessons yet."}
          </p>
        )}

        {ready && lessons.length > 0 && view === "requests" && (
          <table className="att-table adm-table lesson-table">
            <caption className="visually-hidden">Private lesson requests</caption>
            <thead>
              <tr>
                <th scope="col">Asked for</th>
                <th scope="col">Student</th>
                <th scope="col">Dojo</th>
                <th scope="col">Note</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => (
                <Fragment key={l.id}>
                  <tr>
                    <td data-label="Asked for">
                      {formatShortDate(l.preferredDate)}
                      {l.preferredTime && <span className="att-sub">{l.preferredTime}</span>}
                    </td>
                    <StudentCell student={l.student} showCredits />
                    <td data-label="Dojo">{l.centre.name}</td>
                    <td data-label="Note">{l.studentNote || <span className="adm-muted">None</span>}</td>
                    <td className="lesson-actions">
                      <button type="button" className="btn btn-outline btn-small" onClick={() => openForm(l)}>Schedule</button>
                      <button type="button" className="link-button" onClick={() => openCancel(l.id)}>Decline</button>
                    </td>
                  </tr>
                  {cancelling === l.id && (
                    <CancelRow lesson={l} colSpan={5} onDone={handleCancelled} onClose={() => setCancelling(null)} />
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {ready && lessons.length > 0 && view === "upcoming" && (
          <table className="att-table adm-table lesson-table">
            <caption className="visually-hidden">Upcoming private lessons</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Student</th>
                <th scope="col">Instructor</th>
                <th scope="col">Dojo</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => (
                <Fragment key={l.id}>
                  <tr>
                    <td data-label="When">{when(l)}</td>
                    <StudentCell student={l.student} />
                    <td data-label="Instructor">
                      <div>
                        <span className="att-name">{l.instructor.name}</span>
                        <OfferStatus lesson={l} />
                      </div>
                    </td>
                    <td data-label="Dojo">{l.centre.name}</td>
                    <td className="lesson-actions">
                      {l.date >= todayString() && l.offer?.status === "declined" && (
                        <button type="button" className="btn btn-primary btn-small" onClick={() => openChange(l.id)}>Pick Another</button>
                      )}
                      {l.date >= todayString() && l.offer?.status !== "declined" && (
                        <button type="button" className="link-button" onClick={() => openChange(l.id)}>Change instructor</button>
                      )}
                      {l.isDue && (
                        <>
                          <button type="button" className="btn btn-outline btn-small" disabled={busyId === l.id} onClick={() => markOutcome(l, "completed")}>
                            Completed
                          </button>
                          <button type="button" className="link-button" disabled={busyId === l.id} onClick={() => markOutcome(l, "no_show")}>
                            No-show
                          </button>
                        </>
                      )}
                      <button type="button" className="link-button" onClick={() => openCancel(l.id)}>Cancel</button>
                    </td>
                  </tr>
                  {cancelling === l.id && (
                    <CancelRow lesson={l} colSpan={5} onDone={handleCancelled} onClose={() => setCancelling(null)} />
                  )}
                  {changing === l.id && (
                    <OfferRow
                      colSpan={5}
                      prompt={`Give ${l.student.name}'s lesson on ${when(l)} to another instructor. The student is not charged again.`}
                      hint="The new instructor gets a request to accept or decline."
                      loadInstructors={() =>
                        getInstructorAvailability({ centreId: l.centre.id, date: l.date, startTime: l.startTime, endTime: l.endTime, lessonId: l.id }).then((list) =>
                          list
                            .filter((i) => i.id !== l.instructor.id)
                            .map((i) => ({ ...i, declined: l.offer?.status === "declined" && l.offer.instructor.id === i.id }))
                        )
                      }
                      onOffer={(instructorId) => changeInstructor(l, instructorId)}
                      onClose={() => setChanging(null)}
                    />
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {ready && lessons.length > 0 && view === "past" && (
          <table className="att-table adm-table lesson-table">
            <caption className="visually-hidden">Past private lessons</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Student</th>
                <th scope="col">Instructor</th>
                <th scope="col">Dojo</th>
                <th scope="col">Status</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => (
                <tr key={l.id}>
                  <td data-label="When">{l.date ? when(l) : `Asked for ${formatShortDate(l.preferredDate)}`}</td>
                  <StudentCell student={l.student} />
                  <td data-label="Instructor">{l.instructor ? l.instructor.name : <span className="adm-muted">None</span>}</td>
                  <td data-label="Dojo">{l.centre.name}</td>
                  <td data-label="Status">{STATUS_LABEL[l.status] || l.status}</td>
                  <td data-label="Note">{l.adminNote || <span className="adm-muted">None</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRoster, saveAttendance } from "../../../js/services/instructorService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import SessionChangeActions from "../../components/SessionChangeActions.jsx";
import BackButton from "../../components/BackButton.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
];

// Turns the roster from the API into { studentId: status } for the buttons.
// A late student did attend, so they show as present. Any other status in the
// table has no button, so it counts as not marked here.
function marksFrom(roster) {
  const shown = roster.map((s) => ({ ...s, status: s.status === "late" ? "present" : s.status }));
  const known = shown.filter((s) => STATUSES.some((option) => option.value === s.status));
  return Object.fromEntries(known.map((s) => [s.studentId, s.status]));
}

// Roster for one class: mark each student, then save them all together.
export default function ClassRoster() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [marks, setMarks] = useState({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRoster(id)
      .then((data) => {
        setSession(data.session);
        setRoster(data.roster);
        setMarks(marksFrom(data.roster));
      })
      .catch((err) => setError(err.message));
  }, [id]);

  // Tapping the selected option again clears it, for a mark made by mistake.
  function mark(studentId, status) {
    const next = { ...marks };
    if (next[studentId] === status) delete next[studentId];
    else next[studentId] = status;
    setMarks(next);
    setSaved(false);
  }

  // Marks everyone present; once everyone is present, the same button clears them all.
  function toggleAllPresent() {
    const allPresent = roster.every((student) => marks[student.studentId] === "present");
    setMarks(allPresent ? {} : Object.fromEntries(roster.map((student) => [student.studentId, "present"])));
    setSaved(false);
  }

  // Only students whose mark differs from what is saved are sent. A cleared
  // mark is sent as null so the saved one is removed.
  const savedMarks = marksFrom(roster);
  const changes = roster
    .filter((student) => marks[student.studentId] !== savedMarks[student.studentId])
    .map((student) => ({ studentId: student.studentId, status: marks[student.studentId] ?? null }));

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const data = await saveAttendance(id, changes);
      setRoster(data.roster);
      setMarks(marksFrom(data.roster));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const markedCount = Object.keys(marks).length;
  const presentCount = Object.values(marks).filter((status) => status === "present").length;

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji" aria-hidden="true">合</span>
        <div className="container">
          <BackButton />

          {session && (
            <>
              <p className="eyebrow">{session.canMark ? "Taking attendance" : "Attendance record"}</p>
              <h1 className="roster-title">{session.title}</h1>
              <p className="lead">
                {session.centre}, {formatTime(session.startTime)} - {formatTime(session.endTime)}
              </p>
              {session.attendanceClosed && (
                <p className="notice roster-closed">Attendance closed 24 hours after this class ended, so this roster is view only.</p>
              )}
              {session.canMark && (
                <Link to={`/instructor/sessions/${id}/qr`} className="btn btn-primary btn-small roster-qr-btn">Show check-in QR code</Link>
              )}
              {/* FSDP-56: cancel the lesson or move it to another dojo for the day */}
              <SessionChangeActions sessionId={id} />
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          {session && roster.length === 0 && <p className="notice">No students are booked for this class yet.</p>}

          {roster.length > 0 && (
            <div className="roster-panel">
              <ul className="stats roster-stats">
                <li><strong>{presentCount}</strong><span>Present</span></li>
                <li><strong>{markedCount - presentCount}</strong><span>Absent</span></li>
                <li><strong>{roster.length - markedCount}</strong><span>Not marked</span></li>
              </ul>

              {session.canMark && (
                <div className="roster-tools">
                  <button type="button" className="btn btn-outline btn-small" onClick={toggleAllPresent}>
                    {presentCount === roster.length ? "Unmark All" : "Mark All Present"}
                  </button>
                  <p>Tap a selected option again to clear it.</p>
                </div>
              )}

              <ul className="roster">
                {roster.map((student) => (
                  <li className="roster-row" key={student.studentId}>
                    <div>
                      <strong>{student.fullName}</strong>
                      <span className="roster-belt">{student.belt || "No belt recorded"}</span>
                    </div>
                    <div className="roster-options" role="group" aria-label={`Attendance for ${student.fullName}`}>
                      {STATUSES.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          className={`roster-option roster-option-${option.value}${marks[student.studentId] === option.value ? " is-selected" : ""}`}
                          aria-pressed={marks[student.studentId] === option.value}
                          disabled={!session.canMark}
                          onClick={() => mark(student.studentId, option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="roster-footer">
                <p>{markedCount} of {roster.length} marked</p>
                {session.canMark && (
                  <button type="button" className="btn btn-primary" disabled={changes.length === 0 || saving} onClick={handleSave}>
                    {saving ? "Saving..." : "Save Attendance"}
                  </button>
                )}
              </div>
              {saved && <p className="notice" role="status">Attendance saved.</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

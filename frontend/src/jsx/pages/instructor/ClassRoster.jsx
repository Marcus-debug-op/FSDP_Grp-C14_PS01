import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRoster, saveAttendance } from "../../../js/services/instructorService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
];

// Turns the roster from the API into { studentId: status } for the buttons.
// Any other status in the table has no button, so it counts as not marked here.
function marksFrom(roster) {
  const known = roster.filter((s) => STATUSES.some((option) => option.value === s.status));
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

  function mark(studentId, status) {
    setMarks({ ...marks, [studentId]: status });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const records = Object.entries(marks).map(([studentId, status]) => ({ studentId: Number(studentId), status }));
      const data = await saveAttendance(id, records);
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
          <Link to="/dashboard" className="instructor-back">Back to today's classes</Link>

          {session && (
            <>
              <p className="eyebrow">Taking attendance</p>
              <h1 className="roster-title">{session.title}</h1>
              <p className="lead">
                {session.centre}, {formatTime(session.startTime)} - {formatTime(session.endTime)}
              </p>
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
                <button type="button" className="btn btn-primary" disabled={markedCount === 0 || saving} onClick={handleSave}>
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
              {saved && <p className="notice" role="status">Attendance saved.</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

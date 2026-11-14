import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGradingReadiness } from "../../../js/services/instructorService.js";
import { REGIONS } from "../../../js/data/dojos.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import { regionOf } from "../../components/ReadinessRow.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const STATUS_LABEL = { ready: "Ready", not_yet: "Not yet", top_belt: "Highest belt", no_profile: "No belt recorded" };
const STATUS_FILTERS = [
  { value: "all", label: "All students" },
  { value: "ready", label: "Ready" },
  { value: "not_yet", label: "Not yet" },
  { value: "dropping", label: "Attendance dropping" },
];
const CHECK_SHORT = { months: "time at belt", membership: "membership" };

function matchesStatus(student, filter) {
  if (filter === "all") return true;
  if (filter === "dropping") return student.droppedOff;
  return student.status === filter;
}

// One student: name (links to their progress page), a bar for classes since
// their last belt against what the next belt needs, ticks for the other rules,
// and Ready / Not yet.
function StudentRow({ student }) {
  const region = regionOf(student.homeDojo);
  const { classes } = student;
  const share = classes ? (classes.need > 0 ? Math.min(classes.have / classes.need, 1) : 1) : 0;
  const classesMet = classes && classes.have >= classes.need;
  const otherChecks = student.checks.filter((check) => check.key !== "classes");

  return (
    <li className="student-row">
      <div className="student-row-name">
        <Link to={`/instructor/students/${student.studentId}`}>{student.fullName}</Link>
        <span className="check-on-dojo">
          {student.nextBelt ? `${student.currentBelt} to ${student.nextBelt}` : student.currentBelt || "No belt recorded"}
          {" · "}
          {student.homeDojo ? `${student.homeDojo}${region ? `, ${region}` : ""}` : "No home dojo"}
        </span>
        {student.droppedOff && <span className="student-dropping">Attendance dropping</span>}
      </div>

      <div className="student-row-progress">
        {classes ? (
          <>
            <div
              className={`student-bar${classesMet ? " is-met" : ""}`}
              role="img"
              aria-label={classes.need > 0
                ? `${classes.have} of ${classes.need} classes for ${student.nextBelt}`
                : `${classes.have} classes, no minimum`}
            >
              <span style={{ width: `${Math.round(share * 100)}%` }}></span>
            </div>
            <p className="student-checks">
              {classes.need > 0 ? `${classes.have} / ${classes.need} classes` : `${classes.have} classes, no minimum`}
              {otherChecks.map((check) => (
                <span key={check.key} className={check.met ? "is-met" : "is-unmet"}>
                  {" · "}
                  <span aria-hidden="true">{check.met ? "✓" : "✗"}</span> {CHECK_SHORT[check.key] || check.label}
                  <span className="visually-hidden">{check.met ? " met" : " not met"}</span>
                </span>
              ))}
            </p>
          </>
        ) : (
          <p className="student-checks">{student.status === "top_belt" ? "At the highest belt." : "No belt recorded yet."}</p>
        )}
      </div>

      <span className={`readiness-status readiness-status-${student.status}`}>{STATUS_LABEL[student.status]}</span>
    </li>
  );
}

// Students page (FSDP-72, FSDP-21): every student who trained with or booked
// this instructor in the last 3 months, with how close they are to their next
// grading. Ready first, then whoever is closest.
export default function InstructorStudents() {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("All");
  const [dojoSearch, setDojoSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    getGradingReadiness().then(setStudents).catch((err) => setError(err.message));
  }, []);

  const search = dojoSearch.trim().toLowerCase();
  const shown = (students || []).filter((s) =>
    (region === "All" || regionOf(s.homeDojo) === region)
    && (!search || (s.homeDojo || "").toLowerCase().includes(search))
    && matchesStatus(s, status));
  const readyCount = shown.filter((s) => s.status === "ready").length;

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container analytics-page">
          <p className="eyebrow">Training progress</p>
          <h1 className="roster-title">Your students</h1>
          <p className="lead">Everyone who trained with you or booked your classes in the last 3 months, and how close they are to their next grading.</p>

          {error && <p className="form-error" role="alert">{error}</p>}
          {!students && !error && <p className="trends-loading">Loading students...</p>}
          {students && students.length === 0 && (
            <p className="notice">No students have trained in your classes in the last 3 months.</p>
          )}

          {students && students.length > 0 && (
            <>
              <div className="filters">
                <label>
                  Region
                  <select value={region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="All">All regions</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label>
                  Dojo
                  <input type="search" value={dojoSearch} placeholder="Search by dojo name" onChange={(e) => setDojoSearch(e.target.value)} />
                </label>
                <label>
                  Show
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </label>
              </div>

              <p className="trends-note" aria-live="polite">
                {shown.length} {shown.length === 1 ? "student" : "students"} · {readyCount} ready
              </p>

              {shown.length === 0 ? (
                <p className="notice readiness-empty">No students match these filters.</p>
              ) : (
                <ul className="check-on-list student-list">
                  {shown.map((student) => <StudentRow student={student} key={student.studentId} />)}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

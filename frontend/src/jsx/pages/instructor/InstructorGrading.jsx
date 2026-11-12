import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGradingReadiness, getUpcomingGradings } from "../../../js/services/instructorService.js";
import { REGIONS } from "../../../js/data/dojos.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import ReadinessRow, { regionOf } from "../../components/ReadinessRow.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const toDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const gradingDay = (ymd) => toDate(ymd).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" });
export const shortDate = (ymd) => toDate(ymd).toLocaleDateString("en-SG", { day: "numeric", month: "short" });

// Grading page: upcoming gradings with your applicants (FSDP-17), then your
// students checked against the rules for their next belt (FSDP-72).
export default function InstructorGrading() {
  const [gradings, setGradings] = useState(null);
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("All");
  const [dojoSearch, setDojoSearch] = useState("");

  useEffect(() => {
    getUpcomingGradings().then(setGradings).catch((err) => setError(err.message));
    getGradingReadiness().then(setStudents).catch((err) => setError(err.message));
  }, []);

  const search = dojoSearch.trim().toLowerCase();
  const shown = (students || []).filter((s) =>
    (region === "All" || regionOf(s.homeDojo) === region) &&
    (!search || (s.homeDojo || "").toLowerCase().includes(search))
  );

  // Says which filter left the list empty, e.g. "from dojos in the West matching "bedok"".
  const filterWords = [
    region !== "All" && `in the ${region}`,
    search && `matching "${dojoSearch.trim()}"`,
  ].filter(Boolean).join(" ");

  const readyCount = shown.filter((s) => s.status === "ready").length;
  const notYetCount = shown.filter((s) => s.status === "not_yet").length;

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container">
          <p className="eyebrow">Assessment and progression</p>
          <h1 className="roster-title">Grading</h1>
          <p className="lead">Upcoming gradings, and how ready your students are for their next belt.</p>

          {error && <p className="form-error" role="alert">{error}</p>}

          <h2 className="calendar-list-title grading-section-title">Upcoming gradings</h2>
          {gradings && gradings.length === 0 && <p className="notice">No gradings are scheduled.</p>}
          {gradings && gradings.length > 0 && (
            <div className="grid instructor-classes">
              {gradings.map((grading) => (
                <article className="card" key={grading.id}>
                  <span className="tag">
                    {grading.registrationOpen ? `Applications close ${shortDate(grading.closesOn)}` : "Applications closed"}
                  </span>
                  <h3 className="instructor-card-title">{gradingDay(grading.date)}</h3>
                  <dl className="details">
                    <div><dt>Time</dt><dd>{formatTime(grading.startTime)}</dd></div>
                    <div><dt>Dojo</dt><dd>{grading.centre}</dd></div>
                    <div><dt>Applied</dt><dd>{grading.myApplicants} of your students</dd></div>
                  </dl>
                  <Link to={`/instructor/gradings/${grading.id}`} className="btn btn-outline btn-small">
                    View Applicants
                  </Link>
                </article>
              ))}
            </div>
          )}

          <h2 className="calendar-list-title grading-section-title">Your students</h2>
          <p className="lead">
            Everyone who trained in or booked your classes in the last 3 months, checked against the rules for
            their next belt.
          </p>

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
                  <input
                    type="search"
                    value={dojoSearch}
                    placeholder="Search by dojo name"
                    onChange={(e) => setDojoSearch(e.target.value)}
                  />
                </label>
              </div>

              <ul className="stats roster-stats" aria-live="polite">
                <li className="stat-ready"><strong>{readyCount}</strong><span>Ready</span></li>
                <li className="stat-not-yet"><strong>{notYetCount}</strong><span>Not yet</span></li>
                <li><strong>{shown.length}</strong><span>Students</span></li>
              </ul>

              {shown.length === 0 && (
                <p className="notice readiness-empty">You have no students from dojos {filterWords}.</p>
              )}

              <ul className="readiness-list">
                {shown.map((student) => <ReadinessRow student={student} key={student.studentId} />)}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

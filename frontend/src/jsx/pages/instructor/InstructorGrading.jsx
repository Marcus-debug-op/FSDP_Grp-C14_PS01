import { useEffect, useState } from "react";
import { getGradingReadiness } from "../../../js/services/instructorService.js";
import { REGIONS, dojos } from "../../../js/data/dojos.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const STATUS_LABEL = {
  ready: "Ready",
  not_yet: "Not yet",
  top_belt: "Highest belt",
  no_profile: "No belt recorded",
};

// Dojo names differ slightly between the database and the dojo directory
// ("Our Tampines Hub Dojo" and "Our Tampines Hub"), so compare them without
// the word "dojo", spaces or punctuation.
const simplify = (name) => (name || "").toLowerCase().replace(/\bdojo\b/g, "").replace(/[^a-z0-9]/g, "");
const REGION_OF = new Map(dojos.map((dojo) => [simplify(dojo.name), dojo.region]));
const regionOf = (dojoName) => REGION_OF.get(simplify(dojoName)) || null;

// Grading readiness (FSDP-72): the instructor's students, each checked
// against the rules for their next belt.
export default function InstructorGrading() {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("All");
  const [dojoSearch, setDojoSearch] = useState("");

  useEffect(() => {
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
          <p className="eyebrow">Grading readiness</p>
          <h1 className="roster-title">Your Students</h1>
          <p className="lead">
            Everyone who trained in or booked your classes in the last 3 months, checked against the rules for
            their next belt.
          </p>

          {error && <p className="form-error" role="alert">{error}</p>}

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
                {shown.map((student) => (
                  <li className={`readiness-row readiness-row-${student.status}`} key={student.studentId}>
                    <div className="readiness-student">
                      <strong>{student.fullName}</strong>
                      <span className="roster-belt">
                        {student.nextBelt ? `${student.currentBelt} to ${student.nextBelt}` : student.currentBelt || "No belt recorded"}
                      </span>
                      <span className="roster-belt">
                        {student.homeDojo
                          ? `${student.homeDojo}${regionOf(student.homeDojo) ? `, ${regionOf(student.homeDojo)}` : ""}`
                          : "No home dojo"}
                      </span>
                      <span className={`readiness-status readiness-status-${student.status}`}>
                        {STATUS_LABEL[student.status]}
                      </span>
                    </div>

                    {student.checks.length > 0 && (
                      <dl className="readiness-checks">
                        {student.checks.map((check) => (
                          <div className={check.met ? "is-met" : "is-unmet"} key={check.key}>
                            <dt>{check.label}</dt>
                            <dd>
                              <span className="readiness-mark">
                                <span aria-hidden="true">{check.met ? "✓ " : "✗ "}</span>
                                {check.met ? "Met" : "Not met"}
                              </span>
                              {check.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

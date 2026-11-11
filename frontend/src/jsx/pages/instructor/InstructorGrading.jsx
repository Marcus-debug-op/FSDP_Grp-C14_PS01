import { useEffect, useState } from "react";
import { getGradingReadiness } from "../../../js/services/instructorService.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const STATUS_LABEL = {
  ready: "Ready",
  not_yet: "Not yet",
  top_belt: "Highest belt",
  no_profile: "No belt recorded",
};

// Grading readiness (FSDP-72): the instructor's students, each checked
// against the rules for their next belt.
export default function InstructorGrading() {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getGradingReadiness().then(setStudents).catch((err) => setError(err.message));
  }, []);

  const readyCount = students?.filter((s) => s.status === "ready").length ?? 0;
  const notYetCount = students?.filter((s) => s.status === "not_yet").length ?? 0;

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
              <ul className="stats roster-stats">
                <li className="stat-ready"><strong>{readyCount}</strong><span>Ready</span></li>
                <li className="stat-not-yet"><strong>{notYetCount}</strong><span>Not yet</span></li>
                <li><strong>{students.length}</strong><span>Students</span></li>
              </ul>

              <ul className="readiness-list">
                {students.map((student) => (
                  <li className={`readiness-row readiness-row-${student.status}`} key={student.studentId}>
                    <div className="readiness-student">
                      <strong>{student.fullName}</strong>
                      <span className="roster-belt">
                        {student.nextBelt ? `${student.currentBelt} to ${student.nextBelt}` : student.currentBelt || "No belt recorded"}
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

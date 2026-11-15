import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUpcomingGradings } from "../../../js/services/instructorService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const toDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const gradingDay = (ymd) => toDate(ymd).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" });
export const shortDate = (ymd) => toDate(ymd).toLocaleDateString("en-SG", { day: "numeric", month: "short" });

// Grading page: upcoming gradings with your applicants (FSDP-17). How ready
// each student is for their next belt is on the Students page (FSDP-72).
export default function InstructorGrading() {
  const [gradings, setGradings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getUpcomingGradings().then(setGradings).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container">
          <p className="eyebrow">Assessment and progression</p>
          <h1 className="roster-title">Grading</h1>
          <p className="lead">Upcoming gradings, and which of your students have applied.</p>

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
                  {grading.isExaminer && <span className="tag examiner-tag">You're the examiner</span>}
                  <h3 className="instructor-card-title">{gradingDay(grading.date)}</h3>
                  <dl className="details">
                    <div><dt>Time</dt><dd>{formatTime(grading.startTime)}</dd></div>
                    <div><dt>Dojo</dt><dd>{grading.centre}</dd></div>
                    {grading.isExaminer && (
                      <div>
                        <dt>Candidates</dt>
                        <dd>{grading.allApplicants} applied, {grading.allApproved} approved</dd>
                      </div>
                    )}
                    <div><dt>Applied</dt><dd>{grading.myApplicants} of your students</dd></div>
                    <div>
                      <dt>To approve</dt>
                      <dd className={grading.myAwaiting > 0 ? "awaiting-count" : undefined}>{grading.myAwaiting}</dd>
                    </div>
                  </dl>
                  <div className="offer-actions">
                    {grading.isExaminer && (
                      <Link to={`/instructor/gradings/${grading.id}/assess`} className="btn btn-primary btn-small">
                        Assess Candidates
                      </Link>
                    )}
                    <Link to={`/instructor/gradings/${grading.id}`} className="btn btn-outline btn-small">
                      {grading.isExaminer ? "View All Applicants" : "View Your Applicants"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="notice grading-students-link">
            Want to see who's ready for their next belt? <Link to="/instructor/students">Go to Students</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

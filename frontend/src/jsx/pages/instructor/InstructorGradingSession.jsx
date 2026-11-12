import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGradingApplicants } from "../../../js/services/instructorService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import ReadinessRow from "../../components/ReadinessRow.jsx";
import BackButton from "../../components/BackButton.jsx";
import { gradingDay, shortDate } from "./InstructorGrading.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const APPLICATION_LABEL = {
  pending: "Pending",
  approved: "Approved",
  passed: "Passed",
  failed: "Not passed",
};

// One grading session and the instructor's own students who applied for it
// (FSDP-17). View only: approving and recording results is done by the admin.
export default function InstructorGradingSession() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getGradingApplicants(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  const grading = data?.grading;
  const applicants = data?.applicants || [];
  const readyCount = applicants.filter((a) => a.status === "ready").length;

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container">
          <BackButton fallback="/instructor/grading" />

          {grading && (
            <>
              <p className="eyebrow">Grading applicants</p>
              <h1 className="roster-title">{gradingDay(grading.date)}</h1>
              <p className="lead">
                {grading.centre}, {formatTime(grading.startTime)}.{" "}
                {grading.registrationOpen
                  ? `Applications close on ${shortDate(grading.closesOn)}.`
                  : "Applications have closed."}
              </p>
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          {data && applicants.length === 0 && (
            <p className="notice">None of your students have applied for this grading yet.</p>
          )}

          {applicants.length > 0 && (
            <>
              <ul className="stats roster-stats">
                <li><strong>{applicants.length}</strong><span>Your applicants</span></li>
                <li className="stat-ready"><strong>{readyCount}</strong><span>Ready</span></li>
                <li className="stat-not-yet"><strong>{applicants.length - readyCount}</strong><span>Not yet</span></li>
              </ul>

              <ul className="readiness-list">
                {applicants.map((applicant) => (
                  <ReadinessRow student={applicant} key={applicant.studentId}>
                    <span className="roster-belt">
                      Applied for {applicant.targetBelt} on {shortDate(applicant.appliedOn)}:{" "}
                      {APPLICATION_LABEL[applicant.applicationStatus] || applicant.applicationStatus}
                    </span>
                  </ReadinessRow>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

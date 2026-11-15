import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGradingApplicants, setApplicantApproval } from "../../../js/services/instructorService.js";
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

// Approval for one applicant: approved (with undo), approvable, or why not.
function ApprovalBox({ applicant, canChange, busy, onChange }) {
  const { approval } = applicant;

  // The examiner sees other instructors' students too, but only their own
  // instructor can approve them.
  if (!applicant.isMine) {
    return approval
      ? <p className="approval approval-done"><span aria-hidden="true">✓ </span>Approved by {approval.by} on {shortDate(approval.on)}</p>
      : <p className="approval approval-blocked">Waiting for their own instructor to approve.</p>;
  }

  if (approval) {
    return (
      <div className="approval approval-done">
        <p><span aria-hidden="true">✓ </span>Approved by {approval.byYou ? "you" : approval.by} on {shortDate(approval.on)}</p>
        {approval.byYou && canChange && applicant.applicationStatus === "pending" && (
          <button type="button" className="approval-undo" disabled={busy} onClick={() => onChange(false)}>
            Undo approval
          </button>
        )}
      </div>
    );
  }

  if (!canChange) return <p className="approval approval-blocked">Not approved. This grading has taken place.</p>;

  if (applicant.status !== "ready") {
    return <p className="approval approval-blocked">Can't be approved until every requirement is met.</p>;
  }

  return (
    <button type="button" className="btn btn-primary btn-small approval-button" disabled={busy} onClick={() => onChange(true)}>
      {busy ? "Approving..." : "Approve for Grading"}
    </button>
  );
}

// One grading session and the instructor's own students who applied for it
// (FSDP-17). The instructor approves Ready students here, which sends the
// application on to the admin's grading page. Results are recorded by the admin.
export default function InstructorGradingSession() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    getGradingApplicants(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  async function changeApproval(studentId, approved) {
    setBusyId(studentId);
    setError("");
    try {
      const { applicant } = await setApplicantApproval(id, studentId, approved);
      // Keep the row's own fields (such as applicationId) and mark it as yours: only your own students can be approved.
      setData({
        ...data,
        applicants: data.applicants.map((a) => (a.studentId === studentId ? { ...a, ...applicant, isMine: true } : a)),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const grading = data?.grading;
  const applicants = data?.applicants || [];
  const approvedCount = applicants.filter((a) => a.approval).length;
  const isExaminer = Boolean(data?.isExaminer);

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container">
          <BackButton fallback="/instructor/grading" />

          {grading && (
            <>
              <p className="eyebrow">{isExaminer ? "You're the examiner · all applicants" : "Your applicants"}</p>
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
            <p className="notice">
              {isExaminer ? "Nobody has applied for this grading yet." : "None of your students have applied for this grading yet."}
            </p>
          )}

          {applicants.length > 0 && (
            <>
              <ul className="stats roster-stats">
                <li><strong>{applicants.length}</strong><span>{isExaminer ? "All applicants" : "Your applicants"}</span></li>
                <li className="stat-ready"><strong>{approvedCount}</strong><span>Approved</span></li>
                <li className="stat-not-yet">
                  <strong>{applicants.length - approvedCount}</strong>
                  <span>{isExaminer ? "Waiting for approval" : "Waiting for you"}</span>
                </li>
              </ul>
              {isExaminer && (
                <p className="trends-note">
                  As the examiner you can see everyone in this grading. You can only approve your own students.{" "}
                  <Link to={`/instructor/gradings/${grading.id}/assess`}>Go to Assess Candidates</Link>
                </p>
              )}

              <ul className="readiness-list">
                {applicants.map((applicant) => (
                  <ReadinessRow student={applicant} key={applicant.studentId}>
                    <span className="roster-belt">
                      Applied for {applicant.targetBelt} on {shortDate(applicant.appliedOn)}:{" "}
                      {APPLICATION_LABEL[applicant.applicationStatus] || applicant.applicationStatus}
                    </span>
                    {isExaminer && applicant.isMine && <span className="your-student-tag">Your student</span>}
                    <ApprovalBox
                      applicant={applicant}
                      canChange={grading.isUpcoming}
                      busy={busyId === applicant.studentId}
                      onChange={(approved) => changeApproval(applicant.studentId, approved)}
                    />
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

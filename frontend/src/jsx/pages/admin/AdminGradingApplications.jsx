import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGradingApplications } from "../../../js/services/adminService.js";
import { formatShortDate, formatTime } from "../../../js/utils/formatters.js";
import PageHeader from "../../components/admin/PageHeader.jsx";
import "../../../css/auth.css";
import "../../../css/admin.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "eligible", label: "Eligible" },
  { key: "not", label: "Not eligible" },
];

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  passed: "Passed",
  failed: "Failed",
};

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function sessionLead(session) {
  const parts = [session.centre.name, formatTime(session.startTime)];
  if (session.minBelt && session.maxBelt) {
    parts.push(
      session.minBelt.id === session.maxBelt.id
        ? `Grading for ${session.minBelt.name}`
        : `Grading for ${session.minBelt.name} to ${session.maxBelt.name}`
    );
  }
  parts.push(session.examiner ? `Examiner: ${session.examiner.name}` : "Examiner not decided");
  return parts.join(" · ");
}

function Eligibility({ application }) {
  if (application.eligible) {
    return <span className="grd-tag grd-eligible">Eligible</span>;
  }
  return (
    <>
      <span className="grd-tag grd-not">Not eligible</span>
      <ul className="grd-reasons">
        {application.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
    </>
  );
}

export default function AdminGradingApplications() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setData(null);
    setError("");
    getGradingApplications(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <Link to="/admin/grading" className="adm-link adm-back">Back to gradings</Link>
          <p className="form-error" role="alert">{error}</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section"><div className="container"><p>Loading...</p></div></section>
    );
  }

  const { session, applications, counts } = data;
  const shown = applications.filter((a) =>
    filter === "eligible" ? a.eligible : filter === "not" ? !a.eligible : true
  );

  return (
    <section className="section">
      <div className="container">
        <Link to="/admin/grading" className="adm-link adm-back">Back to gradings</Link>
        <PageHeader
          eyebrow="Grading · Applications"
          title={`${formatShortDate(session.gradingDate)} Grading`}
          lead={sessionLead(session)}
        />

        <ul className="stats admin-stats">
          <li><strong>{counts.total}</strong><span>Applications</span></li>
          <li><strong>{counts.eligible}</strong><span>Eligible</span></li>
          <li><strong>{counts.total - counts.eligible}</strong><span>Not eligible</span></li>
          <li>
            <strong>{session.registrationOpen ? formatShortDate(session.registrationClosesOn) : "Closed"}</strong>
            <span>{session.registrationOpen ? "Applications close" : "Applications"}</span>
          </li>
        </ul>

        {counts.awaitingInstructor > 0 && (
          <p className="notice admin-notice">
            {plural(counts.awaitingInstructor, "more application is", "more applications are")} waiting for an instructor to
            approve. They will show here once approved.
          </p>
        )}

        <div className="adm-toolbar">
          <div className="auth-toggle" role="group" aria-label="Applications to show">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {applications.length === 0 ? (
          <p className="adm-empty">No instructor-approved applications for this grading yet.</p>
        ) : shown.length === 0 ? (
          <p className="adm-empty">{filter === "eligible" ? "No eligible applications." : "Every application is eligible."}</p>
        ) : (
          <table className="att-table adm-table grd-table">
            <caption className="visually-hidden">Applications for this grading</caption>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Grading for</th>
                <th scope="col">Classes</th>
                <th scope="col">Time at belt</th>
                <th scope="col">Instructor approval</th>
                <th scope="col">Eligibility</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id}>
                  <td data-label="Student">
                    <Link to={`/admin/students/${a.student.id}`} className="adm-link att-name">{a.student.name}</Link>
                    <span className="att-sub">Applied {formatShortDate(a.appliedOn)} · {STATUS_LABEL[a.status] || a.status}</span>
                    {a.ladder === "children" && (
                      <span className="att-sub">
                        {a.ageOnGradingDate === null ? "Age not recorded" : `Age ${a.ageOnGradingDate} on grading day`}
                      </span>
                    )}
                  </td>
                  <td data-label="Grading for">
                    {a.targetBelt}
                    <span className="att-sub">From {a.currentBelt || "no belt"}</span>
                  </td>
                  <td data-label="Classes">
                    {a.classes.need === 0
                      ? `${plural(a.classes.have, "class", "classes")}, no minimum`
                      : `${a.classes.have} of ${a.classes.need}`}
                  </td>
                  <td data-label="Time at belt">
                    {a.months.need === 0
                      ? `${plural(a.months.have, "month", "months")}, no minimum`
                      : `${a.months.have} of ${plural(a.months.need, "month", "months")}`}
                  </td>
                  <td data-label="Instructor approval">
                    {a.instructorApproval.by}
                    <span className="att-sub">{formatShortDate(a.instructorApproval.on)}</span>
                  </td>
                  <td data-label="Eligibility"><Eligibility application={a} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

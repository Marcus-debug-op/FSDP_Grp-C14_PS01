import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStudent } from "../../../js/services/adminService.js";
import { formatShortDate, formatTime, todayString } from "../../../js/utils/formatters.js";
import "../../../css/auth.css";
import "../../../css/admin.css";

const ATTENDANCE_LABEL = { present: "Present", late: "Late", absent: "Absent", excused: "Excused" };
const GRADING_LABEL = {
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

function Progress({ label, value, target, unit }) {
  const done = target === 0 || value >= target;
  const width = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 100;
  return (
    <div className="adm-progress-row">
      <div className="adm-progress-text">
        <span>{label}</span>
        <span>{target === 0 ? `${plural(value, unit.one, unit.many)}, no minimum` : `${value} of ${plural(target, unit.one, unit.many)}`}</span>
      </div>
      <div className="adm-progress" aria-hidden="true"><span style={{ width: `${width}%` }} /></div>
      <span className={done ? "adm-progress-note" : "adm-progress-note adm-muted"}>
        {done ? "Requirement met" : `${plural(target - value, `more ${unit.one}`, `more ${unit.many}`)} needed`}
      </span>
    </div>
  );
}

function NextBelt({ student }) {
  if (!student.belt) return <p className="adm-muted">No belt has been set for this student yet.</p>;
  if (!student.nextBelt) return <p className="adm-muted">{student.belt.name} is the highest belt on record.</p>;
  const { belt, nextBelt } = student;
  const ready = belt.monthsAtBelt >= nextBelt.minMonths && belt.classesAtBelt >= nextBelt.minClasses;
  return (
    <>
      <p className="adm-next-belt">
        Next belt: <strong>{nextBelt.name}</strong>
      </p>
      <Progress label="Time at current belt" value={belt.monthsAtBelt} target={nextBelt.minMonths} unit={{ one: "month", many: "months" }} />
      <Progress label="Classes since last grading" value={belt.classesAtBelt} target={nextBelt.minClasses} unit={{ one: "class", many: "classes" }} />
      <p className={ready ? "adm-ready" : "adm-muted"}>
        {ready
          ? "Meets the time and class requirements. Fee, membership and technique checks still apply."
          : "Not yet ready to grade."}
      </p>
    </>
  );
}

function Membership({ memberships }) {
  if (memberships.length === 0) return <p className="adm-muted">No membership on record.</p>;
  const current = memberships.find((m) => m.isCurrent);
  return (
    <>
      {current ? (
        <p className="adm-next-belt">
          <strong>{current.planName}</strong>, active until {formatShortDate(current.endDate)}
        </p>
      ) : (
        <p className="adm-next-belt">No active membership. Last one ended {formatShortDate(memberships[0].endDate)}.</p>
      )}
      <ul className="adm-history">
        {memberships.map((m) => (
          <li key={m.id}>
            <span>{m.planName}</span>
            <span className="adm-muted">
              {formatShortDate(m.startDate)} to {formatShortDate(m.endDate)}
              {m.isCurrent ? "" : ` · ${m.status === "active" ? "ended" : m.status}`}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function AdminStudentProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    getStudent(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <Link to="/admin/students" className="adm-link adm-back">Back to students</Link>
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

  const { student, attendanceSummary: summary, recentAttendance, memberships, gradings } = data;
  const contact = [student.email, student.phone].filter(Boolean).join(" · ");
  const attendanceLink = `/admin/attendance?from=${todayString(-90)}&to=${todayString()}&student=${encodeURIComponent(student.email)}`;

  return (
    <section className="section">
      <div className="container">
        <Link to="/admin/students" className="adm-link adm-back">Back to students</Link>
        <p className="eyebrow">Student record</p>
        <h1>{student.fullName}</h1>
        <p className="lead">
          {contact}
          <br />
          {student.centreName ? `Home dojo: ${student.centreName}` : "No home dojo set"} · Joined {formatShortDate(student.joinedOn)}
        </p>

        <ul className="stats admin-stats">
          <li><strong>{student.belt ? student.belt.name : "-"}</strong><span>Current belt</span></li>
          <li><strong>{student.credits}</strong><span>Credits left</span></li>
          <li><strong>{summary.attended}</strong><span>Classes, last 90 days</span></li>
          <li><strong>{summary.rate === null ? "-" : `${summary.rate}%`}</strong><span>Attendance, last 90 days</span></li>
        </ul>

        <div className="adm-grid">
          <section className="adm-panel adm-box">
            <h2 className="adm-heading">Belt progress</h2>
            {student.belt && <p className="adm-muted adm-small">Awarded {formatShortDate(student.belt.awardedOn)}</p>}
            <NextBelt student={student} />
          </section>
          <section className="adm-panel adm-box">
            <h2 className="adm-heading">Membership</h2>
            <Membership memberships={memberships} />
          </section>
        </div>

        <section className="adm-section">
          <h2 className="adm-heading">Recent classes</h2>
          {recentAttendance.length === 0 ? (
            <p className="adm-muted">No attendance recorded yet.</p>
          ) : (
            <>
              <table className="att-table adm-table">
                <caption className="visually-hidden">Recent classes for {student.fullName}</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Class</th>
                    <th scope="col">Dojo</th>
                    <th scope="col">Status</th>
                    <th scope="col">How</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map((a) => (
                    <tr key={a.sessionId}>
                      <td data-label="Date">{formatShortDate(a.date)}, {formatTime(a.startTime)}</td>
                      <td data-label="Class">{a.title}</td>
                      <td data-label="Dojo">{a.centreName}</td>
                      <td data-label="Status"><span className={`att-status att-${a.status}`}>{ATTENDANCE_LABEL[a.status]}</span></td>
                      <td data-label="How">{a.method === "qr" ? "QR check-in" : "Marked by instructor"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="adm-more"><Link to={attendanceLink} className="adm-link">See all attendance for the last 90 days</Link></p>
            </>
          )}
        </section>

        <section className="adm-section">
          <h2 className="adm-heading">Grading applications</h2>
          {gradings.length === 0 ? (
            <p className="adm-muted">No grading applications yet.</p>
          ) : (
            <table className="att-table adm-table">
              <caption className="visually-hidden">Grading applications for {student.fullName}</caption>
              <thead>
                <tr>
                  <th scope="col">Grading date</th>
                  <th scope="col">Dojo</th>
                  <th scope="col">For belt</th>
                  <th scope="col">Applied</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {gradings.map((g) => (
                  <tr key={g.id}>
                    <td data-label="Grading date">{formatShortDate(g.gradingDate)}</td>
                    <td data-label="Dojo">{g.centreName}</td>
                    <td data-label="For belt">{g.targetBelt}</td>
                    <td data-label="Applied">{formatShortDate(g.appliedOn)}</td>
                    <td data-label="Status">{GRADING_LABEL[g.status] || g.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </section>
  );
}

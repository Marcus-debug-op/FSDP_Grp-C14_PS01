import { Fragment, useEffect, useState } from "react";
import { getAttendance, getCentres, getInstructors, getSessionAttendance } from "../../../js/services/adminService.js";
import { formatDayHeading, formatTime, todayString } from "../../../js/utils/formatters.js";
import "../../../css/auth.css";
import "../../../css/admin.css";

const STATUS_LABEL = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
  not_checked_in: "Not checked in",
};

function formatDate(value) {
  const { weekday, day } = formatDayHeading(value);
  return `${weekday} ${day}`;
}

function formatCheckIn(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit" });
}

function sessionSummary(session, today) {
  if (session.status === "cancelled") return "Cancelled";
  const recorded = session.present + session.late + session.absent + session.excused;
  if (recorded === 0) {
    if (session.date >= today) return session.booked ? `${session.booked} booked` : "No bookings yet";
    return session.booked ? `${session.booked} booked, not taken yet` : "No students";
  }
  const parts = [`${session.present} present`];
  if (session.late) parts.push(`${session.late} late`);
  if (session.absent) parts.push(`${session.absent} absent`);
  if (session.excused) parts.push(`${session.excused} excused`);
  return parts.join(" · ");
}

function SessionStudents({ sessionId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSessionAttendance(sessionId).then(setData).catch((err) => setError(err.message));
  }, [sessionId]);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!data) return <p className="att-loading">Loading students...</p>;
  if (data.students.length === 0) return <p className="att-loading">No students booked or checked in for this class.</p>;

  return (
    <table className="att-table att-students">
      <caption className="visually-hidden">Students in {data.session.title}</caption>
      <thead>
        <tr>
          <th scope="col">Student</th>
          <th scope="col">Belt</th>
          <th scope="col">Status</th>
          <th scope="col">How</th>
          <th scope="col">Time</th>
        </tr>
      </thead>
      <tbody>
        {data.students.map((s) => (
          <tr key={s.id}>
            <td data-label="Student">
              <span className="att-name">{s.fullName}</span>
              <span className="att-sub">{s.email}</span>
            </td>
            <td data-label="Belt">{s.beltName || "Not set"}</td>
            <td data-label="Status"><span className={`att-status att-${s.status}`}>{STATUS_LABEL[s.status]}</span></td>
            <td data-label="How">
              {s.method === "qr" && "QR check-in"}
              {s.method === "manual" && `Marked by ${s.recordedByName || "instructor"}`}
              {!s.method && (s.booked ? "Booked" : "")}
            </td>
            <td data-label="Time">{s.status === "present" || s.status === "late" ? formatCheckIn(s.checkedInAt) : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminAttendance() {
  const today = todayString();
  const [from, setFrom] = useState(todayString(-6));
  const [to, setTo] = useState(today);
  const [centreId, setCentreId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [student, setStudent] = useState("");
  const [centres, setCentres] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    Promise.all([getCentres(), getInstructors()])
      .then(([centreList, instructorList]) => {
        setCentres(centreList);
        setInstructors(instructorList);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setStudent(studentInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [studentInput]);

  useEffect(() => {
    if (!from || !to) return undefined;
    if (to < from) {
      setError("The end date must be on or after the start date.");
      return undefined;
    }
    let active = true;
    setError("");
    setOpenId(null);
    getAttendance({ from, to, centreId, instructorId, student })
      .then((data) => active && setSessions(data.sessions))
      .catch((err) => {
        if (!active) return;
        setSessions([]);
        setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [from, to, centreId, instructorId, student]);

  const running = (sessions || []).filter((s) => s.status !== "cancelled");
  const totals = running.reduce(
    (sum, s) => ({ present: sum.present + s.present, late: sum.late + s.late, absent: sum.absent + s.absent, excused: sum.excused + s.excused }),
    { present: 0, late: 0, absent: 0, excused: 0 }
  );
  const marked = totals.present + totals.late + totals.absent;
  const rate = marked ? Math.round(((totals.present + totals.late) / marked) * 100) : null;

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Attendance</p>
        <h1>Attendance</h1>
        <p className="lead">Who came to each class across all dojos. Open a class to see each student and how they checked in.</p>

        <div className="filters">
          <label>
            From
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label>
            Dojo
            <select value={centreId} onChange={(e) => setCentreId(e.target.value)}>
              <option value="">All dojos</option>
              {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            Instructor
            <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
              <option value="">All instructors</option>
              {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
            </select>
          </label>
          <label>
            Student
            <input type="search" value={studentInput} maxLength={100} placeholder="Name or email"
                   onChange={(e) => setStudentInput(e.target.value)} />
          </label>
        </div>

        {sessions && (
          <ul className="stats admin-stats att-stats" aria-label="Totals for these dates">
            <li><strong>{running.length}</strong><span>Classes</span></li>
            <li><strong>{totals.present}</strong><span>Present</span></li>
            <li><strong>{totals.late}</strong><span>Late</span></li>
            <li><strong>{totals.absent}</strong><span>Absent</span></li>
            <li><strong>{rate === null ? "-" : `${rate}%`}</strong><span>Attendance rate</span></li>
          </ul>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        {!sessions && !error && <p>Loading...</p>}
        {sessions && sessions.length === 0 && !error && (
          <p className="notice admin-notice">No classes match these filters. Try a wider date range.</p>
        )}

        {sessions && sessions.length > 0 && (
          <table className="att-table att-sessions">
            <caption className="visually-hidden">Classes from {from} to {to}</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Class</th>
                <th scope="col">Dojo</th>
                <th scope="col">Instructor</th>
                <th scope="col">Attendance</th>
                <th scope="col"><span className="visually-hidden">Students</span></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const isOpen = openId === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr className={s.status === "cancelled" ? "att-row-cancelled" : undefined}>
                      <td data-label="When">
                        <span className="att-name">{formatDate(s.date)}</span>
                        <span className="att-sub">{formatTime(s.startTime)} - {formatTime(s.endTime)}</span>
                      </td>
                      <td data-label="Class">{s.title}</td>
                      <td data-label="Dojo">{s.centreName}</td>
                      <td data-label="Instructor">{s.instructorName}</td>
                      <td data-label="Attendance">{sessionSummary(s, today)}</td>
                      <td className="att-action">
                        <button type="button" className="link-button" aria-expanded={isOpen}
                                aria-controls={`att-detail-${s.id}`} onClick={() => setOpenId(isOpen ? null : s.id)}>
                          {isOpen ? "Hide students" : "Students"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="att-detail-row" id={`att-detail-${s.id}`}>
                        <td colSpan={6}><SessionStudents sessionId={s.id} /></td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

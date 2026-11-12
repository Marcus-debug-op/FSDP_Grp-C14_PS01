import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getDashboard } from "../../../js/services/adminService.js";
import { formatDayHeading, formatTime } from "../../../js/utils/formatters.js";
import BarChart from "../../components/admin/BarChart.jsx";
import PageHeader from "../../components/admin/PageHeader.jsx";
import "../../../css/auth.css";
import "../../../css/admin.css";

const VIEWS = [
  { key: "daily", label: "Daily" },
  { key: "monthly", label: "Monthly" },
];

function monthName(period, style = "short") {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-SG", { month: style, year: style === "long" ? "numeric" : undefined });
}

function dayName(period) {
  const { weekday, day } = formatDayHeading(period);
  return `${weekday} ${day}`;
}

function rateText(rate) {
  return rate === null || rate === undefined ? "-" : `${rate}%`;
}

function compareText(current, previous, label) {
  if (current === null || previous === null || previous === undefined) return `No data for ${label}`;
  const diff = current - previous;
  if (diff === 0) return `Same as ${label}`;
  return `${Math.abs(diff)} points ${diff > 0 ? "higher" : "lower"} than ${label}`;
}

function describeBar(d) {
  if (!d.sessions) return "No classes";
  const parts = [`${d.attended} check-in${d.attended === 1 ? "" : "s"}`];
  if (d.absent) parts.push(`${d.absent} absent`);
  parts.push(`${d.sessions} class${d.sessions === 1 ? "" : "es"}`);
  return parts.join(" · ");
}

function DailyStats({ data }) {
  return (
    <ul className="stats admin-stats">
      <li><strong>{data.totals.classesScheduled}</strong><span>Classes today</span></li>
      <li><strong>{data.totals.attended}</strong><span>Checked in today</span></li>
      <li><strong>{data.totals.absent}</strong><span>Absent today</span></li>
      <li>
        <strong>{rateText(data.rolling.rate)}</strong>
        <span>Attendance, last 7 days</span>
      </li>
    </ul>
  );
}

function MonthlyStats({ data }) {
  return (
    <>
      <ul className="stats admin-stats">
        <li><strong>{data.totals.sessions}</strong><span>Classes held</span></li>
        <li><strong>{data.totals.attended}</strong><span>Check-ins</span></li>
        <li><strong>{data.totals.students}</strong><span>Students who trained</span></li>
        <li><strong>{rateText(data.totals.rate)}</strong><span>Attendance rate</span></li>
      </ul>
      <p className="adm-compare">Attendance rate: {compareText(data.totals.rate, data.previous.rate, data.previous.label)}.</p>
    </>
  );
}

function CentreTable({ centres, caption }) {
  if (centres.length === 0) return <p className="adm-empty">No attendance recorded for this period yet.</p>;
  const shown = centres.slice(0, 8);
  return (
    <>
      <table className="att-table adm-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Dojo</th>
            <th scope="col" className="num">Classes</th>
            <th scope="col" className="num">Check-ins</th>
            <th scope="col" className="num">Absent</th>
            <th scope="col" className="num">Rate</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((c) => (
            <tr key={c.centreId}>
              <td data-label="Dojo">
                <Link to={`/admin/schedule?dojo=${c.centreId}`} className="adm-link">{c.centreName}</Link>
              </td>
              <td data-label="Classes" className="num">{c.sessions}</td>
              <td data-label="Check-ins" className="num">{c.attended}</td>
              <td data-label="Absent" className="num">{c.absent}</td>
              <td data-label="Rate" className="num">{rateText(c.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {centres.length > shown.length && (
        <p className="adm-more">And {centres.length - shown.length} more dojos with fewer check-ins.</p>
      )}
    </>
  );
}

function TodayClasses({ classes, today }) {
  if (classes.length === 0) return <p className="adm-empty">No classes are scheduled today.</p>;
  return (
    <>
      <table className="att-table adm-table">
        <caption className="visually-hidden">Classes today</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Class</th>
            <th scope="col">Dojo</th>
            <th scope="col">Instructor</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => (
            <tr key={c.id} className={c.status === "cancelled" ? "att-row-cancelled" : undefined}>
              <td data-label="Time">{formatTime(c.startTime)} - {formatTime(c.endTime)}</td>
              <td data-label="Class">{c.title}</td>
              <td data-label="Dojo">{c.centreName}</td>
              <td data-label="Instructor">{c.instructorName}</td>
              <td data-label="Status">
                {c.status === "cancelled"
                  ? "Cancelled"
                  : c.attended || c.absent
                    ? `${c.attended} checked in${c.absent ? ` · ${c.absent} absent` : ""}`
                    : c.booked
                      ? `${c.booked} booked`
                      : "No bookings yet"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="adm-more">
        <Link to={`/admin/attendance?from=${today}&to=${today}`} className="adm-link">See today's attendance by student</Link>
      </p>
    </>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState("daily");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getDashboard(view)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [view]);

  const ready = data && data.view === view;
  const isDaily = view === "daily";

  return (
    <section className="section">
      <div className="container">
        <PageHeader eyebrow="Overview · All dojos" title="Admin Dashboard" lead="How classes and attendance are going across every dojo." />

        <div className="adm-toolbar">
          <div className="auth-toggle" role="group" aria-label="Dashboard view">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => setView(v.key)}>
                {v.label}
              </button>
            ))}
          </div>
          {ready && (
            <p className="admin-week">
              {isDaily ? `Today, ${dayName(data.today)}` : monthName(data.period.from, "long")}
            </p>
          )}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {!ready && !error && <p>{loading ? "Loading..." : ""}</p>}

        {ready && (
          <>
            {isDaily ? <DailyStats data={data} /> : <MonthlyStats data={data} />}

            <div className="adm-grid">
              <section className="adm-panel">
                <BarChart
                  title={isDaily ? "Check-ins, last 14 days" : "Check-ins, last 6 months"}
                  data={data.series}
                  valueKey="attended"
                  unit="Check-ins"
                  formatLabel={(d) => (isDaily ? formatDayHeading(d.period).day.split(" ")[0] : monthName(d.period))}
                  formatDetail={(d) => (isDaily ? dayName(d.period) : monthName(d.period, "long"))}
                  describe={describeBar}
                />
              </section>

              <section className="adm-panel">
                <h2 className="adm-heading">{isDaily ? "Busiest dojos, last 7 days" : "Busiest dojos this month"}</h2>
                <CentreTable centres={data.centres} caption={isDaily ? "Dojo attendance, last 7 days" : "Dojo attendance this month"} />
              </section>
            </div>

            {isDaily && (
              <section className="adm-section">
                <h2 className="adm-heading">Today's classes</h2>
                <TodayClasses classes={data.classes} today={data.today} />
              </section>
            )}
          </>
        )}

        <div className="grid admin-cards">
          <article className="card">
            <span className="tag">Timetable</span>
            <h3>Class Timetable</h3>
            <p className="admin-card-text">Every class for the week, by day. Choose a dojo or an instructor to narrow it down.</p>
            <Link to="/admin/schedule" className="btn btn-outline btn-small">Open Timetable</Link>
          </article>
          <article className="card">
            <span className="tag">Attendance</span>
            <h3>Attendance</h3>
            <p className="admin-card-text">See who came to each class, who was late or absent, and how each check-in was recorded.</p>
            <Link to="/admin/attendance" className="btn btn-outline btn-small">View Attendance</Link>
          </article>
          <article className="card">
            <span className="tag">Students</span>
            <h3>Student Records</h3>
            <p className="admin-card-text">Search any student to see their belt progress, membership, credits and recent classes.</p>
            <Link to="/admin/students" className="btn btn-outline btn-small">Find a Student</Link>
          </article>
          <article className="card">
            <span className="tag">Scheduling</span>
            <h3>Private Lessons</h3>
            <p className="admin-card-text">Schedule lesson requests with an instructor who is free, or book a new one for a student.</p>
            <Link to="/admin/private-lessons" className="btn btn-outline btn-small">Open Private Lessons</Link>
          </article>
          <article className="card">
            <span className="tag">Setup</span>
            <h3>Dojos</h3>
            <p className="admin-card-text">See every dojo, how many weekly classes it runs, and open its timetable.</p>
            <Link to="/admin/dojos" className="btn btn-outline btn-small">Manage Dojos</Link>
          </article>
        </div>
      </div>
    </section>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAttendanceTrends } from "../../js/services/instructorService.js";
import { formatTime } from "../../js/utils/formatters.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

// "2026-11-06" -> "6 Nov"
function dayMonth(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// "Civil Service Club (Bukit Batok) Dojo" -> "Civil Service Club (Bukit Batok)"
const shortDojo = (name) => name.replace(/\s+Dojo$/i, "");

// Headline number with a small line underneath.
function StatCard({ label, value, sub, warn = false }) {
  return (
    <li className="stat-card">
      <span className="stat-card-label">{label}</span>
      <strong className="stat-card-value">{value}</strong>
      {sub && <span className={`stat-card-sub${warn ? " is-warning" : ""}`}>{sub}</span>}
    </li>
  );
}

function rateChange({ recentRate, previousRate }) {
  if (recentRate === null || previousRate === null) return null;
  const diff = recentRate - previousRate;
  if (diff === 0) return { text: `Same as the 4 weeks before (${previousRate}%)`, warn: false };
  return {
    text: `${diff < 0 ? "▼" : "▲"} ${Math.abs(diff)} pts from ${previousRate}%`,
    warn: diff < 0,
  };
}

// A horizontal bar. `tip` shows on hover or keyboard focus, and is what a
// screen reader reads.
function HBar({ label, sub, share, value, tip }) {
  return (
    <li className="hbar" tabIndex={0} aria-label={tip} data-tip={tip}>
      <span className="hbar-label">
        {label}
        {sub && <span className="hbar-sub">{sub}</span>}
      </span>
      <span className="hbar-track" aria-hidden="true"><span style={{ width: `${Math.round(share * 100)}%` }}></span></span>
      <span className="hbar-value" aria-hidden="true">{value}</span>
    </li>
  );
}

// FSDP-71 / FSDP-74: the instructor's Analytics page. Stat cards, attendance
// each week, turnout by class, busiest days, students' belts, and the students
// whose attendance has dropped.
export default function AttendanceTrends() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAttendanceTrends().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!data) return <p className="trends-loading">Loading analytics...</p>;

  const { weeks, summary, stats, byClass, byWeekday, belts, checkOn } = data;
  const change = rateChange(summary);
  const busiest = Math.max(1, ...byWeekday.map((d) => d.attended));
  const mostStudents = Math.max(1, ...belts.map((b) => b.students));

  return (
    <>
      <ul className="stat-cards">
        <StatCard
          label="Attendance, last 4 weeks"
          value={summary.recentRate === null ? "–" : `${summary.recentRate}%`}
          sub={change?.text}
          warn={change?.warn}
        />
        <StatCard label="Classes taught, last 4 weeks" value={stats.classesTaught} sub={`at ${count(stats.dojosTaught, "dojo")}`} />
        <StatCard label="Coming up, next 7 days" value={count(stats.upcomingClasses, "class", "classes")} sub={`${count(stats.upcomingBooked, "student")} booked`} />
        <StatCard label="Your students" value={stats.students} sub="trained or booked in 3 months" />
        <StatCard
          label="Ready for their next belt"
          value={stats.ready}
          sub={stats.droppingOff ? `${stats.droppingOff} dropping off` : "Nobody dropping off"}
          warn={stats.droppingOff > 0}
        />
        <StatCard
          label="Checked in by QR"
          value={stats.qrRate === null ? "–" : `${stats.qrRate}%`}
          sub={`${stats.byQr} of ${count(stats.attended, "student")} who came`}
        />
      </ul>

      <section className="analytics-panel">
        <h2 className="trends-heading">Attendance each week</h2>
        <ol className="trend-chart">
          {weeks.map((week) => {
            const tip = week.rate === null
              ? `Week of ${dayMonth(week.from)}: no booked students`
              : `Week of ${dayMonth(week.from)} to ${dayMonth(week.to)}: ${week.attended} of ${week.expected} came, ${count(week.classes, "class", "classes")}`;
            return (
              <li key={week.from} className="trend-week" tabIndex={0} aria-label={tip} data-tip={tip}>
                <span className="trend-value" aria-hidden="true">{week.rate === null ? "–" : `${week.rate}%`}</span>
                <span className="trend-track" aria-hidden="true">
                  <span className="trend-bar" style={{ height: `${week.rate ?? 0}%` }}></span>
                </span>
                <span className="trend-label" aria-hidden="true">{dayMonth(week.from)}</span>
              </li>
            );
          })}
        </ol>
        <p className="trends-note">Each bar is one week, up to yesterday: students who came (present or late) out of everyone booked.</p>
      </section>

      <div className="analytics-pair">
        <section className="analytics-panel">
          <h2 className="trends-heading">Turnout by class</h2>
          <p className="trends-note">Last 4 weeks: students who came out of everyone booked.</p>
          {byClass.length === 0 ? (
            <p className="notice">No classes in the last 4 weeks.</p>
          ) : (
            <ul className="hbar-list">
              {byClass.map((cls) => (
                <HBar
                  key={cls.classId}
                  label={shortDojo(cls.centre)}
                  sub={`${cls.title} · ${DAYS[cls.dayOfWeek]} ${formatTime(cls.startTime)}`}
                  share={(cls.rate ?? 0) / 100}
                  value={cls.rate === null ? "–" : `${cls.rate}%`}
                  tip={`${cls.title} at ${cls.centre}, ${DAY_NAMES[cls.dayOfWeek]} ${formatTime(cls.startTime)}: ${cls.attended} of ${cls.expected} came (${cls.rate ?? 0}%)`}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="analytics-panel">
          <h2 className="trends-heading">Busiest days</h2>
          <p className="trends-note">Last 4 weeks: students who came, by day of the week.</p>
          <ol className="day-chart">
            {byWeekday.map((day) => {
              const tip = `${DAY_NAMES[day.day]}: ${count(day.attended, "student")} came`;
              return (
                <li key={day.day} className={day.attended === busiest ? "is-busiest" : undefined} tabIndex={0} aria-label={tip} data-tip={tip}>
                  <span className="trend-value" aria-hidden="true">{day.attended}</span>
                  <span className="day-track" aria-hidden="true">
                    <span style={{ height: `${Math.round((day.attended / busiest) * 100)}%` }}></span>
                  </span>
                  <span className="trend-label" aria-hidden="true">{DAYS[day.day]}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className="analytics-pair">
        <section className="analytics-panel">
          <h2 className="trends-heading">Your students' belts</h2>
          <p className="trends-note">The belts your students hold now.</p>
          {belts.length === 0 ? (
            <p className="notice">No students yet.</p>
          ) : (
            <ul className="hbar-list">
              {belts.map((b) => (
                <HBar
                  key={b.belt}
                  label={b.belt}
                  share={b.students / mostStudents}
                  value={b.students}
                  tip={`${b.belt}: ${count(b.students, "student")}`}
                />
              ))}
            </ul>
          )}
          <Link to="/instructor/students" className="analytics-link">See who's ready for grading</Link>
        </section>

        <section className="analytics-panel">
          <h2 className="trends-heading">Students to check on</h2>
          {checkOn.length === 0 ? (
            <p className="notice">No one's attendance has dropped. Everyone is coming about as often as before.</p>
          ) : (
            <>
              <p className="trends-note">Came to half as many classes or fewer in the last 4 weeks than in the 4 weeks before.</p>
              <ul className="check-on-list">
                {checkOn.map((student) => (
                  <li key={student.studentId} className="check-on-row">
                    <div>
                      <strong><Link to={`/instructor/students/${student.studentId}`}>{student.fullName}</Link></strong>
                      {student.homeDojo && <span className="check-on-dojo">{student.homeDojo}</span>}
                    </div>
                    <p className="check-on-change">
                      {student.previous} <span aria-hidden="true">→</span><span className="visually-hidden">down to</span> {student.recent} classes
                    </p>
                    <p className="check-on-last">
                      {student.lastAttended ? `Last came ${dayMonth(student.lastAttended)}` : "Hasn't come to a class yet"}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { getAttendanceTrends } from "../../js/services/instructorService.js";

// "2026-11-06" -> "6 Nov"
function dayMonth(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "es"}`;
}

// One sentence comparing the last 4 weeks with the 4 before.
function summaryText({ recentRate, previousRate }) {
  if (recentRate === null) return "No students were booked into your classes in the last 4 weeks.";
  if (previousRate === null) return `${recentRate}% of booked students came to your classes in the last 4 weeks.`;
  const change = recentRate === previousRate
    ? "the same as"
    : `${recentRate > previousRate ? "up" : "down"} from ${previousRate}%`;
  return `${recentRate}% of booked students came to your classes in the last 4 weeks, ${change} the 4 weeks before.`;
}

// FSDP-71: attendance at the instructor's classes over the last 8 weeks, and
// the students whose attendance has dropped. Shown on the Analytics page.
export default function AttendanceTrends() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAttendanceTrends().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!data) return <p className="trends-loading">Loading attendance...</p>;

  const { weeks, summary, checkOn } = data;

  return (
    <>
      <p className="trends-summary">{summaryText(summary)}</p>

      <h2 className="trends-heading">Attendance each week</h2>
      <ol className="trend-chart">
        {weeks.map((week) => (
          <li key={week.from} className="trend-week">
            <span className="trend-value">{week.rate === null ? "–" : `${week.rate}%`}</span>
            <span className="trend-track" aria-hidden="true">
              <span className="trend-bar" style={{ height: `${week.rate ?? 0}%` }}></span>
            </span>
            <span className="trend-label">{dayMonth(week.from)}</span>
            <span className="visually-hidden">
              {week.rate === null
                ? `Week of ${dayMonth(week.from)}: no booked students.`
                : `Week of ${dayMonth(week.from)} to ${dayMonth(week.to)}: ${week.attended} of ${week.expected} came, ${plural(week.classes, "class")}.`}
            </span>
          </li>
        ))}
      </ol>
      <p className="trends-note">Each bar is one week, up to yesterday: students who came (present or late) out of everyone booked.</p>

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
                  <strong>{student.fullName}</strong>
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
    </>
  );
}

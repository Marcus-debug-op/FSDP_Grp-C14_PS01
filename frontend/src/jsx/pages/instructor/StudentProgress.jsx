import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getStudentProgress } from "../../../js/services/instructorService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import BackButton from "../../components/BackButton.jsx";
import ReadinessRow from "../../components/ReadinessRow.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const LESSON_STATUS = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
  not_marked: "Not marked",
};

// "2026-11-06" -> "Fri 6 Nov"
function shortDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" });
}

function longDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });
}

// Sentence comparing the last 4 weeks with the 4 before.
function trendText({ recent, previous, droppedOff }) {
  const classes = (n) => `${n} class${n === 1 ? "" : "es"}`;
  if (droppedOff) return `Came to ${classes(recent)} in the last 4 weeks, down from ${classes(previous)}. Worth a check-in.`;
  if (recent > previous) return `Came to ${classes(recent)} in the last 4 weeks, up from ${classes(previous)}.`;
  return `Came to ${classes(recent)} in the last 4 weeks, and ${classes(previous)} the 4 weeks before.`;
}

// FSDP-21: one student's training progress. Opened from a student's name on
// the Grading and Analytics pages.
export default function StudentProgress() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    getStudentProgress(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  const student = data?.student;

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container progress-page">
          <BackButton />

          {error && <p className="form-error" role="alert">{error}</p>}
          {!data && !error && <p className="trends-loading">Loading student...</p>}

          {student && (
            <>
              <p className="eyebrow">Training progress</p>
              <h1 className="roster-title">{student.fullName}</h1>
              <p className="lead">{student.homeDojo ? `Home dojo: ${student.homeDojo}` : "No home dojo recorded"}</p>

              <ul className="stats roster-stats">
                <li><strong>{student.currentBelt || "None"}</strong><span>Current belt</span></li>
                <li>
                  <strong>{student.monthsAtBelt ?? "–"}</strong>
                  <span>Months at belt</span>
                </li>
                <li><strong>{student.nextBelt || "–"}</strong><span>Next belt</span></li>
              </ul>
              {student.beltAwardedOn && (
                <p className="trends-note">{student.currentBelt} awarded on {longDay(student.beltAwardedOn)}.</p>
              )}

              <h2 className="trends-heading">Ready for {student.nextBelt || "the next belt"}?</h2>
              <ul className="readiness-list">
                <ReadinessRow student={student} linkName={false} />
              </ul>

              <h2 className="trends-heading">How often they're coming</h2>
              <p className={`trends-summary${data.attendance.droppedOff ? " is-warning" : ""}`}>
                {trendText(data.attendance)}
              </p>
              <p className="trends-note">
                {data.attendance.lastAttended
                  ? `Last came to a class on ${longDay(data.attendance.lastAttended)} (any dojo).`
                  : "Hasn't come to a class yet."}
              </p>

              <h2 className="trends-heading">Recent lessons with you</h2>
              {data.recentLessons.length === 0 ? (
                <p className="notice">No past lessons with you yet.</p>
              ) : (
                <ul className="check-on-list lesson-history">
                  {data.recentLessons.map((lesson) => (
                    <li key={`${lesson.kind}-${lesson.id}`} className="lesson-history-row">
                      <div>
                        <strong>{lesson.title}</strong>
                        <span className="check-on-dojo">
                          {shortDay(lesson.date)}, {formatTime(lesson.startTime)} · {lesson.centre}
                        </span>
                      </div>
                      <span className={`lesson-status lesson-status-${lesson.status}`}>
                        {LESSON_STATUS[lesson.status] || lesson.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

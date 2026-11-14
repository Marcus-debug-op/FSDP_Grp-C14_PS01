import { useState } from "react";
import { markPrivateLesson } from "../../js/services/instructorService.js";
import { formatTime } from "../../js/utils/formatters.js";

const STATUS_LABEL = { scheduled: "Not marked yet", completed: "Present", no_show: "Absent" };
// The lesson's status for each button, and back.
const BUTTONS = [
  { choice: "present", status: "completed", label: "Present" },
  { choice: "absent", status: "no_show", label: "Absent" },
];

// A private (1-on-1) lesson the instructor accepted, on the calendar and the
// dashboard. Attendance works like the roster: Present or Absent from the day of
// the lesson until 24 hours after it ends, and tapping the chosen one again
// clears it. It's saved as the lesson's status (completed / no_show).
export default function PrivateLessonCard({ lesson: initial }) {
  const [lesson, setLesson] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function mark(button) {
    const choice = lesson.status === button.status ? null : button.choice;
    setBusy(true);
    setError("");
    try {
      setLesson(await markPrivateLesson(lesson.id, choice));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const statusText = STATUS_LABEL[lesson.status] || lesson.status;

  return (
    <article className="card private-lesson-card">
      <span className="tag">{formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}</span>
      <h3 className="instructor-card-title">1-on-1 with {lesson.studentName}</h3>
      <dl className="details">
        <div><dt>Dojo</dt><dd>{lesson.centre}</dd></div>
        <div><dt>Type</dt><dd>Private lesson</dd></div>
        <div><dt>Attendance</dt><dd aria-live="polite">{statusText}</dd></div>
      </dl>
      {lesson.studentNote && <p className="private-lesson-note">Student's note: {lesson.studentNote}</p>}

      {lesson.canMark ? (
        <div className="roster-options private-lesson-options" role="group" aria-label={`Attendance for ${lesson.studentName}`}>
          {BUTTONS.map((button) => {
            const selected = lesson.status === button.status;
            return (
              <button
                type="button"
                key={button.choice}
                className={`roster-option roster-option-${button.choice}${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                disabled={busy}
                onClick={() => mark(button)}
              >
                {button.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="calendar-upcoming">
          {lesson.status === "scheduled" ? "Attendance opens on the day of the lesson." : "Attendance closed 24 hours after this lesson ended."}
        </p>
      )}
      {error && <p className="offer-error" role="alert">{error}</p>}
    </article>
  );
}

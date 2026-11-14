import { formatTime } from "../../js/utils/formatters.js";

const STATUS_LABEL = { scheduled: "Upcoming", completed: "Completed", no_show: "No show" };

// A private (1-on-1) lesson the instructor accepted, on the calendar and the
// dashboard. There's no roster: the admin records whether it went ahead.
export default function PrivateLessonCard({ lesson }) {
  return (
    <article className="card private-lesson-card">
      <span className="tag">{formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}</span>
      <h3 className="instructor-card-title">1-on-1 with {lesson.studentName}</h3>
      <dl className="details">
        <div><dt>Dojo</dt><dd>{lesson.centre}</dd></div>
        <div><dt>Type</dt><dd>Private lesson</dd></div>
        <div><dt>Status</dt><dd>{STATUS_LABEL[lesson.status] || lesson.status}</dd></div>
      </dl>
      {lesson.studentNote && <p className="private-lesson-note">Student's note: {lesson.studentNote}</p>}
      <p className="calendar-upcoming">The admin records whether this lesson went ahead.</p>
    </article>
  );
}

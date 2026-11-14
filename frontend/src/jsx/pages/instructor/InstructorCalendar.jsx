import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getCalendar } from "../../../js/services/instructorService.js";
import { addDays, formatTime, todayString } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import PrivateLessonCard from "../../components/PrivateLessonCard.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CHIPS_PER_DAY = 2;

function toDate(value) {
  const [y, m, d = 1] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shiftMonth(month, offset) {
  const date = toDate(month);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Every date shown for a month, from the Monday before the 1st to the end of the last week.
function monthDates(month) {
  const first = toDate(month);
  const leadingDays = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const total = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => addDays(`${month}-01`, i - leadingDays));
}

const monthTitle = (month) => toDate(month).toLocaleDateString("en-SG", { month: "long", year: "numeric" });
const dayTitle = (date) => toDate(date).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" });
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Instructor calendar: a month of assigned classes and gradings. Picking a
// day lists its classes below, and each class links to its roster.
export default function InstructorCalendar() {
  const today = todayString();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  // Picking a day scrolls down to its classes, which sit below the calendar.
  function pickDay(date) {
    setSelected(date);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  useEffect(() => {
    let current = true;
    setCalendar(null);
    setError("");
    getCalendar(month)
      .then((data) => { if (current) setCalendar(data); })
      .catch((err) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [month]);

  function goToMonth(next) {
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  }

  const classesOn = (date) => calendar?.classes.filter((item) => item.date === date) || [];
  const gradingsOn = (date) => calendar?.gradings.filter((item) => item.date === date) || [];
  const privatesOn = (date) => calendar?.privateLessons.filter((item) => item.date === date) || [];
  const selectedClasses = classesOn(selected);
  const selectedGradings = gradingsOn(selected);
  const selectedPrivates = privatesOn(selected);
  const nothingSelected = selectedClasses.length === 0 && selectedGradings.length === 0 && selectedPrivates.length === 0;

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container">
          <p className="eyebrow">Your schedule</p>
          <h1 className="roster-title">Calendar</h1>
          <p className="lead">The classes, private lessons and gradings assigned to you.</p>

          <div className="calendar-head">
            <h2 className="calendar-month" aria-live="polite">{monthTitle(month)}</h2>
            <div className="calendar-nav">
              <button type="button" className="btn btn-outline btn-small" onClick={() => goToMonth(shiftMonth(month, -1))}>Previous</button>
              <button type="button" className="btn btn-outline btn-small" onClick={() => goToMonth(today.slice(0, 7))}>Today</button>
              <button type="button" className="btn btn-outline btn-small" onClick={() => goToMonth(shiftMonth(month, 1))}>Next</button>
            </div>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="calendar-grid">
            {WEEKDAYS.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}

            {monthDates(month).map((date) => {
              if (!date.startsWith(month)) return <span className="calendar-day is-outside" key={date} />;

              const classes = classesOn(date);
              const gradings = gradingsOn(date);
              const privates = privatesOn(date);
              const count = classes.length + gradings.length + privates.length;
              // Private lessons first (there are few), then classes, up to CHIPS_PER_DAY chips.
              const lessonChips = [
                ...privates.map((item) => ({ key: `p${item.id}`, text: `${formatTime(item.startTime)} 1-on-1`, isPrivate: true })),
                ...classes.map((item) => ({ key: item.id, text: `${formatTime(item.startTime)} ${item.title}` })),
              ];
              const hidden = lessonChips.length - CHIPS_PER_DAY;
              const label = `${dayTitle(date)}, ${plural(classes.length, "class", "classes")}`
                + `${privates.length ? `, ${plural(privates.length, "private lesson")}` : ""}`
                + `${gradings.length ? `, ${plural(gradings.length, "grading")}` : ""}`;

              return (
                <button
                  type="button"
                  key={date}
                  className={`calendar-day${date === today ? " is-today" : ""}${date === selected ? " is-selected" : ""}`}
                  aria-pressed={date === selected}
                  aria-label={label}
                  onClick={() => pickDay(date)}
                >
                  <span className="calendar-date">{Number(date.slice(8))}</span>
                  {gradings.map((item) => <span className="calendar-chip calendar-chip-grading" key={item.id}>Grading</span>)}
                  {lessonChips.slice(0, CHIPS_PER_DAY).map((chip) => (
                    <span className={chip.isPrivate ? "calendar-chip calendar-chip-private" : "calendar-chip"} key={chip.key}>{chip.text}</span>
                  ))}
                  {hidden > 0 && <span className="calendar-more">+{hidden} more</span>}
                  {count > 0 && <span className="calendar-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <p className="calendar-hint">Pick a day to see its classes below.</p>

          <div className="calendar-list" ref={listRef}>
            <h2 className="calendar-list-title">{dayTitle(selected)}</h2>

            {calendar && nothingSelected && (
              <p className="notice">Nothing is assigned to you on this day.</p>
            )}

            {!nothingSelected && (
              <div className="grid instructor-classes">
                {selectedGradings.map((item) => (
                  <article className="card" key={`grading-${item.id}`}>
                    <span className="tag">{formatTime(item.startTime)}</span>
                    <h3 className="instructor-card-title">Grading session</h3>
                    <dl className="details">
                      <div><dt>Dojo</dt><dd>{item.centre}</dd></div>
                    </dl>
                    <Link to={`/instructor/gradings/${item.id}`} className="btn btn-outline btn-small">
                      View Applicants
                    </Link>
                  </article>
                ))}

                {selectedPrivates.map((item) => <PrivateLessonCard lesson={item} key={`private-${item.id}`} />)}

                {selectedClasses.map((item) => (
                  <article className="card" key={item.id}>
                    <span className="tag">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                    <h3 className="instructor-card-title">{item.title}</h3>
                    <dl className="details">
                      <div><dt>Dojo</dt><dd>{item.centre}</dd></div>
                      <div><dt>Booked</dt><dd>{item.booked}</dd></div>
                      <div><dt>Marked</dt><dd>{item.marked}</dd></div>
                    </dl>
                    {item.date <= today ? (
                      <Link to={`/instructor/classes/${item.id}`} className="btn btn-outline btn-small">
                        {item.attendanceClosed ? "View Attendance" : "Take Attendance"}
                      </Link>
                    ) : (
                      <p className="calendar-upcoming">Attendance opens on the day of the class.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

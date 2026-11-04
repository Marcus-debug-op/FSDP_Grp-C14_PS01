import { useEffect, useMemo, useState } from "react";
import { getDojos, getInstructors, getSchedule } from "../../services/adminService.js";
import { addDays, formatDayHeading, formatTime, formatWeekRange, todayString } from "../../utils/formatters.js";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import "../../auth.css";
import "../../admin.css";

const TYPES = [
  { key: "group", label: "Group class" },
  { key: "private", label: "1 on 1" },
  { key: "external", label: "External session" },
  { key: "grading", label: "Grading" },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.key, t.label]));

function LessonItem({ item }) {
  const cancelled = item.status === "cancelled";
  const noInstructor = item.instructors.length === 0 && !cancelled;
  return (
    <li className={`lesson lesson-${item.type}${cancelled ? " lesson-cancelled" : ""}`}>
      <span className="lesson-time">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
      <strong className="lesson-title">{item.title}</strong>
      <span className="lesson-type">{TYPE_LABEL[item.type]}{cancelled ? " · Cancelled" : ""}</span>
      <span>{item.location}{item.roomName ? `, ${item.roomName}` : ""}</span>
      {noInstructor ? (
        <span className="lesson-flag">No instructor</span>
      ) : (
        <span>{item.instructors.map((i) => i.fullName).join(", ")}</span>
      )}
    </li>
  );
}

export default function AdminSchedule() {
  const [week, setWeek] = useState(todayString());
  const [dojoId, setDojoId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [dojos, setDojos] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getDojos(), getInstructors()])
      .then(([dojoList, instructorList]) => {
        setDojos(dojoList);
        setInstructors(instructorList);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let active = true;
    setError("");
    getSchedule({ week, dojoId, instructorId, includeCancelled: showCancelled ? "true" : "" })
      .then((data) => active && setSchedule(data))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [week, dojoId, instructorId, showCancelled]);

  const days = useMemo(() => {
    if (!schedule) return [];
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(schedule.weekStart, index);
      return { date, items: schedule.items.filter((item) => item.date === date) };
    });
  }, [schedule]);

  const today = todayString();
  const running = schedule ? schedule.items.filter((i) => i.status !== "cancelled") : [];
  const withoutInstructor = running.filter((i) => i.instructors.length === 0).length;
  const isThisWeek = schedule && today >= schedule.weekStart && today <= schedule.weekEnd;
  const shiftWeek = (days) => setWeek(addDays(schedule?.weekStart || week, days));

  return (
    <section className="section">
      <div className="container">
        <AdminTabs />
        <p className="eyebrow">Scheduling</p>
        <h1>Schedule</h1>
        <p className="lead">Every lesson across all dojos and instructors, one week at a time.</p>

        <div className="week-nav">
          <button type="button" className="btn btn-outline btn-small" onClick={() => shiftWeek(-7)}>Previous Week</button>
          {!isThisWeek && (
            <button type="button" className="btn btn-outline btn-small" onClick={() => setWeek(todayString())}>This Week</button>
          )}
          <button type="button" className="btn btn-outline btn-small" onClick={() => shiftWeek(7)}>Next Week</button>
          {schedule && <h2 className="week-range">{formatWeekRange(schedule.weekStart, schedule.weekEnd)}</h2>}
        </div>

        <div className="filters">
          <label>
            Dojo
            <select value={dojoId} onChange={(e) => setDojoId(e.target.value)}>
              <option value="">All dojos</option>
              {dojos.map((dojo) => <option key={dojo.id} value={dojo.id}>{dojo.name}</option>)}
            </select>
          </label>
          <label>
            Instructor
            <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
              <option value="">All instructors</option>
              {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
            </select>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Show cancelled
          </label>
        </div>

        <div className="schedule-key">
          <ul className="legend" aria-label="Lesson types">
            {TYPES.map((type) => (
              <li key={type.key}><span className={`legend-mark lesson-${type.key}`} aria-hidden="true" />{type.label}</li>
            ))}
          </ul>
          {schedule && (
            <p role="status">
              {running.length} lesson{running.length === 1 ? "" : "s"} this week
              {withoutInstructor > 0 && <strong> · {withoutInstructor} without an instructor</strong>}
            </p>
          )}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {!schedule && !error && <p>Loading...</p>}

        {schedule && (
          <div className="week-grid">
            {days.map(({ date, items }) => {
              const heading = formatDayHeading(date);
              const isToday = date === today;
              return (
                <section key={date} className={isToday ? "day day-today" : "day"} aria-label={`${heading.weekday} ${heading.day}`}>
                  <h3 className="day-head">
                    <span>{heading.weekday}</span>
                    <span className="day-date">{heading.day}{isToday ? " · Today" : ""}</span>
                  </h3>
                  {items.length === 0 ? (
                    <p className="day-empty">No lessons</p>
                  ) : (
                    <ul className="day-lessons">
                      {items.map((item) => <LessonItem key={item.id} item={item} />)}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

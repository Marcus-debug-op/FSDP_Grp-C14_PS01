import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCentres, getInstructors, getSchedule } from "../../../js/services/adminService.js";
import { addDays, formatDayHeading, formatTime, formatWeekRange, todayString } from "../../../js/utils/formatters.js";
import "../../../css/auth.css";
import "../../../css/admin.css";

function beltRange(item) {
  if (item.minBeltName && item.maxBeltName) return `${item.minBeltName} to ${item.maxBeltName}`;
  if (item.minBeltName) return `${item.minBeltName} and above`;
  if (item.maxBeltName) return `Up to ${item.maxBeltName}`;
  return "All belts";
}

function LessonItem({ item, showCentre }) {
  const cancelled = item.status === "cancelled";
  return (
    <li className={`lesson${cancelled ? " lesson-cancelled" : ""}`}>
      <span className="lesson-time">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
      <strong className="lesson-title">{item.title}</strong>
      <span className="lesson-type">{beltRange(item)}{cancelled ? " · Cancelled" : ""}</span>
      {showCentre && <span>{item.centreName}</span>}
      <span>{item.instructorName}</span>
    </li>
  );
}

export default function AdminSchedule() {
  const [week, setWeek] = useState(todayString());
  const [searchParams, setSearchParams] = useSearchParams();
  const centreId = searchParams.get("dojo") || "";
  const [instructorId, setInstructorId] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [centres, setCentres] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getCentres(), getInstructors()])
      .then(([centreList, instructorList]) => {
        setCentres(centreList);
        setInstructors(instructorList);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let active = true;
    setError("");
    getSchedule({ week, centreId, instructorId, includeCancelled: showCancelled ? "true" : "" })
      .then((data) => active && setSchedule(data))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [week, centreId, instructorId, showCancelled]);

  const days = useMemo(() => {
    if (!schedule) return [];
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(schedule.weekStart, index);
      return { date, items: schedule.items.filter((item) => item.date === date) };
    });
  }, [schedule]);

  const today = todayString();
  const running = schedule ? schedule.items.filter((i) => i.status !== "cancelled") : [];
  const isThisWeek = schedule && today >= schedule.weekStart && today <= schedule.weekEnd;
  const shiftWeek = (amount) => setWeek(addDays(schedule?.weekStart || week, amount));
  const selectedCentre = centres.find((c) => String(c.id) === centreId);
  const setCentreId = (value) => setSearchParams(value ? { dojo: value } : {}, { replace: true });

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Timetable</p>
        <h1>{selectedCentre ? selectedCentre.name : "Class Timetable"}</h1>
        <p className="lead">
          {selectedCentre
            ? selectedCentre.address || "No address saved for this dojo yet."
            : "Every class across all dojos, one week at a time. Choose a dojo to see only its classes."}
        </p>

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
            <select value={centreId} onChange={(e) => setCentreId(e.target.value)}>
              <option value="">All dojos</option>
              {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
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

        {schedule && (
          <p className="schedule-count" role="status">
            {running.length} class{running.length === 1 ? "" : "es"} this week
            {selectedCentre ? ` at ${selectedCentre.name}` : " across all dojos"}
          </p>
        )}

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
                    <p className="day-empty">No classes</p>
                  ) : (
                    <ul className="day-lessons">
                      {items.map((item) => <LessonItem key={item.id} item={item} showCentre={!centreId} />)}
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

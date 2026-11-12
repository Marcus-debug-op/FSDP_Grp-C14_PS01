import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCentres, getInstructors, getSchedule } from "../../../js/services/adminService.js";
import { addDays, formatDayHeading, formatTime, formatWeekRange, todayString } from "../../../js/utils/formatters.js";
import PageHeader from "../../components/admin/PageHeader.jsx";
import "../../../css/auth.css";
import "../../../css/admin.css";

const VIEWS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
];

function beltRange(item) {
  if (item.minBeltName && item.maxBeltName) return `${item.minBeltName} to ${item.maxBeltName}`;
  if (item.minBeltName) return `${item.minBeltName} and above`;
  if (item.maxBeltName) return `Up to ${item.maxBeltName}`;
  return "";
}

function timeRange(start, end) {
  const from = formatTime(start);
  const to = formatTime(end);
  const sameHalf = from.slice(-2) === to.slice(-2);
  return `${sameHalf ? from.slice(0, -2) : from} - ${to}`;
}

function classCount(n) {
  return `${n} class${n === 1 ? "" : "es"}`;
}

function WeekCard({ item, showCentre }) {
  const cancelled = item.status === "cancelled";
  const belts = beltRange(item);
  return (
    <li className={cancelled ? "tt-card tt-cancelled" : "tt-card"}>
      <span className="tt-time">{timeRange(item.startTime, item.endTime)}</span>
      <strong className="tt-title">{item.title}</strong>
      {showCentre && <span className="tt-meta">{item.centreName}</span>}
      <span className="tt-meta">{item.instructorName}</span>
      {belts && <span className="tt-belts">{belts}</span>}
      {cancelled && <span className="tt-belts">Cancelled</span>}
    </li>
  );
}

function DayTable({ items, showCentre, heading }) {
  if (items.length === 0) return <p className="adm-empty">No classes on this day.</p>;
  return (
    <table className="att-table adm-table tt-table">
      <caption className="visually-hidden">Classes on {heading}</caption>
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Class</th>
          {showCentre && <th scope="col">Dojo</th>}
          <th scope="col">Instructor</th>
          <th scope="col">Belts</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const cancelled = item.status === "cancelled";
          return (
            <tr key={item.id} className={cancelled ? "att-row-cancelled" : undefined}>
              <td data-label="Time" className="tt-nowrap">{timeRange(item.startTime, item.endTime)}</td>
              <td data-label="Class">
                <span className={cancelled ? "tt-struck" : undefined}>{item.title}</span>
                {cancelled && <span className="att-sub">Cancelled</span>}
              </td>
              {showCentre && <td data-label="Dojo">{item.centreName}</td>}
              <td data-label="Instructor">{item.instructorName}</td>
              <td data-label="Belts" className={beltRange(item) ? undefined : "tt-all-belts"}>{beltRange(item) || <span className="adm-muted">All belts</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function AdminSchedule() {
  const [week, setWeek] = useState(todayString());
  const [searchParams, setSearchParams] = useSearchParams();
  const centreId = searchParams.get("dojo") || "";
  const view = searchParams.get("view") === "week" ? "week" : "day";
  const [dayIndex, setDayIndex] = useState(null);
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

  const today = todayString();

  const days = useMemo(() => {
    if (!schedule) return [];
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(schedule.weekStart, index);
      const items = schedule.items.filter((item) => item.date === date);
      return { date, items, running: items.filter((i) => i.status !== "cancelled").length, heading: formatDayHeading(date) };
    });
  }, [schedule]);

  const todayIndex = days.findIndex((d) => d.date === today);
  const selectedIndex = dayIndex ?? (todayIndex >= 0 ? todayIndex : 0);
  const selectedDay = days[selectedIndex];

  const running = schedule ? schedule.items.filter((i) => i.status !== "cancelled") : [];
  const isThisWeek = todayIndex >= 0;
  const selectedCentre = centres.find((c) => String(c.id) === centreId);
  const showCentre = !centreId;

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function shiftWeek(amount) {
    setWeek(addDays(schedule?.weekStart || week, amount));
  }

  function goToThisWeek() {
    setWeek(todayString());
    setDayIndex(null);
  }

  return (
    <section className="section">
      <div className="container">
        <PageHeader
          eyebrow="Scheduling · Timetable"
          title={selectedCentre ? selectedCentre.name : "Class Timetable"}
          lead={
            selectedCentre
              ? selectedCentre.address || "No address saved for this dojo yet."
              : "Every class across all dojos. Choose a dojo or an instructor to narrow it down."
          }
        />

        <div className="filters">
          <label>
            Dojo
            <select value={centreId} onChange={(e) => setParam("dojo", e.target.value)}>
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

        <div className="tt-toolbar">
          <div className="tt-week">
            <button type="button" className="btn btn-outline btn-small" onClick={() => shiftWeek(-7)} aria-label="Previous week">Prev</button>
            <h2 className="tt-range">{schedule ? formatWeekRange(schedule.weekStart, schedule.weekEnd) : ""}</h2>
            <button type="button" className="btn btn-outline btn-small" onClick={() => shiftWeek(7)} aria-label="Next week">Next</button>
            {schedule && !isThisWeek && (
              <button type="button" className="link-button" onClick={goToThisWeek}>Back to this week</button>
            )}
          </div>
          <div className="auth-toggle tt-views" role="group" aria-label="Timetable layout">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => setParam("view", v.key === "day" ? "" : v.key)}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {schedule && (
          <p className="schedule-count" role="status">
            {classCount(running.length)} this week{selectedCentre ? ` at ${selectedCentre.name}` : " across all dojos"}
          </p>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        {!schedule && !error && <p>Loading...</p>}

        {schedule && view === "day" && (
          <>
            <div className="tt-days" role="group" aria-label="Day of the week">
              {days.map((d, index) => (
                <button
                  key={d.date}
                  type="button"
                  className={d.date === today ? "tt-day tt-day-today" : "tt-day"}
                  aria-pressed={index === selectedIndex}
                  onClick={() => setDayIndex(index)}
                >
                  <span className="tt-day-name">{d.heading.weekday}</span>
                  <span className="tt-day-date">{d.heading.day}</span>
                  <span className="tt-day-count">{d.running === 0 ? "No classes" : classCount(d.running)}</span>
                </button>
              ))}
            </div>
            {selectedDay && (
              <>
                <h3 className="adm-heading tt-day-heading">
                  {selectedDay.heading.weekday} {selectedDay.heading.day}
                  {selectedDay.date === today ? " · Today" : ""}
                </h3>
                <DayTable items={selectedDay.items} showCentre={showCentre} heading={`${selectedDay.heading.weekday} ${selectedDay.heading.day}`} />
              </>
            )}
          </>
        )}

        {schedule && view === "week" && (
          <div className="week-grid">
            {days.map((d) => {
              const isToday = d.date === today;
              return (
                <section key={d.date} className={isToday ? "day day-today" : "day"} aria-label={`${d.heading.weekday} ${d.heading.day}`}>
                  <h3 className="day-head">
                    <span>{d.heading.weekday}</span>
                    <span className="day-date">{d.heading.day}{isToday ? " · Today" : ""}</span>
                  </h3>
                  {d.items.length === 0 ? (
                    <p className="day-empty">No classes</p>
                  ) : (
                    <ul className="day-lessons">
                      {d.items.map((item) => <WeekCard key={item.id} item={item} showCentre={showCentre} />)}
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

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCentres, getInstructors, getSchedule } from "../../../js/services/adminService.js";
import { addDays, formatDayHeading, formatTime, formatWeekRange, todayString } from "../../../js/utils/formatters.js";
import PageHeader from "../../components/admin/PageHeader.jsx";
import WeekGrid from "../../components/admin/WeekGrid.jsx";
import "../../../css/auth.css";
import "../../../css/admin.css";

const TYPES = [
  { key: "", label: "All classes" },
  { key: "class", label: "Group classes" },
  { key: "private", label: "Private lessons" },
];

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

function sessionSummary(items) {
  const running = items.filter((i) => i.status !== "cancelled");
  const privates = running.filter((i) => i.kind === "private").length;
  const classes = running.length - privates;
  if (running.length === 0) return "";
  const parts = [];
  if (classes > 0) parts.push(classCount(classes));
  if (privates > 0) parts.push(`${privates} private`);
  return parts.join(" · ");
}

const PRIVATE_STATUS = { completed: "Completed", no_show: "No-show", cancelled: "Cancelled" };

function DayTable({ items, showCentre, heading }) {
  if (items.length === 0) return <p className="adm-empty">No classes or private lessons on this day.</p>;
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
          if (item.kind === "private") {
            return (
              <tr key={item.id} className={cancelled ? "att-row-cancelled tt-private-row" : "tt-private-row"}>
                <td data-label="Time" className="tt-nowrap">{timeRange(item.startTime, item.endTime)}</td>
                <td data-label="Class">
                  <span className={cancelled ? "tt-struck" : undefined}>Private lesson</span>
                  <span className="att-sub">
                    with <Link to={`/admin/students/${item.studentId}`} className="adm-link">{item.studentName}</Link>
                    {PRIVATE_STATUS[item.status] ? ` · ${PRIVATE_STATUS[item.status]}` : ""}
                  </span>
                </td>
                {showCentre && <td data-label="Dojo">{item.centreName}</td>}
                <td data-label="Instructor">{item.instructorName}</td>
                <td data-label="Belts"><span className="tt-private-tag">1-to-1</span></td>
              </tr>
            );
          }
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
  const type = TYPES.some((t) => t.key === searchParams.get("type")) ? searchParams.get("type") : "";
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

  const shownItems = useMemo(
    () => (schedule ? schedule.items.filter((item) => !type || item.kind === type) : []),
    [schedule, type]
  );

  const days = useMemo(() => {
    if (!schedule) return [];
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(schedule.weekStart, index);
      const items = shownItems.filter((item) => item.date === date);
      return { date, items, summary: sessionSummary(items), heading: formatDayHeading(date) };
    });
  }, [schedule, shownItems]);

  const todayIndex = days.findIndex((d) => d.date === today);
  const selectedIndex = dayIndex ?? (todayIndex >= 0 ? todayIndex : 0);
  const selectedDay = days[selectedIndex];

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

  function openDay(date) {
    const index = days.findIndex((d) => d.date === date);
    if (index >= 0) setDayIndex(index);
    setParam("view", "");
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
          <label>
            Show
            <select value={type} onChange={(e) => setParam("type", e.target.value)}>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Show cancelled
          </label>
        </div>

        <div className="tt-toolbar">
          <div className="tt-week">
            <div className="tt-range-pill">
              <button type="button" className="tt-nav" onClick={() => shiftWeek(-7)} aria-label="Previous week">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="tt-range-label">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
                <h2 className="tt-range">{schedule ? formatWeekRange(schedule.weekStart, schedule.weekEnd) : ""}</h2>
              </span>
              <button type="button" className="tt-nav" onClick={() => shiftWeek(7)} aria-label="Next week">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
            {schedule && !isThisWeek && (
              <button type="button" className="tt-today-btn" onClick={goToThisWeek}>This week</button>
            )}
          </div>
          <div className="tt-seg" role="group" aria-label="Timetable layout">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => setParam("view", v.key === "day" ? "" : v.key)}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {schedule && (
          <p className="schedule-count" role="status">
            {sessionSummary(shownItems) || (type === "private" ? "No private lessons" : "Nothing scheduled")} this week{selectedCentre ? ` at ${selectedCentre.name}` : " across all dojos"}
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
                  <span className="tt-day-count">{d.summary || (type === "private" ? "None" : "No classes")}</span>
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
          <WeekGrid days={days} today={today} showCentre={showCentre} onOpenDay={openDay} />
        )}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ScrollReveal from "../../components/ScrollReveal.jsx";
import CancelBooking from "../../components/student/CancelBooking.jsx";
import { getTimetable, getHistory } from "../../../js/services/lessonService.js";
import {
  addDays, formatDayHeading, formatShortDate, formatTime, formatWeekRange,
} from "../../../js/utils/formatters.js";
import "../../../css/content.css";
import "../../../css/my-timetable.css";

// FSDP-41 View my timetable: this week's booked lessons in a weekly calendar.
// Cancelled lessons say "Cancelled", moved lessons say "Venue changed" with
// the new dojo. The page refreshes itself every minute and whenever the
// student comes back to the tab, so changes show up straight away.
// FSDP-59 View lesson history: the "Past lessons" tab.

const REFRESH_MS = 60 * 1000;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// What the label on each lesson says.
const LABELS = {
  booked: null,
  moved: { text: "Venue changed", tone: "moved" },
  cancelled: { text: "Cancelled", tone: "cancelled" },
  attended: { text: "Attended", tone: "ok" },
  missed: { text: "Missed", tone: "muted" },
  awaiting: { text: "Not marked yet", tone: "muted" },
};

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-SG", { month: "long", year: "numeric" });
}

// ---------- One lesson in the calendar ----------
function TimetableItem({ item, noticeHours, onCancelled }) {
  const label = LABELS[item.status];
  return (
    <article className={`mt-item mt-${item.status}${item.type === "private" ? " mt-private" : ""}`}>
      <p className="mt-time">{formatTime(item.startTime)} – {formatTime(item.endTime)}</p>
      <h3 className="mt-title">{item.title}</h3>
      {label && <p className={`mt-label mt-label-${label.tone}`}>{label.text}</p>}
      <p className="mt-where">
        {item.status === "moved" ? <>Now at <strong>{item.centre}</strong></> : item.centre}
      </p>
      {item.usualCentre && <p className="mt-sub">Usually at {item.usualCentre}</p>}
      {item.instructor && <p className="mt-sub">{item.type === "private" ? "With " : "Led by "}{item.instructor}</p>}
      {item.changeNote && item.status !== "booked" && <p className="mt-note">{item.changeNote}</p>}
      {item.status === "cancelled" && item.type === "group" && (
        <p className="mt-sub">Your credit has been returned.</p>
      )}
      {item.canCancel && (
        <CancelBooking key={`${item.id}-${item.status}`} lesson={item} noticeHours={noticeHours} onCancelled={onCancelled} />
      )}
    </article>
  );
}

// ---------- This week ----------
function WeekView() {
  const [week, setWeek] = useState(null); // any date in the week; null = this week
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const latest = useRef(0);

  const load = useCallback(() => {
    const id = ++latest.current;
    getTimetable(week)
      .then((result) => {
        if (id !== latest.current) return;
        setData(result);
        setError("");
      })
      .catch((err) => {
        if (id === latest.current) setError(err.message);
      });
  }, [week]);

  // Load now, then every minute and whenever the student comes back to the tab.
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  function cancelled(item, result) {
    setNote(
      result.refunded > 0
        ? `Cancelled ${item.title} on ${formatShortDate(item.date)}. ${plural(result.refunded, "credit")} returned.`
        : `Cancelled ${item.title} on ${formatShortDate(item.date)}. Your credit wasn't returned because it was less than ${data.cancelNoticeHours} hours before the lesson.`
    );
    load();
  }

  if (!data && error) return <p className="notice" role="alert">{error}</p>;
  if (!data) return <p>Loading your timetable...</p>;

  const days = Array.from({ length: 7 }, (_, i) => addDays(data.weekStart, i));
  const weekEnd = days[6];
  const isThisWeek = data.weekStart === data.thisWeek;
  const changes = data.items.filter((i) => i.status === "cancelled" || i.status === "moved");

  return (
    <>
      <div className="mt-nav" role="group" aria-label="Choose a week">
        <button type="button" className="btn btn-outline btn-small" onClick={() => setWeek(addDays(data.weekStart, -7))}>
          ← Previous week
        </button>
        <p className="mt-range" aria-live="polite">
          {formatWeekRange(data.weekStart, weekEnd)}
          {isThisWeek && <span className="mt-this-week">This week</span>}
        </p>
        <div className="mt-nav-right">
          {!isThisWeek && (
            <button type="button" className="btn btn-outline btn-small" onClick={() => setWeek(null)}>This week</button>
          )}
          <button type="button" className="btn btn-outline btn-small" onClick={() => setWeek(addDays(data.weekStart, 7))}>
            Next week →
          </button>
        </div>
      </div>

      {error && <p className="notice" role="alert">{error}</p>}
      {note && <p className="notice mt-flash" role="status">{note}</p>}
      {changes.length > 0 && (
        <p className="notice mt-changes" role="status">
          {plural(changes.length, "lesson")} this week {changes.length === 1 ? "has" : "have"} changed. Check the
          lessons marked below.
        </p>
      )}

      {data.items.length === 0 && (
        <p className="mt-empty">
          Nothing booked this week. <Link to="/lessons">Book a lesson</Link>
        </p>
      )}

      <div className="mt-week">
        {days.map((day) => {
          const items = data.items.filter((i) => i.date === day);
          const { weekday, day: dayText } = formatDayHeading(day);
          const isToday = day === data.today;
          return (
            <section
              key={day}
              className={`mt-day${isToday ? " is-today" : ""}${items.length === 0 ? " is-empty" : ""}`}
              aria-label={`${weekday} ${dayText}`}
            >
              <h2 className="mt-day-head">
                <span>{weekday}</span> {dayText}
                {isToday && <span className="mt-today">Today</span>}
              </h2>
              {items.length === 0 ? (
                <p className="mt-none">No lessons</p>
              ) : (
                items.map((item) => (
                  <TimetableItem
                    key={`${item.type}-${item.id}`}
                    item={item}
                    noticeHours={data.cancelNoticeHours}
                    onCancelled={(result) => cancelled(item, result)}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

// ---------- Past lessons ----------
const HISTORY_LABELS = {
  attended: { text: "Attended", tone: "ok" },
  missed: { text: "Missed", tone: "muted" },
  cancelled: { text: "Cancelled", tone: "cancelled" },
  awaiting: { text: "Not marked yet", tone: "muted" },
};

function HistoryView() {
  const [filters, setFilters] = useState({ month: "", centreId: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    setLoading(true);
    getHistory(filters)
      .then((result) => {
        if (id !== latest.current) return;
        setData(result);
        setError("");
      })
      .catch((err) => {
        if (id === latest.current) setError(err.message);
      })
      .finally(() => {
        if (id === latest.current) setLoading(false);
      });
  }, [filters]);

  if (!data && error) return <p className="notice" role="alert">{error}</p>;
  if (!data) return <p>Loading your past lessons...</p>;

  const filtered = filters.month || filters.centreId;

  return (
    <>
      <ul className="stats mt-stats">
        <li><strong>{data.summary.attended}</strong><span>Attended</span></li>
        <li><strong>{data.summary.missed}</strong><span>Missed</span></li>
        <li><strong>{data.summary.cancelled}</strong><span>Cancelled</span></li>
      </ul>

      <div className="filters mt-filters">
        <label>
          Month
          <select value={filters.month} onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}>
            <option value="">All months</option>
            {data.options.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>
        <label>
          Dojo
          <select value={filters.centreId} onChange={(e) => setFilters((f) => ({ ...f, centreId: e.target.value }))}>
            <option value="">All dojos and events</option>
            {data.options.centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {filtered && (
          <button type="button" className="btn btn-outline btn-small mt-reset" onClick={() => setFilters({ month: "", centreId: "" })}>
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="notice" role="alert">{error}</p>}

      <div aria-live="polite" aria-busy={loading}>
        <p className="result-count">{loading ? "Updating..." : `Showing ${plural(data.items.length, "lesson")}`}</p>
        {data.items.length === 0 && !loading ? (
          <p className="mt-empty">{filtered ? "No lessons match your filters." : "You haven't had any lessons yet."}</p>
        ) : (
          <div className="mt-history-box">
            <table className="mt-history">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Lesson</th>
                  <th scope="col">Where</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => {
                  const label = HISTORY_LABELS[i.status];
                  return (
                    <tr key={`${i.type}-${i.id}`}>
                      <td data-label="Date">
                        {formatShortDate(i.date)}
                        {i.startTime && <span className="mt-cell-sub">{formatTime(i.startTime)}</span>}
                      </td>
                      <td data-label="Lesson">
                        {i.title}
                        {i.type === "external" && <span className="mt-cell-sub">Outside event</span>}
                        {i.type === "private" && <span className="mt-cell-sub">1-on-1{i.instructor ? ` with ${i.instructor}` : ""}</span>}
                      </td>
                      <td data-label="Where">{i.centre || "—"}</td>
                      <td data-label="Status">
                        <span className={`mt-label mt-label-${label.tone}`}>{label.text}</span>
                        {i.cancelledBy && (
                          <span className="mt-cell-sub">{i.cancelledBy === "you" ? "by you" : "by the dojo"}</span>
                        )}
                        {i.note && i.type !== "external" && <span className="mt-cell-sub">{i.note}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ---------- Page ----------
export default function MyTimetable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "history" ? "history" : "week";
  const show = (v) => setSearchParams(v === "history" ? { view: "history" } : {}, { replace: true });

  return (
    <section className="section mt-page">
      <div className="container">
        <ScrollReveal>
          <p className="eyebrow">My timetable</p>
          <h1>{view === "history" ? "Past Lessons" : "My Timetable"}</h1>
          <p className="lead">
            {view === "history"
              ? "Every lesson you've booked or attended, including outside events."
              : "Your booked lessons for the week. Changes from the dojo show up here straight away."}
          </p>
        </ScrollReveal>

        <div className="mt-tabs" role="tablist" aria-label="Timetable views">
          <button type="button" role="tab" aria-selected={view === "week"} className={view === "week" ? "is-active" : ""} onClick={() => show("week")}>
            Week
          </button>
          <button type="button" role="tab" aria-selected={view === "history"} className={view === "history" ? "is-active" : ""} onClick={() => show("history")}>
            Past lessons
          </button>
          <Link to="/lessons" className="btn btn-primary btn-small mt-book">Book a lesson</Link>
        </div>

        <div role="tabpanel">{view === "week" ? <WeekView /> : <HistoryView />}</div>
      </div>
    </section>
  );
}

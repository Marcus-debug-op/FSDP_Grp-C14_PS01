import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ScrollReveal from "../../components/ScrollReveal.jsx";
import CancelBooking from "../../components/student/CancelBooking.jsx";
import { getTimetable, getTimetableMonth, getHistory } from "../../../js/services/lessonService.js";
import {
  addDays, formatShortDate, formatTime, formatWeekRange,
} from "../../../js/utils/formatters.js";
import "../../../css/content.css";
import "../../../css/my-timetable.css";

// FSDP-41 View my timetable: booked lessons on a week or month calendar.
// Picking a day lists its lessons underneath, where they can be cancelled.
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

// "YYYY-MM" a number of months before or after another.
function shiftMonth(ym, offset) {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// "Tuesday, 17 November"
function longDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" });
}

// What the student sees after cancelling from either view.
function cancelMessage(item, result, noticeHours) {
  return result.refunded > 0
    ? `Cancelled ${item.title} on ${formatShortDate(item.date)}. ${plural(result.refunded, "credit")} returned.`
    : `Cancelled ${item.title} on ${formatShortDate(item.date)}. Your credit wasn't returned because it was less than ${noticeHours} hours before the lesson.`;
}

// Loads the timetable, then again every minute and whenever the student
// comes back to the tab, so changes from the dojo show up straight away.
// `fetchData` should only change when what's being shown changes.
function useLiveTimetable(fetchData) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const latest = useRef(0);

  const load = useCallback(() => {
    const id = ++latest.current;
    fetchData()
      .then((result) => {
        if (id !== latest.current) return;
        setData(result);
        setError("");
      })
      .catch((err) => {
        if (id === latest.current) setError(err.message);
      });
  }, [fetchData]);

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

  return { data, error, load };
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

// ---------- Calendar shared by the week and month views ----------
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Every date from `from` to `to`, both included.
function datesBetween(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

// The day shown under the calendar until the student picks one:
// today if it's in range, otherwise the first day with a lesson, otherwise the first day.
function defaultDay(items, today, from, to) {
  if (today >= from && today <= to) return today;
  return items.find((i) => i.date >= from && i.date <= to)?.date || from;
}

// On small screens the day's lessons sit below the fold, so bring them into view.
function scrollToList(listRef) {
  const list = listRef.current;
  if (list && list.getBoundingClientRect().top > window.innerHeight - 120) {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }
}

// Rows of days with a short line per lesson. Days outside `month` are greyed out.
function CalendarGrid({ days, items, today, selected, onPick, chipsPerDay, month = null, variant }) {
  return (
    <div className={`mt-cal mt-cal-${variant}`}>
      <div className="mt-cal-head" aria-hidden="true">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-cal-grid">
        {days.map((day) => {
          const dayItems = items.filter((i) => i.date === day);
          const outside = month && !day.startsWith(month);
          const hidden = dayItems.length - chipsPerDay;
          const label = `${longDay(day)}, ${dayItems.length ? plural(dayItems.length, "lesson") : "no lessons"}`;
          return (
            <button
              type="button"
              key={day}
              className={`mt-cal-day${outside ? " is-outside" : ""}${day === today ? " is-today" : ""}${day === selected ? " is-selected" : ""}`}
              aria-pressed={day === selected}
              aria-label={label}
              onClick={() => onPick(day)}
            >
              <span className="mt-cal-date">{Number(day.slice(8))}</span>
              {dayItems.slice(0, chipsPerDay).map((item) => (
                <span
                  key={`${item.type}-${item.id}`}
                  className={`mt-chip mt-chip-${item.status}${item.type === "private" ? " mt-private" : ""}`}
                >
                  <span className="mt-chip-time">{formatTime(item.startTime)}</span> {item.title}
                </span>
              ))}
              {hidden > 0 && <span className="mt-cal-more">+{hidden} more</span>}
              {dayItems.length > 0 && <span className="mt-cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The picked day's lessons in full, under the calendar.
function DayDetails({ day, items, today, noticeHours, onCancelled, listRef }) {
  const dayItems = items.filter((i) => i.date === day);
  return (
    <section className="mt-cal-list" ref={listRef} aria-live="polite">
      <h2 className="mt-cal-list-title">
        {longDay(day)}
        {day === today && <span className="mt-today">Today</span>}
      </h2>
      {dayItems.length === 0 ? (
        <p className="mt-none">
          No lessons on this day.{day >= today && <> <Link to="/lessons">Book a lesson</Link></>}
        </p>
      ) : (
        <div className="mt-cal-items">
          {dayItems.map((item) => (
            <TimetableItem
              key={`${item.type}-${item.id}`}
              item={item}
              noticeHours={noticeHours}
              onCancelled={(result) => onCancelled(item, result)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Week ----------
function WeekView() {
  const [week, setWeek] = useState(null); // any date in the week; null = this week
  const [picked, setPicked] = useState(null); // the day the student chose
  const [note, setNote] = useState("");
  const listRef = useRef(null);
  const fetchWeek = useCallback(() => getTimetable(week), [week]);
  const { data, error, load } = useLiveTimetable(fetchWeek);

  function cancelled(item, result) {
    setNote(cancelMessage(item, result, data.cancelNoticeHours));
    load();
  }

  function goToWeek(next) {
    setWeek(next);
    setPicked(null);
  }

  function pickDay(day) {
    setPicked(day);
    scrollToList(listRef);
  }

  if (!data && error) return <p className="notice" role="alert">{error}</p>;
  if (!data) return <p>Loading your timetable...</p>;

  const weekEnd = addDays(data.weekStart, 6);
  const isThisWeek = data.weekStart === data.thisWeek;
  const changes = data.items.filter((i) => i.status === "cancelled" || i.status === "moved");
  const selected = picked && picked >= data.weekStart && picked <= weekEnd
    ? picked
    : defaultDay(data.items, data.today, data.weekStart, weekEnd);

  return (
    <>
      <div className="mt-nav" role="group" aria-label="Choose a week">
        <button type="button" className="btn btn-outline btn-small" onClick={() => goToWeek(addDays(data.weekStart, -7))}>
          ← Previous week
        </button>
        <p className="mt-range" aria-live="polite">
          {formatWeekRange(data.weekStart, weekEnd)}
          {isThisWeek && <span className="mt-this-week">This week</span>}
        </p>
        <div className="mt-nav-right">
          {!isThisWeek && (
            <button type="button" className="btn btn-outline btn-small" onClick={() => goToWeek(null)}>This week</button>
          )}
          <button type="button" className="btn btn-outline btn-small" onClick={() => goToWeek(addDays(data.weekStart, 7))}>
            Next week →
          </button>
        </div>
      </div>

      {error && <p className="notice" role="alert">{error}</p>}
      {note && <p className="notice mt-flash" role="status">{note}</p>}
      {changes.length > 0 && (
        <p className="notice mt-changes" role="status">
          {plural(changes.length, "lesson")} this week {changes.length === 1 ? "has" : "have"} changed. Check the
          days marked below.
        </p>
      )}

      {data.items.length === 0 && (
        <p className="mt-empty">
          Nothing booked this week. <Link to="/lessons">Book a lesson</Link>
        </p>
      )}

      <CalendarGrid
        variant="week"
        days={datesBetween(data.weekStart, weekEnd)}
        items={data.items}
        today={data.today}
        selected={selected}
        onPick={pickDay}
        chipsPerDay={4}
      />

      <DayDetails
        day={selected}
        items={data.items}
        today={data.today}
        noticeHours={data.cancelNoticeHours}
        onCancelled={cancelled}
        listRef={listRef}
      />
    </>
  );
}

// ---------- Month ----------
function MonthView() {
  const [month, setMonth] = useState(null); // "YYYY-MM"; null = this month
  const [picked, setPicked] = useState(null); // the day the student chose
  const [note, setNote] = useState("");
  const listRef = useRef(null);
  const fetchMonth = useCallback(() => getTimetableMonth(month), [month]);
  const { data, error, load } = useLiveTimetable(fetchMonth);

  function cancelled(item, result) {
    setNote(cancelMessage(item, result, data.cancelNoticeHours));
    load();
  }

  function goToMonth(next) {
    setMonth(next);
    setPicked(null);
  }

  // Days from the months either side open that month.
  function pickDay(day) {
    if (!day.startsWith(data.month)) setMonth(day.slice(0, 7));
    setPicked(day);
    scrollToList(listRef);
  }

  if (!data && error) return <p className="notice" role="alert">{error}</p>;
  if (!data) return <p>Loading your timetable...</p>;

  const shown = data.month;
  const isThisMonth = shown === data.thisMonth;
  const inMonth = data.items.filter((i) => i.date.startsWith(shown));
  const changes = inMonth.filter((i) => i.status === "cancelled" || i.status === "moved");
  const lastDay = addDays(`${shiftMonth(shown, 1)}-01`, -1);
  const selected = picked && picked.startsWith(shown)
    ? picked
    : defaultDay(inMonth, data.today, `${shown}-01`, lastDay);

  return (
    <>
      <div className="mt-nav" role="group" aria-label="Choose a month">
        <button type="button" className="btn btn-outline btn-small" onClick={() => goToMonth(shiftMonth(shown, -1))}>
          ← Previous month
        </button>
        <p className="mt-range" aria-live="polite">
          {monthLabel(shown)}
          {isThisMonth && <span className="mt-this-week">This month</span>}
        </p>
        <div className="mt-nav-right">
          {!isThisMonth && (
            <button type="button" className="btn btn-outline btn-small" onClick={() => goToMonth(null)}>This month</button>
          )}
          <button type="button" className="btn btn-outline btn-small" onClick={() => goToMonth(shiftMonth(shown, 1))}>
            Next month →
          </button>
        </div>
      </div>

      {error && <p className="notice" role="alert">{error}</p>}
      {note && <p className="notice mt-flash" role="status">{note}</p>}
      {changes.length > 0 && (
        <p className="notice mt-changes" role="status">
          {plural(changes.length, "lesson")} this month {changes.length === 1 ? "has" : "have"} changed. Check the
          days marked below.
        </p>
      )}

      {inMonth.length === 0 && (
        <p className="mt-empty">
          Nothing booked this month. <Link to="/lessons">Book a lesson</Link>
        </p>
      )}

      <CalendarGrid
        variant="month"
        days={datesBetween(data.from, data.to)}
        items={data.items}
        today={data.today}
        selected={selected}
        onPick={pickDay}
        chipsPerDay={2}
        month={shown}
      />

      <DayDetails
        day={selected}
        items={data.items}
        today={data.today}
        noticeHours={data.cancelNoticeHours}
        onCancelled={cancelled}
        listRef={listRef}
      />
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
  const view = ["month", "history"].includes(searchParams.get("view")) ? searchParams.get("view") : "week";
  const show = (v) => setSearchParams(v === "week" ? {} : { view: v }, { replace: true });

  return (
    <section className="section mt-page">
      <div className="container">
        <ScrollReveal>
          <p className="eyebrow">My timetable</p>
          <h1>{view === "history" ? "Past Lessons" : "My Timetable"}</h1>
          <p className="lead">
            {view === "history"
              ? "Every lesson you've booked or attended, including outside events."
              : `Your booked lessons for the ${view}. Changes from the dojo show up here straight away.`}
          </p>
        </ScrollReveal>

        <div className="mt-tabs" role="tablist" aria-label="Timetable views">
          <button type="button" role="tab" aria-selected={view === "week"} className={view === "week" ? "is-active" : ""} onClick={() => show("week")}>
            Week
          </button>
          <button type="button" role="tab" aria-selected={view === "month"} className={view === "month" ? "is-active" : ""} onClick={() => show("month")}>
            Month
          </button>
          <button type="button" role="tab" aria-selected={view === "history"} className={view === "history" ? "is-active" : ""} onClick={() => show("history")}>
            Past lessons
          </button>
          <Link to="/lessons" className="btn btn-primary btn-small mt-book">Book a lesson</Link>
        </div>

        <div role="tabpanel">
          {view === "week" && <WeekView />}
          {view === "month" && <MonthView />}
          {view === "history" && <HistoryView />}
        </div>
      </div>
    </section>
  );
}

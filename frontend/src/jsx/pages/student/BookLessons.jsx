import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import ScrollReveal from "../../components/ScrollReveal.jsx";
import CancelBooking from "../../components/student/CancelBooking.jsx";
import { getLessons, bookLesson } from "../../../js/services/lessonService.js";
import { formatTime, formatDayHeading, formatShortDate } from "../../../js/utils/formatters.js";
import "../../../css/content.css";
import "../../../css/book-lessons.css";

// FSDP-50 Browse available lessons + FSDP-53 Book a group lesson
// + FSDP-55 Cancel a booking.
// Lessons for the next two weeks at every dojo. Booking uses credits and
// needs an active membership; the server checks every rule again.

// Monday first, values match JavaScript getDay() (0 = Sunday).
const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const NO_FILTERS = { centreId: "", day: "", instructorId: "", suitsBelt: false };

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function levelText(lesson) {
  if (lesson.openToAll) return "All levels";
  if (lesson.minBelt && lesson.maxBelt) return `${lesson.minBelt} to ${lesson.maxBelt}`;
  if (lesson.minBelt) return `${lesson.minBelt} and above`;
  return `Up to ${lesson.maxBelt}`;
}

function dateHeading(ymd) {
  const { weekday, day } = formatDayHeading(ymd);
  return `${weekday}, ${day}`;
}

// One lesson card. "Book" opens a small confirm step inside the card.
function LessonCard({ lesson, credits, noticeHours, confirming, busy, onAsk, onCancel, onConfirm, onBookingCancelled }) {
  const full = lesson.spotsLeft === 0;
  const notEnough = credits < lesson.creditCost;
  const cost = plural(lesson.creditCost, "credit");

  let action;
  if (lesson.bookedByMe) {
    action = (
      <div className="bk-booked-box">
        <p className="bk-booked">Booked ✓</p>
        <CancelBooking lesson={lesson} noticeHours={noticeHours} onCancelled={onBookingCancelled} />
      </div>
    );
  } else if (full) {
    action = <button type="button" className="btn btn-outline btn-small" disabled>Full</button>;
  } else if (confirming) {
    action = (
      <div className="bk-confirm" role="group" aria-label={`Confirm booking for ${lesson.title}`}>
        <p>
          Uses {cost}. You'll have {plural(credits - lesson.creditCost, "credit")} left.
        </p>
        <div className="bk-confirm-buttons">
          <button type="button" className="btn btn-primary btn-small" onClick={onConfirm} disabled={busy}>
            {busy ? "Booking..." : "Confirm"}
          </button>
          <button type="button" className="btn btn-outline btn-small" onClick={onCancel} disabled={busy}>
            Back
          </button>
        </div>
      </div>
    );
  } else {
    action = (
      <button
        type="button"
        className="btn btn-outline btn-small"
        onClick={onAsk}
        disabled={notEnough}
        title={notEnough ? "Not enough credits" : undefined}
      >
        {notEnough ? "Not enough credits" : `Book (${cost})`}
      </button>
    );
  }

  return (
    <article className={`card bk-card${lesson.bookedByMe ? " is-booked" : ""}`}>
      <span className="tag">{formatTime(lesson.startTime)}</span>
      <h3>{lesson.title}</h3>
      {!lesson.openToAll && (
        <p className={`bk-level ${lesson.suitsBelt ? "is-match" : "is-other"}`}>
          {lesson.suitsBelt ? "Recommended for your level" : "Not your level"}
        </p>
      )}
      <dl className="details">
        <div><dt>Time</dt><dd>{formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}</dd></div>
        <div><dt>Dojo</dt><dd>{lesson.centre}</dd></div>
        <div><dt>Led by</dt><dd>{lesson.instructor}</dd></div>
        <div><dt>Level</dt><dd>{levelText(lesson)}</dd></div>
        <div>
          <dt>Spots</dt>
          <dd className={lesson.spotsLeft <= 3 ? "bk-low" : ""}>{full ? "Full" : `${lesson.spotsLeft} left`}</dd>
        </div>
      </dl>
      {action}
    </article>
  );
}

export default function BookLessons() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text, link }
  const [reloadCount, setReloadCount] = useState(0);
  const latestRequest = useRef(0);

  // Reload whenever a filter changes (or after a booking fails). Only the
  // newest response is used, so quickly changing filters can't show an older list.
  useEffect(() => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    getLessons(filters)
      .then((result) => {
        if (requestId !== latestRequest.current) return;
        setData(result);
        setLoadError("");
      })
      .catch((err) => {
        if (requestId === latestRequest.current) setLoadError(err.message);
      })
      .finally(() => {
        if (requestId === latestRequest.current) setLoading(false);
      });
  }, [filters, reloadCount]);

  function changeFilter(name, value) {
    setConfirmId(null);
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setConfirmId(null);
    setFilters(NO_FILTERS);
  }

  async function confirmBooking(lesson) {
    setBusyId(lesson.id);
    setMessage(null);
    try {
      const result = await bookLesson(lesson.id);
      setData((current) => ({
        ...current,
        credits: result.creditsLeft,
        lessons: current.lessons.map((l) =>
          l.id === lesson.id ? { ...l, bookedByMe: true, spotsLeft: Math.max(0, l.spotsLeft - 1) } : l
        ),
      }));
      setMessage({
        type: "success",
        text: `Booked ${lesson.title} on ${formatShortDate(lesson.date)} at ${formatTime(lesson.startTime)}, ${lesson.centre}. You have ${plural(result.creditsLeft, "credit")} left.`,
        link: { to: "/dashboard", label: "Back to dashboard" },
      });
    } catch (err) {
      const needsPayment = err.status === 403 || /credit/i.test(err.message);
      setMessage({
        type: "error",
        text: err.message,
        link: needsPayment ? { to: "/payments", label: "Go to Payments" } : null,
      });
      // Someone else may have taken the last spot, so refresh the numbers.
      if (err.status === 409 || err.status === 404) setReloadCount((n) => n + 1);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  function bookingCancelled(lesson, result) {
    setData((current) => ({
      ...current,
      credits: result.creditsLeft,
      lessons: current.lessons.map((l) =>
        l.id === lesson.id ? { ...l, bookedByMe: false, spotsLeft: l.spotsLeft + 1 } : l
      ),
    }));
    const when = `${lesson.title} on ${formatShortDate(lesson.date)} at ${formatTime(lesson.startTime)}`;
    setMessage({
      type: "success",
      text: result.refunded > 0
        ? `Cancelled ${when}. ${plural(result.refunded, "credit")} returned, so you have ${plural(result.creditsLeft, "credit")}.`
        : `Cancelled ${when}. Your credit wasn't returned because it was less than ${data.cancelNoticeHours} hours before the lesson.`,
      link: null,
    });
  }

  const lessons = data?.lessons || [];
  const groups = [];
  for (const lesson of lessons) {
    const last = groups[groups.length - 1];
    if (last && last.date === lesson.date) last.items.push(lesson);
    else groups.push({ date: lesson.date, items: [lesson] });
  }
  const filtered = filters.centreId || filters.day !== "" || filters.instructorId || filters.suitsBelt;
  const membershipActive = data?.membership?.active;

  return (
    <section className="section bk-page">
      <div className="container">
        <ScrollReveal>
          <p className="eyebrow">Book lessons</p>
          <h1>Book a Lesson</h1>
          <p className="lead">
            Lessons at every dojo for the next {data ? data.daysAhead / 7 : 2} weeks. Each group lesson costs 1 credit.
          </p>
          <p className="bk-policy">
            Cancel at least {data?.cancelNoticeHours ?? 24} hours before a lesson to get your credit back.
            Later cancellations lose the credit. There are no make-up lessons, even with an MC.
          </p>
        </ScrollReveal>

        {data && (
          <ul className="stats bk-stats">
            <li>
              <strong>{data.credits}</strong>
              <span>{data.credits === 1 ? "Credit" : "Credits"} left</span>
            </li>
            <li>
              <strong>{membershipActive ? "Active" : data.membership ? "Expired" : "None"}</strong>
              <span>
                {membershipActive
                  ? `Membership until ${formatShortDate(data.membership.endDate)}`
                  : "Membership"}
              </span>
            </li>
            <li className="bk-stats-link">
              <Link to="/payments" className="btn btn-outline btn-small">Buy credits</Link>
            </li>
          </ul>
        )}

        {data && !membershipActive && (
          <p className="notice bk-notice">
            You need an active membership to book lessons.{" "}
            <Link to="/payments">{data.membership ? "Renew your membership" : "Get a membership"}</Link>.
          </p>
        )}
        {data && membershipActive && data.credits === 0 && (
          <p className="notice bk-notice">
            You have no credits left. <Link to="/payments">Top up credits</Link> to book a lesson.
          </p>
        )}

        <div className="filters bk-filters">
          <label>
            Dojo
            <select value={filters.centreId} onChange={(e) => changeFilter("centreId", e.target.value)}>
              <option value="">All dojos</option>
              {data?.filters.centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            Day
            <select value={filters.day} onChange={(e) => changeFilter("day", e.target.value)}>
              <option value="">Any day</option>
              {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
          <label>
            Instructor
            <select value={filters.instructorId} onChange={(e) => changeFilter("instructorId", e.target.value)}>
              <option value="">Any instructor</option>
              {data?.filters.instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <label className="bk-check">
            <input
              type="checkbox"
              checked={filters.suitsBelt}
              onChange={(e) => changeFilter("suitsBelt", e.target.checked)}
            />
            Suits my belt
          </label>
          {filtered && (
            <button type="button" className="btn btn-outline btn-small bk-reset" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {loadError && <p className="notice bk-message is-error" role="alert">{loadError}</p>}

        {!data && loading && <p>Loading lessons...</p>}

        {data && (
          <div aria-live="polite" aria-busy={loading}>
            <p className="result-count">
              {loading ? "Updating..." : `Showing ${plural(lessons.length, "lesson")}`}
            </p>
            {lessons.length === 0 && !loading && (
              <p className="bk-empty">
                {filtered
                  ? "No lessons match your filters. Try clearing them."
                  : "There are no lessons to book in the next two weeks."}
              </p>
            )}
            {groups.map((g) => (
              <section key={g.date} className="day-group" aria-labelledby={`day-${g.date}`}>
                <h2 id={`day-${g.date}`} className="day-heading">{dateHeading(g.date)}</h2>
                <div className="grid">
                  {g.items.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      credits={data.credits}
                      noticeHours={data.cancelNoticeHours}
                      confirming={confirmId === lesson.id}
                      busy={busyId === lesson.id}
                      onAsk={() => { setMessage(null); setConfirmId(lesson.id); }}
                      onCancel={() => setConfirmId(null)}
                      onConfirm={() => confirmBooking(lesson)}
                      onBookingCancelled={(result) => bookingCancelled(lesson, result)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Booking result pops up at the bottom of the screen, so it's seen
          even when the student has scrolled far down the list. It's placed
          on <body> because the page's arrive animation would otherwise stop
          position: fixed from sticking to the screen. */}
      {message && createPortal(
        <div
          className={`bk-toast ${message.type === "error" ? "is-error" : "is-success"}`}
          role={message.type === "error" ? "alert" : "status"}
        >
          <p>
            {message.text}
            {message.link && <> <Link to={message.link.to}>{message.link.label}</Link></>}
          </p>
          <button type="button" className="bk-toast-close" onClick={() => setMessage(null)} aria-label="Close message">
            ×
          </button>
        </div>,
        document.body
      )}
    </section>
  );
}

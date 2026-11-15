import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getToday, getOffers, getUpcomingGradings, getAttendanceTrends } from "../../../js/services/instructorService.js";
import { formatTime, todayString } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import PrivateLessonCard from "../../components/PrivateLessonCard.jsx";
import MovedNote from "../../components/MovedNote.jsx";
import ScrollReveal from "../../components/ScrollReveal.jsx";
import CountUp from "../../components/CountUp.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "2026-12-13" -> "13 Dec"
function dayMonth(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

// Today's group classes and private lessons in time order, each marked done
// (already ended), next (the first one that hasn't ended) or later.
function todaysLessons(classes, privates) {
  const today = todayString();
  const ended = (end) => new Date(`${today}T${end}`) < new Date();
  const items = [
    ...classes.map((c) => ({ key: `c${c.id}`, title: c.title, centre: c.centre, startTime: c.startTime, endTime: c.endTime, booked: c.booked, rosterId: c.id })),
    ...privates.map((p) => ({ key: `p${p.id}`, title: `1-on-1 with ${p.studentName}`, centre: p.centre, startTime: p.startTime, endTime: p.endTime, booked: 1 })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));
  let nextFound = false;
  return items.map((item) => {
    if (ended(item.endTime)) return { ...item, state: "done" };
    if (!nextFound) {
      nextFound = true;
      return { ...item, state: "next" };
    }
    return { ...item, state: "later" };
  });
}

// The big line in the hero, and the smaller one under it.
function heroLines(lessons, tomorrow) {
  const tomorrowText = tomorrow === null ? "" : ` Tomorrow: ${count(tomorrow, "class", "classes")}.`;
  if (lessons.length === 0) return { headline: "No classes today.", lead: `A quiet day.${tomorrowText}` };
  const next = lessons.find((l) => l.state === "next");
  if (!next) return { headline: "All of today's classes are done.", lead: `Nice work.${tomorrowText}` };
  return {
    headline: `${count(lessons.length, "class", "classes")} today. Next at ${formatTime(next.startTime)}.`,
    lead: `${next.title} at ${next.centre} · ${count(next.booked, "student")} booked.`,
  };
}

// One stop on the "your day" track.
function TrackStop({ lesson }) {
  const label = lesson.state === "done" ? "Done" : lesson.state === "next" ? "Next" : "Later";
  return (
    <li className={`today-stop is-${lesson.state}`}>
      <span className="today-dot" aria-hidden="true"></span>
      <span className="today-time">{formatTime(lesson.startTime)}</span>
      <span className="today-state">{label}</span>
      <span className="visually-hidden">: {lesson.title} at {lesson.centre}</span>
    </li>
  );
}

// Instructor landing page (FSDP-68): "your day at a glance" hero with today's
// classes as a track, a few counts and quick links, then today's class cards.
export default function InstructorDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState(null);
  const [privates, setPrivates] = useState([]);
  const [tomorrow, setTomorrow] = useState(null);
  const [offers, setOffers] = useState(null);
  const [gradings, setGradings] = useState([]);
  const [trends, setTrends] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getToday()
      .then((data) => { setClasses(data.classes); setPrivates(data.privateLessons || []); })
      .catch((err) => setError(err.message));
    // The rest only adds to the hero, so a failure there just leaves a number out.
    getToday(todayString(1)).then((d) => setTomorrow(d.classes.length + (d.privateLessons || []).length)).catch(() => {});
    getOffers().then(setOffers).catch(() => {});
    getUpcomingGradings().then(setGradings).catch(() => {});
    getAttendanceTrends().then(setTrends).catch(() => {});
  }, []);

  const lessons = classes ? todaysLessons(classes, privates) : [];
  const { headline, lead } = classes ? heroLines(lessons, tomorrow) : { headline: "Loading your day...", lead: "" };
  const nextLesson = lessons.find((l) => l.state === "next");
  // Take Attendance opens the next class that has a roster, or the last one today.
  const rosterTarget = (nextLesson?.rosterId && nextLesson) || [...lessons].reverse().find((l) => l.rosterId);
  const examining = gradings.find((g) => g.isExaminer && g.isUpcoming !== false);
  const bookedToday = lessons.reduce((sum, l) => sum + (l.booked || 0), 0);

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="ihero" aria-labelledby="ihero-title">
        <div className="container ihero-inner">
          <ScrollReveal className="ihero-main">
            <p className="eyebrow">Welcome back, {user.fullName}</p>
            <h1 id="ihero-title" className="ihero-title">{error ? "Today's classes couldn't be loaded." : headline}</h1>
            {lead && <p className="ihero-lead">{lead}</p>}

            {lessons.length > 0 && (
              <ol className="today-track" aria-label="Today's classes">
                {lessons.map((lesson) => <TrackStop key={lesson.key} lesson={lesson} />)}
                {tomorrow !== null && (
                  <li className="today-stop is-tomorrow">
                    <span className="today-dot" aria-hidden="true"></span>
                    <span className="today-time">Tomorrow</span>
                    <span className="today-state">{count(tomorrow, "class", "classes")}</span>
                  </li>
                )}
              </ol>
            )}

            <ul className="ihero-stats">
              <li><strong><CountUp to={bookedToday} /></strong><span>Booked today</span></li>
              <li><strong>{offers === null ? "–" : <CountUp to={offers.length} />}</strong><span>{offers?.length === 1 ? "Request waiting" : "Requests waiting"}</span></li>
              <li><strong>{trends ? <CountUp to={trends.stats.ready} /> : "–"}</strong><span>Ready to grade</span></li>
              <li>
                <strong>{trends?.summary.recentRate == null ? "–" : <CountUp to={trends.summary.recentRate} suffix="%" />}</strong>
                <span>Attendance, 4 weeks</span>
              </li>
            </ul>
          </ScrollReveal>

          <ScrollReveal className="ihero-actions" delay={150}>
            <Link to={rosterTarget ? `/instructor/classes/${rosterTarget.rosterId}` : "/instructor/calendar"} className="quick-card is-primary">
              <span className="quick-kanji" aria-hidden="true">出</span>
              <span className="quick-text">
                {rosterTarget ? "Take attendance" : "Open your calendar"}
                <span className="quick-sub">{rosterTarget ? `${rosterTarget.title}, ${formatTime(rosterTarget.startTime)}` : "No class to mark today"}</span>
              </span>
              <span className="quick-arrow" aria-hidden="true">→</span>
            </Link>
            <Link to="/instructor/students" className="quick-card">
              <span className="quick-kanji" aria-hidden="true">生</span>
              <span className="quick-text">
                Your students
                <span className="quick-sub">{trends ? `${trends.stats.students} students · ${trends.stats.droppingOff} dropping off` : "Progress and readiness"}</span>
              </span>
              <span className="quick-arrow" aria-hidden="true">→</span>
            </Link>
            <Link to={examining ? `/instructor/gradings/${examining.id}/assess` : "/instructor/grading"} className="quick-card">
              <span className="quick-kanji" aria-hidden="true">昇</span>
              <span className="quick-text">
                Grading
                <span className="quick-sub">{examining ? `You're examining ${dayMonth(examining.date)}` : "Upcoming gradings and applicants"}</span>
              </span>
              <span className="quick-arrow" aria-hidden="true">→</span>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji" aria-hidden="true">合</span>
        <div className="container">
          <ScrollReveal>
            <p className="eyebrow">
              {new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h2>Today's classes</h2>
            {error && <p className="form-error" role="alert">{error}</p>}
            {classes?.length === 0 && privates.length === 0 && <p className="notice">You have no classes today.</p>}
          </ScrollReveal>

          {(classes?.length > 0 || privates.length > 0) && (
            <div className="grid instructor-classes">
              {privates.map((item, i) => (
                <ScrollReveal key={`private-${item.id}`} delay={i * 90}>
                  <PrivateLessonCard lesson={item} />
                </ScrollReveal>
              ))}
              {classes.map((item, i) => (
                <ScrollReveal key={item.id} as="article" className="card instructor-class-card" delay={(privates.length + i) * 90}>
                  <span className="tag">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                  <h3 className="instructor-card-title">{item.title}</h3>
                  <dl className="details">
                    <div><dt>Dojo</dt><dd>{item.centre}</dd></div>
                    <div><dt>Booked</dt><dd>{item.booked}</dd></div>
                    <div><dt>Marked</dt><dd>{item.marked}</dd></div>
                  </dl>
                  <MovedNote session={item} />
                  <Link to={`/instructor/classes/${item.id}`} className="btn btn-outline btn-small">
                    Take Attendance
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

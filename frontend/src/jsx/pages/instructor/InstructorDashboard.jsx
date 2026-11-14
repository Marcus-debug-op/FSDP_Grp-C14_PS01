import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getToday } from "../../../js/services/instructorService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import PrivateLessonCard from "../../components/PrivateLessonCard.jsx";
import MovedNote from "../../components/MovedNote.jsx";
import ScrollReveal from "../../components/ScrollReveal.jsx";
import useHeroScrollFade from "../../../js/hooks/useHeroScrollFade.js";
import "../../../css/auth.css";
import "../../../css/instructor.css";

// Hero sentence, based on today's classes and private lessons.
function heroText(classes, privates) {
  if (!classes) return "Loading today's classes...";
  if (classes.length === 0 && privates.length === 0) return "You have no classes today.";
  if (classes.length === 0) {
    const first = privates[0];
    return `You have ${privates.length === 1 ? "a private lesson" : `${privates.length} private lessons`} today. `
      + `First is with ${first.studentName} at ${formatTime(first.startTime)}, ${first.centre}.`;
  }
  const next = classes.find((item) => item.marked === 0);
  if (!next) return "Attendance is marked for all of today's classes.";
  const count = classes.length === 1 ? "1 class" : `${classes.length} classes`;
  return `You have ${count} today. Next is ${next.title} at ${formatTime(next.startTime)}, ${next.centre}.`;
}

// Instructor landing page: same hero as the student dashboard, then today's
// classes, each linking to its roster.
export default function InstructorDashboard() {
  const { user } = useAuth();
  const heroRef = useRef(null);
  useHeroScrollFade(heroRef);
  const [classes, setClasses] = useState(null);
  const [privates, setPrivates] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getToday()
      .then((data) => { setClasses(data.classes); setPrivates(data.privateLessons || []); })
      .catch((err) => setError(err.message));
  }, []);

  const nextClass = classes?.find((item) => item.marked === 0);

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="hero" ref={heroRef}>
        <div className="container hero-content hero-scroll-content">
          <p className="eyebrow">Welcome back, {user.fullName}</p>
          <p className="hero-kanji" aria-hidden="true">指導</p>
          <h1>Your Classes Today</h1>
          <span className="rule" aria-hidden="true"></span>
          <p className="hero-text" aria-live="polite">{error ? "Today's classes could not be loaded." : heroText(classes, privates)}</p>
          {nextClass && (
            <div className="button-row center-row">
              <Link to={`/instructor/classes/${nextClass.id}`} className="btn btn-primary">Take Attendance</Link>
            </div>
          )}
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

            {(classes?.length > 0 || privates.length > 0) && (
              <div className="grid instructor-classes">
                {privates.map((item) => <PrivateLessonCard lesson={item} key={`private-${item.id}`} />)}
                {classes.map((item) => (
                  <article className="card" key={item.id}>
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
                  </article>
                ))}
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

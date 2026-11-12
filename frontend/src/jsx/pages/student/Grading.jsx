import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProgressLayout, { Swatch, Bar } from "../../components/student/ProgressLayout.jsx";
import { getEligibility } from "../../../js/services/gradingService.js";
import { colourHex, formatDate } from "../../../js/utils/beltFormat.js";
import "../../../css/grading.css";

const APPLICATION_LABEL = {
  pending: "Submitted",
  approved: "Accepted",
  passed: "Submitted for processing",
  failed: "Submitted for processing",
  withdrawn: "Withdrawn",
  rejected: "Not accepted",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Grading() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getEligibility().then(setData).catch((err) => setError(err.message));
  }, []);

  return (
    <ProgressLayout title="Grading" subtitle="Where you stand for your next belt and when the next grading is.">
      <Body data={data} error={error} />
    </ProgressLayout>
  );
}

function Body({ data, error }) {
  if (error) return <p className="prog-alert" role="alert">{error}</p>;
  if (!data) return <p className="prog-loading" aria-live="polite">Checking your eligibility…</p>;

  if (!data.profileReady) {
    return (
      <article className="prog-card">
        <h2 className="prog-card-title">Your belt isn't recorded yet</h2>
        <p className="prog-muted">Ask the front desk to set up your profile and this page will start working.</p>
      </article>
    );
  }

  const { currentBelt, nextBelt, atHighestBelt, progress, eligible, unmet, nextGrading, application, syllabus } = data;

  if (atHighestBelt) {
    return (
      <article className="prog-card grad-status">
        <BeltPath current={currentBelt} />
        <h2 className="grad-status-title">You're at the highest recorded belt</h2>
        <p className="prog-muted">
          Nothing to apply for yet. Since this belt you've trained {progress.classes.attended} classes
          and {progress.hours.attended} hours.
        </p>
      </article>
    );
  }

  const { classes, timeAtBelt, hours } = progress;
  const noMinMonths = timeAtBelt.requiredMonths === 0;

  return (
    <>
      <article className={eligible ? "prog-card grad-status is-ok" : "prog-card grad-status"}>
        <div className="grad-status-top">
          <BeltPath current={currentBelt} next={nextBelt} />
          <span className={eligible ? "prog-pill is-ok" : "prog-pill"}>
            {eligible ? "Eligible" : "Not yet eligible"}
          </span>
        </div>
        <h2 className="grad-status-title">
          {eligible ? `You can grade for ${nextBelt.name}` : `Keep training for ${nextBelt.name}`}
        </h2>
        {eligible ? (
          <p className="prog-muted">
            You meet the requirements. Your instructor can advise, but whether to apply is your choice.
          </p>
        ) : (
          <ul className="grad-chips">
            {unmet.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        )}
      </article>

      <div className="grad-tiles">
        <Stat
          label="Classes attended"
          value={`${classes.attended}`}
          unit={`/ ${classes.required}`}
          percent={classes.percent}
          met={classes.met}
          note={classes.met ? "Requirement met" : `${classes.remaining} to go`}
        />
        <Stat
          label="Time at belt"
          value={`${timeAtBelt.months}`}
          unit={noMinMonths ? "months" : `/ ${timeAtBelt.requiredMonths} months`}
          percent={timeAtBelt.percent}
          met={timeAtBelt.met}
          note={noMinMonths ? "No minimum for this grade" : timeAtBelt.met ? "Requirement met" : `${timeAtBelt.remainingMonths} to go`}
        />
        <Stat
          label="Training hours"
          value={`${hours.attended}`}
          unit="hrs"
          note={
            hours.externalClasses > 0
              ? `Excludes ${hours.externalClasses} outside session${hours.externalClasses === 1 ? "" : "s"}`
              : "Since this belt"
          }
        />
      </div>

      <div className="prog-grid">
        <NextGrading session={nextGrading} application={application} />

        <article className="prog-card">
          <div className="prog-card-head">
            <h2 className="prog-card-title">What you'll demonstrate</h2>
            {syllabus.length > 0 && <span className="prog-count">{syllabus.length}</span>}
          </div>
          {syllabus.length > 0 ? (
            <ol className="grad-syllabus">
              {syllabus.map((item) => <li key={item}>{item}</li>)}
            </ol>
          ) : (
            <p className="prog-muted">The {nextBelt.name} syllabus hasn't been published yet.</p>
          )}
        </article>
      </div>

      <p className="prog-footnote">
        Applying and paying the exam fee is coming soon. <Link to="/belt-progress">Back to My Belt</Link>
      </p>
    </>
  );
}

function BeltPath({ current, next }) {
  return (
    <p className="grad-path">
      <span className="grad-path-step">
        <Swatch colour={colourHex(current.colour)} />
        {current.name}
      </span>
      {next && (
        <>
          <span className="grad-path-arrow" aria-hidden="true">→</span>
          <span className="grad-path-step is-next">
            <Swatch colour={colourHex(next.colour)} />
            {next.name}
          </span>
        </>
      )}
    </p>
  );
}

function Stat({ label, value, unit, percent, met, note }) {
  return (
    <article className="prog-card grad-stat">
      <p className="prog-label">{label}</p>
      <p className="grad-stat-value">
        {value}
        {unit && <span>{unit}</span>}
      </p>
      {percent !== undefined && <Bar percent={percent} label={`${label}: ${value} ${unit || ""}`} />}
      {note && <p className={met ? "grad-stat-note is-ok" : "grad-stat-note"}>{note}</p>}
    </article>
  );
}

function NextGrading({ session, application }) {
  if (!session) {
    return (
      <article className="prog-card">
        <h2 className="prog-card-title">Next grading</h2>
        <p className="prog-muted">No grading session is scheduled yet. The date will appear here once one is.</p>
      </article>
    );
  }

  const [, m, d] = session.gradingDate.split("-").map(Number);
  const deadline = !session.registrationOpen
    ? "Registration closed"
    : session.daysToDeadline === 0
      ? "Apply by today"
      : `${session.daysToDeadline} day${session.daysToDeadline === 1 ? "" : "s"} left to apply`;

  return (
    <article className="prog-card">
      <h2 className="prog-card-title">Next grading</h2>
      <div className="grad-event">
        <div className="grad-date" aria-hidden="true">
          <span>{MONTHS[m - 1]}</span>
          <strong>{d}</strong>
        </div>
        <div className="grad-event-info">
          <p className="grad-event-title">{formatDate(session.gradingDate)}</p>
          <p className="prog-muted">
            {[session.startTime, session.centreName].filter(Boolean).join(" · ")}
          </p>
          <span className={session.registrationOpen ? "prog-pill is-accent" : "prog-pill is-closed"}>
            {deadline}
          </span>
        </div>
      </div>
      <p className="grad-event-foot">
        Apply by <strong>{formatDate(session.registrationClosesOn)}</strong>
      </p>
      {application && (
        <p className="grad-applied">
          Applied {formatDate(application.appliedOn)} ·{" "}
          <strong>{APPLICATION_LABEL[application.status] || application.status}</strong>
        </p>
      )}
    </article>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProgressLayout, { Bar } from "../../components/student/ProgressLayout.jsx";
import { getEligibility, applyForGrading, getMyApplications } from "../../../js/services/gradingService.js";
import { colourHex, formatDate } from "../../../js/utils/beltFormat.js";
import "../../../css/grading.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// An application in one of these states no longer counts, so the student may
// apply for the same grading again. Same rule as the server uses.
const DEAD_APPLICATION = ["withdrawn", "rejected"];

const fmtMoney = (cents) =>
  (cents / 100).toLocaleString("en-SG", { style: "currency", currency: "SGD" });

export default function Grading() {
  const [data, setData] = useState(null);
  const [tracker, setTracker] = useState(null);
  const [error, setError] = useState("");
  // Stripe sends the student back with ?cancelled=1 if they leave checkout
  // without paying (see cancel_url in gradingController.applyForGrading).
  const [params] = useSearchParams();

  useEffect(() => {
    getEligibility().then(setData).catch((err) => setError(err.message));
    // FSDP-66 status tracker. A separate call so the page still renders the
    // progress and eligibility if this one fails; the tracker just stays hidden.
    getMyApplications().then(setTracker).catch(() => setTracker(null));
  }, []);

  return (
    <ProgressLayout title="Grading" subtitle="Where you stand for your next belt and when the next grading is.">
      <Body data={data} tracker={tracker} error={error} cancelled={params.get("cancelled") === "1"} />
    </ProgressLayout>
  );
}

function Body({ data, tracker, error, cancelled }) {
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

  const { currentBelt, nextBelt, atHighestBelt, progress, eligible, unmet, nextGrading, application, syllabus,
          canApply, fee } = data;
  const hasLiveApplication = Boolean(application && !DEAD_APPLICATION.includes(application.status));

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

  // the application to track is the most recent live one (the tracker
  // returns them newest first). The one tied to the grading shown below, if
  // any, also drives that card's status line so the two always agree.
  const trackedApplication = tracker?.applications?.[0] || null;
  const sessionApplication = nextGrading
    ? tracker?.applications?.find((a) => a.gradingSessionId === nextGrading.id) || null
    : null;

  return (
    <>
      {/* Back from Stripe without paying. Nothing was created, so say so
          plainly -- but not if they have since applied successfully. */}
      {cancelled && !hasLiveApplication && (
        <p className="grad-notice" role="status">
          Payment was cancelled. You haven't been charged and no application was made.
        </p>
      )}

      {trackedApplication && tracker?.steps && (
        <StatusTimeline steps={tracker.steps} application={trackedApplication} />
      )}

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
        <NextGrading
          session={nextGrading}
          application={application}
          statusLabel={sessionApplication?.statusLabel}
          hasLiveApplication={hasLiveApplication}
          canApply={canApply}
          fee={fee}
          eligible={eligible}
          nextBelt={nextBelt}
        />

        <SyllabusCard syllabus={syllabus} nextBelt={nextBelt} />
      </div>
    </>
  );
}

// What the student must show at the grading, from belt_requirements
// (migration 013, transcribed from the official syllabus sheets).
//
// Each row is stored as "Technique: what is tested", e.g. "Ikkyo: Katatedori,
// Shomenuchi". The part before the first ": " is shown as the heading of the
// item; a row without one is shown whole.
function SyllabusCard({ syllabus, nextBelt }) {
  const items = syllabus.map((row) => {
    const split = row.indexOf(": ");
    return split > 0
      ? { technique: row.slice(0, split), detail: row.slice(split + 2) }
      : { technique: row, detail: "" };
  });

  return (
    <article className="prog-card">
      <div className="prog-card-head">
        <h2 className="prog-card-title">What you'll demonstrate</h2>
        {items.length > 0 && <span className="prog-count">{items.length}</span>}
      </div>

      {items.length > 0 ? (
        <>
          <p className="prog-muted grad-syllabus-intro">
            The {nextBelt.name} grading covers these techniques and the attacks listed with each.
          </p>
          <ol className="grad-syllabus">
            {items.map((item, i) => (
              <li key={i}>
                <span className="grad-syl-text">
                  <span className="grad-syl-tech">{item.technique}</span>
                  {item.detail && <span className="grad-syl-detail">{item.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
          {/* The children's sheets say each grade covers the grades before it
              ("Syllabus coverage" bars, and Part 2 "adds on to Part 1"). The
              adult sheet says no such thing, so this is only shown for children. */}
          {nextBelt.ladder === "children" && (
            <p className="grad-syllabus-note">
              Children's gradings can also include techniques from earlier grades, so keep practising those too.
            </p>
          )}
        </>
      ) : (
        <p className="prog-muted">The {nextBelt.name} syllabus hasn't been published yet.</p>
      )}
    </article>
  );
}

function BeltPath({ current, next }) {
  return (
    <div className="grad-path">
      <span className="grad-path-step is-from">
        <span className="grad-path-dot" style={{ "--belt": colourHex(current.colour) }} aria-hidden="true" />
        <span className="grad-path-info">
          <span className="grad-path-cap">Current</span>
          <span className="grad-path-name">{current.name}</span>
        </span>
      </span>
      {next && (
        <>
          <span className="grad-path-arrow" aria-hidden="true">→</span>
          <span className="grad-path-step is-next">
            <span className="grad-path-dot" style={{ "--belt": colourHex(next.colour) }} aria-hidden="true" />
            <span className="grad-path-info">
              <span className="grad-path-cap">Next up</span>
              <span className="grad-path-name">{next.name}</span>
            </span>
          </span>
        </>
      )}
    </div>
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

// FSDP-65: the Apply button, or a line saying why there isn't one.
//
// The button only appears when the server says canApply -- eligible, before
// the deadline, not already applied, and with an exam fee set. The server
// checks all of that again when the button is pressed, so this is only what
// the student sees, never the gate itself.
function ApplyPanel({ session, hasLiveApplication, canApply, fee, eligible, nextBelt }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Already applied: the "Applied ..." line above says everything needed.
  if (hasLiveApplication) return null;

  if (canApply) {
    async function handleApply() {
      setBusy(true);
      setError("");
      try {
        // On success the browser leaves for Stripe, so `busy` stays true and
        // the button can't be pressed a second time on the way out.
        await applyForGrading(session.id);
      } catch (err) {
        setError(err.message);
        setBusy(false);
      }
    }

    return (
      <div className="grad-apply">
        <p className="grad-apply-fee">
          <span>Exam fee for {nextBelt.name}</span>
          <strong>{fmtMoney(fee.amountCents)}</strong>
        </p>
        <p className="prog-muted">
          Applying is your decision. You'll pay the exam fee securely through Stripe, and your
          application is only submitted once the payment goes through.
        </p>
        {error && <p className="prog-alert" role="alert">{error}</p>}
        <button type="button" className="prog-btn grad-apply-btn" onClick={handleApply} disabled={busy}>
          {busy ? "Opening secure payment…" : `Apply and pay ${fmtMoney(fee.amountCents)}`}
        </button>
      </div>
    );
  }

  // No button. Say why, so it never looks like the page is broken.
  let reason = null;
  if (!eligible) {
    reason = fee
      ? `The exam fee for ${nextBelt.name} is ${fmtMoney(fee.amountCents)}. You can apply once you meet the requirements above.`
      : null;
  } else if (!session.registrationOpen) {
    reason = "Registration for this grading has closed, so you can't apply for it.";
  } else if (!fee) {
    reason = `The exam fee for ${nextBelt.name} hasn't been set up yet, so applications aren't open. Please ask the front desk.`;
  }
  return reason ? <p className="grad-apply-note">{reason}</p> : null;
}

// the application status tracker. Draws the whole four-step journey
// from `steps`, with every step up to the one reached marked done and the
// reached one called out. Dates come from the application where the data has
// one for that step. Grading results are out of scope, so the furthest this
// ever shows is "Submitted for processing".
function StatusTimeline({ steps, application }) {
  // The date to show under each step, by its position. Steps not yet reached,
  // and reached steps the data has no date for, simply show no date.
  const dateForStep = [
    application.appliedOn,                       // 1 Submitted
    application.acceptedOn,                       // 2 Accepted
    application.assessedOn,                        // 3 Assessed
    application.assessedOn,                         // 4 Submitted for processing
  ];

  return (
    <article className="prog-card grad-track">
      <div className="prog-card-head">
        <h2 className="prog-card-title">Your application</h2>
        <span className="prog-pill is-accent">{application.statusLabel}</span>
      </div>
      <p className="prog-muted">
        {application.belt.name} · grading on {formatDate(application.gradingDate)}
        {application.centreName ? ` · ${application.centreName}` : ""}
      </p>

      <ol className="grad-steps" role="list">
        {steps.map((s, i) => {
          const reached = i < application.step;
          const current = i === application.step - 1;
          const when = dateForStep[i];
          const cls = ["grad-step", reached ? "is-done" : "", current ? "is-current" : ""]
            .filter(Boolean).join(" ");
          return (
            <li key={s.key} className={cls}>
              <span className="grad-step-dot" aria-hidden="true">{reached ? "✓" : i + 1}</span>
              <span className="grad-step-text">
                <span className="grad-step-label">{s.label}</span>
                {reached && when && <span className="grad-step-date">{formatDate(when)}</span>}
                {current && <span className="grad-step-now">Current stage</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="grad-track-foot">
        Your result and any belt promotion are confirmed separately by your instructor — they aren't shown here.
      </p>
    </article>
  );
}

function NextGrading({ session, application, statusLabel, hasLiveApplication, canApply, fee, eligible, nextBelt }) {
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
            {[
              session.ladder === "children" ? "Children's grading" : session.ladder === "adult" ? "Adult grading" : null,
              session.startTime,
              session.centreName,
            ].filter(Boolean).join(" · ")}
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
          Applied {formatDate(application.appliedOn)}
          {statusLabel && <> · <strong>{statusLabel}</strong></>}
        </p>
      )}
      <ApplyPanel
        session={session}
        hasLiveApplication={hasLiveApplication}
        canApply={canApply}
        fee={fee}
        eligible={eligible}
        nextBelt={nextBelt}
      />
    </article>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GradingProgress from "../../components/student/GradingProgress.jsx";
import { getEligibility } from "../../../js/services/gradingService.js";
import { colourHex, formatDate } from "../../../js/utils/beltFormat.js";
import "../../../css/grading.css";

// grading eligibility, with progress bar inside it.
//
// Read-only. Applying and paying and the full status timeline
// are the next two stories and will slot into this page.

// How an application's stored status reads to a student. Deliberately coarse:
// show as submitted for processing and never reveal the outcome here.
const APPLICATION_LABEL = {
  pending: "Submitted",
  approved: "Accepted",
  passed: "Submitted for processing",
  failed: "Submitted for processing",
  withdrawn: "Withdrawn",
  rejected: "Not accepted",
};

export default function Grading() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getEligibility().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Shell>
        <p className="notice" role="alert">{error}</p>
        <div className="button-row">
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </Shell>
    );
  }

  if (!data) {
    return <Shell><p aria-live="polite">Checking your eligibility...</p></Shell>;
  }

  if (!data.profileReady) {
    return (
      <Shell>
        <p className="notice">
          Your belt hasn't been recorded yet, so there's nothing to grade from. Ask the front
          desk to set up your profile and this page will start working.
        </p>
        <div className="button-row">
          <Link to="/dashboard" className="btn btn-outline">Back to Dashboard</Link>
        </div>
      </Shell>
    );
  }

  const { currentBelt, nextBelt, atHighestBelt, progress, eligible, unmet,
          nextGrading, application, syllabus } = data;

  const currentCard = (
    <article className="grad-card grad-current">
      <span
        className="grad-belt-stripe"
        style={{ background: colourHex(currentBelt.colour) }}
        aria-hidden="true"
      />
      <p className="grad-card-label">Current belt</p>
      <h2 className="grad-belt-name">
        <span
          className="belt-swatch grad-swatch"
          style={{ background: colourHex(currentBelt.colour) }}
          aria-hidden="true"
        />
        {currentBelt.name}
      </h2>
      <p className="grad-card-note">
        Awarded {formatDate(currentBelt.awardedOn)} · <Link to="/belt-progress">My Belt</Link>
      </p>
    </article>
  );

  if (atHighestBelt) {
    return (
      <Shell wide>
        <div className="grad-grid">
          <div className="grad-col">{currentCard}</div>
          <div className="grad-col">
            <article className="grad-card">
              <h2 className="grad-card-title">You're at the highest recorded belt</h2>
              <p className="grad-card-note">
                There's no higher rank in the system yet, so there's nothing to apply for. Your
                training since this belt is still being counted: {progress.classes.attended} classes
                and {progress.hours.attended} hours.
              </p>
            </article>
          </div>
        </div>
        <BackRow />
      </Shell>
    );
  }

  return (
    <Shell wide>
      <div className="grad-grid">
        {/* Left: where you stand and when the next grading is. */}
        <div className="grad-col">
          {currentCard}

          {/* The verdict, stated before the detail. */}
          <article className={eligible ? "grad-verdict is-eligible" : "grad-verdict"}>
            <p className="grad-verdict-badge">{eligible ? "Eligible" : "Not yet eligible"}</p>
            <h2 className="grad-verdict-title">
              {eligible
                ? `You're eligible to grade for ${nextBelt.name}`
                : `Not yet eligible for ${nextBelt.name}`}
            </h2>
            {eligible ? (
              <p className="grad-verdict-note">
                You meet the requirements. Whether to apply is your decision — your instructor
                can advise, but the choice is yours.
              </p>
            ) : (
              <ul className="grad-unmet">
                {unmet.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </article>

          <article className="grad-card">
            <h2 className="grad-card-title">Next grading</h2>
            {nextGrading ? (
              <>
                <dl className="details grad-details">
                  <div><dt>Date</dt><dd>{formatDate(nextGrading.gradingDate)}</dd></div>
                  {nextGrading.startTime && (
                    <div><dt>Starts</dt><dd>{nextGrading.startTime}</dd></div>
                  )}
                  {nextGrading.centreName && (
                    <div><dt>Where</dt><dd>{nextGrading.centreName}</dd></div>
                  )}
                  <div>
                    <dt>Apply by</dt>
                    <dd>
                      {formatDate(nextGrading.registrationClosesOn)}
                      {nextGrading.registrationOpen ? (
                        <span className="grad-deadline">
                          {nextGrading.daysToDeadline === 0
                            ? " · today"
                            : ` · ${nextGrading.daysToDeadline} day${nextGrading.daysToDeadline === 1 ? "" : "s"} left`}
                        </span>
                      ) : (
                        <span className="grad-deadline is-closed"> · closed</span>
                      )}
                    </dd>
                  </div>
                </dl>

                {application && (
                  <p className="grad-applied">
                    You applied on {formatDate(application.appliedOn)} —{" "}
                    <strong>{APPLICATION_LABEL[application.status] || application.status}</strong>
                  </p>
                )}
              </>
            ) : (
              <p className="grad-empty">
                No grading session has been scheduled yet. This page will show the date and the
                application deadline as soon as one is.
              </p>
            )}
          </article>
        </div>

        {/* Right: the detail behind the verdict. */}
        <div className="grad-col">
          <article className="grad-card">
            <h2 className="grad-card-title">Your progress</h2>
            <GradingProgress progress={progress} nextBelt={nextBelt} />
          </article>

          {syllabus.length > 0 && (
            <article className="grad-card">
              <h2 className="grad-card-title">What you'll be asked to demonstrate</h2>
              <p className="grad-card-note">The {nextBelt.name} syllabus.</p>
              <ol className="grad-syllabus">
                {syllabus.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </article>
          )}

          {/* Honest about what isn't built yet, rather than showing a dead button. */}
          <p className="grad-upcoming">
            Applying and paying the exam fee is the next piece of work on this page.
          </p>
        </div>
      </div>

      <BackRow />
    </Shell>
  );
}

function BackRow() {
  return (
    <div className="button-row">
      <Link to="/dashboard" className="btn btn-outline">Back to Dashboard</Link>
    </div>
  );
}

// Shared page chrome, so every state above renders inside the same heading.
// Loading, error and setup states keep a narrow reading width; the full
// eligibility view goes wide for the two-column layout.
function Shell({ children, wide = false }) {
  return (
    <section className="section grad-section">
      <div className={wide ? "container grad-page" : "container grad-page is-narrow"}>
        <header className="grad-header">
          <p className="eyebrow">Grading</p>
          <h1>Grading eligibility</h1>
          <p className="grad-lead">
            Where you stand for your next belt, what's left to do, and when the next grading is.
          </p>
        </header>
        {children}
      </div>
    </section>
  );
}

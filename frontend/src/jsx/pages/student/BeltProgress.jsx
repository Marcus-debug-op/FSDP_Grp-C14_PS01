import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProgressLayout, { Swatch, Bar } from "../../components/student/ProgressLayout.jsx";
import BeltLadder from "../../components/student/BeltLadder.jsx";
import { getMyBelt, getMyHistory, getMyLadder } from "../../../js/services/beltService.js";
import { getEligibility } from "../../../js/services/gradingService.js";
import { colourHex, formatDate, timeAtBelt } from "../../../js/utils/beltFormat.js";

export default function BeltProgress() {
  const [belt, setBelt] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [grading, setGrading] = useState(null);
  const [ladder, setLadder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getMyBelt(), getMyHistory()])
      .then(([b, h]) => {
        setBelt(b.belt);
        setHistory(h.history);
      })
      .catch((err) => setError(err.message));
    getEligibility().then(setGrading).catch(() => setGrading(false));
    // FSDP-123: loaded on its own so a ladder error never hides the belt or history.
    getMyLadder().then(setLadder).catch(() => setLadder(null));
  }, []);

  return (
    <ProgressLayout title="My Belt" subtitle="Your current rank, every belt you've earned and what's ahead.">
      {error ? (
        <p className="prog-alert" role="alert">{error}</p>
      ) : belt === undefined ? (
        <p className="prog-loading" aria-live="polite">Loading your belt…</p>
      ) : !belt ? (
        <article className="prog-card">
          <h2 className="prog-card-title">No belt recorded yet</h2>
          <p className="prog-muted">Your belt will appear here once the front desk sets up your profile.</p>
        </article>
      ) : (
        <>
          <div className="prog-grid">
            <article className="prog-card belt-hero" style={{ "--belt": colourHex(belt.colour) }}>
              <p className="prog-label">Current belt</p>
              <h2 className="belt-hero-title">
                <Swatch colour={colourHex(belt.colour)} size="lg" />
                {belt.name}
              </h2>
              <dl className="belt-stats">
                <div><dt>Colour</dt><dd className="prog-cap">{belt.colour}</dd></div>
                <div><dt>Awarded</dt><dd>{formatDate(belt.beltAwardedOn)}</dd></div>
                <div><dt>Time at belt</dt><dd>{timeAtBelt(belt)}</dd></div>
              </dl>
            </article>

            <NextStep grading={grading} />
          </div>

          <BeltLadder ladder={ladder} />

          <article className="prog-card">
            <div className="prog-card-head">
              <h2 className="prog-card-title">Belt history</h2>
              <span className="prog-count">{history.length}</span>
            </div>
            {history.length === 0 ? (
              <p className="prog-muted">No belts recorded yet.</p>
            ) : (
              <ol className="belt-history" aria-label="Belt history, newest first">
                {history.map((b, i) => (
                  <li key={b.id} className={i === 0 ? "is-current" : ""}>
                    <Swatch colour={colourHex(b.colour)} />
                    <span className="belt-history-name">{b.name}</span>
                    {i === 0 && <span className="prog-pill is-accent">Current</span>}
                    <span className="belt-history-meta">
                      {b.fromGrading ? "Graded" : "On record"} · {formatDate(b.achievedOn)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        </>
      )}
    </ProgressLayout>
  );
}

function NextStep({ grading }) {
  const ready = grading && grading.profileReady;

  if (ready && grading.atHighestBelt) {
    return (
      <article className="prog-card belt-next">
        <p className="prog-label">Next step</p>
        <h2 className="prog-card-title">You're at the highest recorded belt</h2>
        <p className="prog-muted">There's no higher rank to grade for yet.</p>
      </article>
    );
  }

  const classes = ready ? grading.progress.classes : null;

  return (
    <article className="prog-card belt-next">
      <p className="prog-label">Next step</p>
      {ready ? (
        <>
          <div className="belt-next-row">
            <h2 className="prog-card-title">
              <Swatch colour={colourHex(grading.nextBelt.colour)} />
              {grading.nextBelt.name}
            </h2>
            <span className={grading.eligible ? "prog-pill is-ok" : "prog-pill"}>
              {grading.eligible ? "Eligible" : "In progress"}
            </span>
          </div>
          <div className="belt-meter">
            <div className="belt-meter-labels">
              <span>Classes</span>
              <span>{classes.attended} / {classes.required}</span>
            </div>
            <Bar percent={classes.percent} label={`Classes: ${classes.attended} of ${classes.required}`} />
          </div>
        </>
      ) : (
        <h2 className="prog-card-title">Ready for your next belt?</h2>
      )}
      <Link to="/grading" className="prog-btn">View grading →</Link>
    </article>
  );
}

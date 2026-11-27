// every belt on the student's ladder, with progress and an estimate for the next one.
// View-only. Data comes from GET /api/belts/me/ladder (beltService.getMyLadder).
import { useState } from "react";
import { Swatch, Bar } from "./ProgressLayout.jsx";
import { colourHex, formatDate } from "../../../js/utils/beltFormat.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Mar 2026" from "2026-03-14": an estimate shouldn't look more precise than it is.
function monthYear(iso) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "Needs 24 classes · 6 months · 8 techniques" for belts further up the ladder.
function needs(belt) {
  const parts = [];
  if (belt.minClasses > 0) parts.push(plural(belt.minClasses, "class", "classes"));
  if (belt.minMonths > 0) parts.push(plural(belt.minMonths, "month"));
  if (belt.techniques > 0) parts.push(plural(belt.techniques, "technique"));
  return parts.length ? `Needs ${parts.join(" · ")}` : "No set minimum";
}

export default function BeltLadder({ ladder }) {
  const [showAll, setShowAll] = useState(false);

  // The page already explains a missing profile, so there's nothing extra to show here.
  if (!ladder || !ladder.profileReady || ladder.belts.length === 0) return null;

  // The default view stops one belt past where the student is now: everything earned, the
  // current belt, and the next one they can grade for. Belts beyond that are "upcoming" and
  // only clutter the view until they're close, so they sit behind the toggle below.
  const upcoming = ladder.belts.filter((belt) => belt.state === "upcoming");
  const shown = showAll ? ladder.belts : ladder.belts.filter((belt) => belt.state !== "upcoming");

  return (
    <article className="prog-card">
      <div className="prog-card-head">
        <h2 className="prog-card-title">Belt ladder</h2>
        <span className="prog-count">{ladder.ladder === "children" ? "Children's" : "Adult"}</span>
      </div>
      <p className="prog-muted">
        {upcoming.length > 0 && !showAll
          ? "Your belts so far and the next one up. Open the rest to see the whole path."
          : "Every belt on your path, and what each one needs."}
      </p>

      <ol className="ladder" id="belt-ladder-rungs" aria-label="Belt ladder, first belt to last">
        {shown.map((belt) => (
          <Rung key={belt.id} belt={belt} next={belt.state === "next" ? ladder.next : null} />
        ))}
      </ol>

      {upcoming.length > 0 && (
        <button
          type="button"
          className="ladder-more"
          aria-expanded={showAll}
          aria-controls="belt-ladder-rungs"
          aria-label={showAll ? "Show fewer belts" : `Show ${plural(upcoming.length, "more belt")}`}
          onClick={() => setShowAll((open) => !open)}
        >
          <Chevron />
        </button>
      )}

      {!ladder.next && (
        <p className="prog-muted">You're at the top of your ladder. There's no higher belt to grade for yet.</p>
      )}
    </article>
  );
}

// Points down when collapsed; CSS flips it when the rest of the ladder is open.
// The toggle carries an aria-label, so the mark itself is decorative.
function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Rung({ belt, next }) {
  const { state } = belt;
  return (
    <li className={`ladder-rung is-${state}`} aria-current={state === "current" ? "step" : undefined}>
      <Swatch colour={colourHex(belt.colour)} />
      <div className="ladder-body">
        <div className="ladder-row">
          <span className="ladder-name">{belt.name}</span>
          {state === "current" && <span className="prog-pill is-accent">Current</span>}
          {state === "next" && (
            <span className={next.readyNow ? "prog-pill is-ok" : "prog-pill"}>
              {next.readyNow ? "Ready now" : "Next"}
            </span>
          )}
        </div>

        {state === "earned" && (
          <p className="ladder-meta">Earned{belt.earnedOn ? ` · ${formatDate(belt.earnedOn)}` : ""}</p>
        )}
        {state === "current" && belt.earnedOn && (
          <p className="ladder-meta">Awarded {formatDate(belt.earnedOn)}</p>
        )}
        {state === "next" && <NextDetail belt={belt} next={next} />}
        {state === "upcoming" && <p className="ladder-meta">{needs(belt)}</p>}
      </div>
    </li>
  );
}

function NextDetail({ belt, next }) {
  const { classes, timeAtBelt } = next;
  return (
    <div className="ladder-next">
      {classes.required > 0 && (
        <div className="belt-meter">
          <div className="belt-meter-labels">
            <span>Classes</span>
            <span>{classes.attended} / {classes.required}</span>
          </div>
          <Bar percent={classes.percent} label={`Classes: ${classes.attended} of ${classes.required}`} />
        </div>
      )}
      {timeAtBelt.requiredMonths > 0 && (
        <div className="belt-meter">
          <div className="belt-meter-labels">
            <span>Time at current belt</span>
            <span>{timeAtBelt.months} / {plural(timeAtBelt.requiredMonths, "month")}</span>
          </div>
          <Bar
            percent={timeAtBelt.percent}
            label={`Time at belt: ${timeAtBelt.months} of ${timeAtBelt.requiredMonths} months`}
          />
        </div>
      )}
      {belt.techniques > 0 && (
        <p className="ladder-meta">{plural(belt.techniques, "technique")} to demonstrate at grading</p>
      )}
      <p className="ladder-estimate">
        <Estimate next={next} />
      </p>
    </div>
  );
}

function Estimate({ next }) {
  if (next.readyNow) return <>You meet every requirement. You can apply for the next grading.</>;
  if (!next.estimatedDate) {
    return <>No classes in the last 8 weeks, so there's no estimate yet. It will appear once you train again.</>;
  }
  const basis = next.timeOnly
    ? "the minimum time at your current belt"
    : `your pace of ${plural(next.classesPerWeek, "class", "classes")} a week over the last 8 weeks`;
  return (
    <>
      Estimated ready: <strong>around {monthYear(next.estimatedDate)}</strong>, based on {basis}.
    </>
  );
}

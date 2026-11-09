import { colourHex } from "../../../js/utils/beltFormat.js";
import "../../../css/grading.css";

// how close the student is to their next grading.
//
// Presentational on purpose -- it takes the `progress` and `nextBelt` objects
// straight from GET /api/grading/eligibility and renders them. Keeping the
// fetch out means the grading page, which already has that payload, doesn't
// request it twice; dropping this onto the dashboard later needs one call to
// gradingService.getEligibility() and no backend work.
//
// Two bars, because those are the two rules that exist on belt_ranks: classes
// attended and time at the current belt. Training hours are shown as a figure
// without a bar, since there is no hours requirement to measure against.
export default function GradingProgress({ progress, nextBelt }) {
  if (!progress) return null;

  const { classes, timeAtBelt, hours } = progress;

  const bars = [
    {
      key: "classes",
      label: "Classes attended",
      done: classes.attended,
      required: classes.required,
      percent: classes.percent,
      met: classes.met,
      // The story's own example wording: "28 of 40 classes".
      text: classes.required === null
        ? `${classes.attended} classes`
        : `${classes.attended} of ${classes.required} classes`,
      short: classes.remaining > 0
        ? `${classes.remaining} to go`
        : null,
    },
    {
      key: "time",
      label: "Time at this belt",
      done: timeAtBelt.months,
      required: timeAtBelt.requiredMonths,
      percent: timeAtBelt.percent,
      met: timeAtBelt.met,
      text: timeAtBelt.requiredMonths === null
        ? `${timeAtBelt.months} months`
        : timeAtBelt.requiredMonths === 0
          ? "No minimum for this grade"
          : `${timeAtBelt.months} of ${timeAtBelt.requiredMonths} months`,
      short: timeAtBelt.remainingMonths > 0
        ? `${timeAtBelt.remainingMonths} to go`
        : null,
    },
  ];

  return (
    <div className="grad-progress">
      {nextBelt && (
        <p className="grad-progress-head">
          Working toward
          <span
            className="belt-swatch grad-swatch"
            style={{ background: colourHex(nextBelt.colour) }}
            aria-hidden="true"
          />
          <strong>{nextBelt.name}</strong>
        </p>
      )}

      {bars.map((bar) => (
        <div className="grad-bar-row" key={bar.key}>
          <div className="grad-bar-labels">
            <span className="grad-bar-label">{bar.label}</span>
            <span className={bar.met ? "grad-bar-value is-met" : "grad-bar-value"}>
              {bar.text}
              {bar.met && <span className="grad-tick" aria-hidden="true"> ✓</span>}
            </span>
          </div>
          <div
            className="grad-bar"
            role="progressbar"
            aria-valuenow={bar.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${bar.label}: ${bar.text}`}
          >
            <span
              className={bar.met ? "grad-bar-fill is-met" : "grad-bar-fill"}
              style={{ width: `${bar.percent}%` }}
            />
          </div>
          {bar.short && <p className="grad-bar-short">{bar.short}</p>}
        </div>
      ))}

      <p className="grad-hours">
        <strong>{hours.attended}</strong> training hours since this belt
        {hours.externalClasses > 0 && (
          <span className="grad-hours-note">
            {" "}· excludes {hours.externalClasses} session
            {hours.externalClasses === 1 ? "" : "s"} recorded outside the dojo, which have no
            times on record
          </span>
        )}
      </p>
    </div>
  );
}

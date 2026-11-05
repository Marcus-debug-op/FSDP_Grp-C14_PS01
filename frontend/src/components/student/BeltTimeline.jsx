import { useEffect, useState } from "react";
import { getMyProgression } from "../../services/beltService.js";
import { colourHex, formatDate } from "../../beltFormat.js";
import "../../belt.css";

const STATUS_LABEL = { achieved: "Achieved", current: "Current belt", upcoming: "Upcoming" };

// the student's belt progression, shown as the full belt ladder (lowest to
// highest). The current belt is highlighted and carries its award date; lower belts are
// marked achieved and higher belts upcoming. Each rank lists its grading requirements.
// View-only.
//
// NOTE: the database stores only the student's CURRENT belt and its date, so earlier
// belts can't show the date they were achieved. A belt-history table would be needed
// for a true dated timeline.
export default function BeltTimeline() {
  const [progression, setProgression] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyProgression().then((d) => setProgression(d.progression)).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="belt-error" role="alert">{error}</p>;
  if (!progression) return <p>Loading belt progression...</p>;

  return (
    <>
      <ol className="belt-ladder" aria-label="Belt progression, lowest to highest">
        {progression.map((r) => (
          <li key={r.id} className={r.status}>
            <div className="belt-rank-name">
              <span className="belt-swatch" style={{ background: colourHex(r.colour) }} aria-hidden="true" />
              {r.name}
              {r.status !== "achieved" && <span className="belt-status-tag">{STATUS_LABEL[r.status]}</span>}
            </div>
            <p className="belt-rank-meta">
              {r.status === "current" && r.awardedOn
                ? `Awarded ${formatDate(r.awardedOn)}`
                : `Requires ${r.minMonthsAtRank} months and ${r.minClassesAtRank} classes at the previous rank`}
            </p>
            {r.requirements.length > 0 && (
              <ul className="belt-reqs">
                {r.requirements.map((req, i) => <li key={i}>{req}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p className="belt-note">
        Earlier belts don't show an award date because only your current belt is stored.
      </p>
    </>
  );
}

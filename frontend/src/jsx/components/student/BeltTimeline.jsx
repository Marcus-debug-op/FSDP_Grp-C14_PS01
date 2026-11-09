import { useEffect, useState } from "react";
import { getMyHistory } from "../../../js/services/beltService.js";
import { colourHex, formatDate } from "../../../js/utils/beltFormat.js";
import "../../../css/belt.css";

// the student's real belt history, newest first. Each entry is a belt actually
// achieved, with its date. A "Graded" tag marks belts awarded at a grading exam; belts
// taken from the profile record show "On record". View-only.
export default function BeltTimeline() {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyHistory().then((d) => setHistory(d.history)).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="belt-error" role="alert">{error}</p>;
  if (!history) return <p>Loading belt history...</p>;
  if (history.length === 0) {
    return <p className="belt-note">No belt history yet. Your belts will appear here as they are awarded.</p>;
  }

  return (
    <ol className="belt-ladder" aria-label="Belt history, newest first">
      {history.map((b, i) => (
        <li key={b.id} className={i === 0 ? "current" : "achieved"}>
          <div className="belt-rank-name">
            <span className="belt-swatch" style={{ background: colourHex(b.colour) }} aria-hidden="true" />
            {b.name}
            {i === 0 && <span className="belt-status-tag">Current belt</span>}
          </div>
          <p className="belt-rank-meta">
            {b.fromGrading ? "Graded" : "On record"} &middot; {formatDate(b.achievedOn)}
          </p>
        </li>
      ))}
    </ol>
  );
}

import { useEffect, useState } from "react";
import { getMyBelt } from "../../services/beltService.js";
import { colourHex, formatDate, timeAtBelt } from "../../beltFormat.js";
import "../../belt.css";

// shows the student's current belt. View-only, no edit buttons.
// Drop it into any student page with <BeltCard />. It loads its own data.
export default function BeltCard() {
  const [belt, setBelt] = useState(undefined); // undefined = loading, null = no belt yet
  const [error, setError] = useState("");

  useEffect(() => {
    getMyBelt().then((d) => setBelt(d.belt)).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="belt-error" role="alert">{error}</p>;
  if (belt === undefined) return <p>Loading belt...</p>;

  if (!belt) {
    return (
      <article className="card belt-card">
        <span className="tag">Current belt</span>
        <h3>No belt recorded yet</h3>
        <p className="card-note">Your belt will appear here once your profile has been set up.</p>
      </article>
    );
  }

  return (
    <article className="card belt-card">
      <span className="tag">Current belt</span>
      <h3>
        <span className="belt-swatch" style={{ background: colourHex(belt.colour) }} aria-hidden="true" />
        {belt.name}
      </h3>
      <dl className="details">
        <div><dt>Belt colour</dt><dd>{belt.colour}</dd></div>
        <div><dt>Awarded on</dt><dd>{formatDate(belt.beltAwardedOn)}</dd></div>
        <div><dt>Time at belt</dt><dd>{timeAtBelt(belt)}</dd></div>
      </dl>
    </article>
  );
}

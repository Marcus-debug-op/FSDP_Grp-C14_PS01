import { Link } from "react-router-dom";

const statusLabel = { closed: "Temporarily closed", renovation: "Under renovation" };

// One dojo. Dojos that are closed or being renovated are greyed out and show no booking info.
export default function DojoCard({ dojo, index }) {
  const unavailable = dojo.status !== "open";
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dojo.address)}`;

  return (
    <article
      className={`dj-card ${unavailable ? "is-unavailable" : ""}`}
      style={{ "--i": Math.min(index, 12) }} // staggers the entrance animation
    >
      <div className="dj-top">
        <span className="dj-code">{dojo.code}</span>
        {unavailable ? (
          <span className="dj-status">{statusLabel[dojo.status]}</span>
        ) : (
          <span className="dj-region">{dojo.region}</span>
        )}
      </div>

      <h3>{dojo.name}</h3>
      <p className="dj-address">{dojo.address}</p>
      {dojo.note && <p className="dj-note">{dojo.note}</p>}
      {dojo.restricted && <p className="dj-restricted">{dojo.restricted}</p>}

      {!unavailable && dojo.hq && (
        <p className="dj-hq">Daily classes for adults and children.</p>
      )}

      {!unavailable && dojo.slots.length > 0 && (
        <ul className="dj-slots">
          {dojo.slots.map((s) => (
            <li key={`${s.day}-${s.time}`}>
              <span className="dj-type">{s.type}</span>
              <span className="dj-when"><strong>{s.day}</strong> {s.time}</span>
            </li>
          ))}
        </ul>
      )}

      {!unavailable && (
        <div className="dj-actions">
          {dojo.hq && <Link to="/classes" className="btn btn-primary btn-small">View timetable</Link>}
          <a href={mapUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-small">
            Get directions
          </a>
        </div>
      )}
    </article>
  );
}

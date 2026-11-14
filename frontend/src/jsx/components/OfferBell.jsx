import { useEffect, useRef, useState } from "react";
import { acceptOffer, declineOffer } from "../../js/services/instructorService.js";
import { formatTime } from "../../js/utils/formatters.js";

// "2026-11-18" -> "Wed 18 Nov"
function lessonDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" });
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

// One offer with Accept, or Decline with a short reason.
function OfferItem({ offer, onAnswered }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function answer(accept) {
    setBusy(true);
    setError("");
    try {
      const { message } = accept ? await acceptOffer(offer.id) : await declineOffer(offer.id, reason);
      onAnswered(message);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <li className="offer-item">
      <span className="tag">{offer.kind === "private" ? "Private lesson" : "Cover a class"}</span>
      <p className="offer-title">
        {offer.kind === "private" ? `1-on-1 with ${offer.studentName}` : offer.title}
      </p>
      <p className="offer-when">
        {lessonDay(offer.date)}, {formatTime(offer.startTime)} – {formatTime(offer.endTime)}
      </p>
      <p className="offer-where">{offer.centre}</p>
      {offer.coveringFor && <p className="offer-extra">Covering for {offer.coveringFor}</p>}

      {error && <p className="offer-error" role="alert">{error}</p>}

      {declining ? (
        <form className="offer-decline" onSubmit={(e) => { e.preventDefault(); answer(false); }}>
          <label htmlFor={`decline-${offer.id}`}>Why can't you take it?</label>
          <textarea
            id={`decline-${offer.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={300}
            required
            minLength={3}
          />
          <div className="offer-actions">
            <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
              {busy ? "Sending..." : "Send"}
            </button>
            <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => setDeclining(false)}>
              Back
            </button>
          </div>
        </form>
      ) : (
        <div className="offer-actions">
          <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={() => answer(true)}>
            {busy ? "Accepting..." : "Accept"}
          </button>
          <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => setDeclining(true)}>
            Decline
          </button>
        </div>
      )}
    </li>
  );
}

// FSDP-69: bell in the instructor navbar. The red circle counts lessons the
// admin has asked this instructor to take; the panel lets them accept or
// decline each one. The navbar loads the offers and passes them in.
export default function OfferBell({ id, offers, loadError, onChanged }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  const ref = useRef(null);
  const count = offers?.length || 0;

  // Close on an outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setDone("");
      onChanged(); // fresh list each time it opens
    }
    setOpen(!open);
  }

  function answered(message) {
    setDone(message);
    onChanged();
  }

  return (
    <div className="offer-bell" ref={ref}>
      <button
        type="button"
        className="offer-bell-button"
        aria-label={count ? `Requests, ${count} waiting` : "Requests, none waiting"}
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
      >
        <BellIcon />
        {count > 0 && <span className="offer-badge" aria-hidden="true">{count > 9 ? "9+" : count}</span>}
      </button>

      <div id={id} className={open ? "offer-panel open" : "offer-panel"} role="region" aria-label="Requests">
        <p className="offer-panel-title">Requests</p>
        {done && <p className="offer-done" role="status">{done}</p>}
        {loadError && <p className="offer-error" role="alert">{loadError}</p>}
        {!loadError && count === 0 && !done && <p className="offer-empty">No requests right now.</p>}
        {count > 0 && (
          <ul className="offer-list">
            {offers.map((offer) => (
              <OfferItem key={offer.id} offer={offer} onAnswered={answered} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

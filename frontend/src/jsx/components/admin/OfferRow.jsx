import { useEffect, useRef, useState } from "react";
import { formatTime } from "../../../js/utils/formatters.js";

function optionText(i) {
  if (i.declined) return `${i.name} - already declined`;
  if (i.isFree) return i.name;
  const c = i.conflicts[0];
  return `${i.name} - busy, ${c.label} ${formatTime(c.startTime)} to ${formatTime(c.endTime)}`;
}

export default function OfferRow({ colSpan, prompt, hint, loadInstructors, onOffer, onClose, submitLabel = "Send Offer" }) {
  const [instructors, setInstructors] = useState(null);
  const [instructorId, setInstructorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadRef = useRef(loadInstructors);

  useEffect(() => {
    let active = true;
    loadRef.current()
      .then((list) => active && setInstructors(list))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  const free = instructors ? instructors.filter((i) => i.isFree && !i.declined) : [];

  async function submit(event) {
    event.preventDefault();
    if (!instructorId) return setError("Please choose an instructor who is free at that time.");
    setSaving(true);
    setError("");
    try {
      await onOffer(Number(instructorId));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <tr className="att-detail-row">
      <td colSpan={colSpan}>
        <form className="lesson-cancel offer-row" onSubmit={submit}>
          <p>{prompt}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <label>
            Instructor
            <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} disabled={!instructors}>
              <option value="">{!instructors ? "Checking who is free..." : `Choose an instructor (${free.length} free)`}</option>
              {(instructors || []).map((i) => (
                <option key={i.id} value={i.id} disabled={!i.isFree || i.declined}>{optionText(i)}</option>
              ))}
            </select>
            {hint && <span className="form-hint">{hint}</span>}
          </label>
          <div className="card-actions">
            <button type="submit" className="btn btn-primary btn-small" disabled={saving || !instructors}>
              {saving ? "Sending..." : submitLabel}
            </button>
            <button type="button" className="link-button" onClick={onClose}>Close</button>
          </div>
        </form>
      </td>
    </tr>
  );
}

import { useState } from "react";
import { cancelLesson } from "../../../js/services/lessonService.js";
import { formatTime, formatDayHeading } from "../../../js/utils/formatters.js";
import "../../../css/cancel-booking.css";

// FSDP-55 Cancel a booked lesson. Used on Book Lessons and the dashboard.
// lesson = { id, title, creditCost, freeCancel, cancelBy: { date, time } }
// Cancelling before the notice period gives the credit back. After it the
// student is warned first, because the credit is lost and there are no
// make-up lessons. The server checks the rules again either way.

function cancelByText(cancelBy) {
  if (!cancelBy?.date) return "";
  const { weekday, day } = formatDayHeading(cancelBy.date);
  return `${weekday} ${day}, ${formatTime(cancelBy.time)}`;
}

export default function CancelBooking({ lesson, noticeHours = 24, onCancelled }) {
  const [step, setStep] = useState("idle"); // idle | confirm | busy
  const [late, setLate] = useState(!lesson.freeCancel);
  const [error, setError] = useState("");
  const credits = lesson.creditCost ?? 1;
  const creditText = `${credits} credit${credits === 1 ? "" : "s"}`;

  async function confirm() {
    setStep("busy");
    setError("");
    try {
      const result = await cancelLesson(lesson.id, { acceptLostCredit: late });
      onCancelled?.(result);
    } catch (err) {
      if (err.code === "late_cancel") {
        // The notice period ran out while the page was open: show the warning.
        setLate(true);
        setStep("confirm");
        return;
      }
      setError(err.message);
      setStep("idle");
    }
  }

  if (step === "idle") {
    return (
      <div className="cb">
        <p className="cb-hint">
          {late
            ? "Cancelling now won't return your credit."
            : `Free to cancel until ${cancelByText(lesson.cancelBy)}.`}
        </p>
        <button
          type="button"
          className="btn btn-outline btn-small cb-open"
          onClick={() => { setError(""); setStep("confirm"); }}
        >
          Cancel booking
        </button>
        {error && <p className="cb-error" role="alert">{error}</p>}
      </div>
    );
  }

  const busy = step === "busy";
  return (
    <div
      className={`cb cb-confirm${late ? " is-late" : ""}`}
      role="group"
      aria-label={`Cancel booking for ${lesson.title}`}
    >
      {late ? (
        <p role="alert">
          <strong>Your {creditText} won't be returned.</strong> It's less than {noticeHours} hours
          before this lesson. There are no make-up lessons, even with an MC.
        </p>
      ) : (
        <p>Cancel this booking? Your {creditText} will be returned.</p>
      )}
      <div className="cb-buttons">
        <button type="button" className="btn btn-primary btn-small" onClick={confirm} disabled={busy}>
          {busy ? "Cancelling..." : late ? "Cancel anyway" : "Yes, cancel"}
        </button>
        <button type="button" className="btn btn-outline btn-small" onClick={() => setStep("idle")} disabled={busy}>
          Keep booking
        </button>
      </div>
    </div>
  );
}

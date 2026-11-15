import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { checkInWithToken } from "../../../js/services/checkInService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import usePageTitle from "../../../js/hooks/usePageTitle.js";
import QrScanner from "../../components/QrScanner.jsx";
import "../../../css/checkin.css";

// Student check-in. Two ways in:
//  1. Tap "Check In": the camera opens here and scans the instructor's QR code.
//  2. Scan with the phone's own camera app: it opens /check-in?t=... directly.
// Either way, the code is sent to the server, which marks the student present.

// The QR holds a link like https://site/check-in?t=CODE. Returns CODE, or null.
function tokenFrom(text) {
  try {
    const url = new URL(text);
    return url.pathname === "/check-in" ? url.searchParams.get("t") : null;
  } catch {
    return null;
  }
}

export default function CheckIn() {
  usePageTitle("Check in");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const linkToken = params.get("t");
  const [state, setState] = useState(linkToken ? { kind: "checking" } : { kind: "scanning" });
  const sent = useRef(false);

  const submit = useCallback((token) => {
    setState({ kind: "checking" });
    checkInWithToken(token)
      .then((data) => setState({ kind: "done", already: data.alreadyCheckedIn, session: data.session }))
      .catch((err) => setState({ kind: "error", message: err.message }));
  }, []);

  // Opened from the phone's camera app with ?t=... in the address.
  useEffect(() => {
    if (!linkToken || sent.current) return;
    sent.current = true; // send once, even in React's development double-run
    navigate("/check-in", { replace: true }); // remove the code from the address bar
    submit(linkToken);
  }, [linkToken, navigate, submit]);

  const handleScan = useCallback((text) => {
    const token = tokenFrom(text);
    if (token) submit(token);
    else setState({ kind: "error", message: "That QR code isn't a class check-in code." });
  }, [submit]);

  const scanAgain = () => setState({ kind: "scanning" });

  return (
    <section className="section">
      <div className="container ci-student">
        {state.kind === "scanning" && (
          <div className="ci-result ci-scan-card">
            <p className="eyebrow">Check in</p>
            <h1>Scan the class QR code</h1>
            <p className="ci-hint">Point your camera at the code on your instructor's screen.</p>
            <QrScanner onScan={handleScan} />
            <p className="ci-hint">You need to have booked the class. Check-in opens 30 minutes before class starts.</p>
          </div>
        )}

        {state.kind === "checking" && <p role="status" className="ci-status">Checking you in…</p>}

        {state.kind === "done" && (
          <div className="ci-result ci-success" role="status">
            <span className="ci-icon" aria-hidden="true">✓</span>
            <h1>{state.already ? "You're already checked in" : "You're checked in"}</h1>
            <p className="ci-class">{state.session.title}</p>
            <p>{state.session.centre} · {formatTime(state.session.startTime)} - {formatTime(state.session.endTime)}</p>
            <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
          </div>
        )}

        {state.kind === "error" && (
          <div className="ci-result ci-fail" role="alert">
            <span className="ci-icon" aria-hidden="true">!</span>
            <h1>Check-in didn't work</h1>
            <p>{state.message}</p>
            <button type="button" className="btn btn-primary" onClick={scanAgain}>Scan again</button>
            <p className="ci-hint">Or ask your instructor to mark you present.</p>
          </div>
        )}
      </div>
    </section>
  );
}

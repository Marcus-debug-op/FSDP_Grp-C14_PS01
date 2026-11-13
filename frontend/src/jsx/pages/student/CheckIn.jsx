import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { checkInWithToken } from "../../../js/services/checkInService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import usePageTitle from "../../../js/hooks/usePageTitle.js";
import "../../../css/checkin.css";

// Student check-in. Scanning the instructor's QR code with the phone camera
// opens /check-in?t=..., and this page sends that code to the server.
export default function CheckIn() {
  usePageTitle("Check in");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("t");
  const [state, setState] = useState(token ? { kind: "checking" } : { kind: "idle" });
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true; // send once, even in React's development double-run
    navigate("/check-in", { replace: true }); // remove the code from the address bar
    checkInWithToken(token)
      .then((data) => setState({ kind: "done", already: data.alreadyCheckedIn, session: data.session }))
      .catch((err) => setState({ kind: "error", message: err.message }));
  }, [token, navigate]);

  return (
    <section className="section">
      <div className="container ci-student">
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
            <p className="ci-hint">Scan the code on your instructor's screen again, or ask them to mark you present.</p>
            <Link to="/timetable" className="btn btn-outline">My timetable</Link>
          </div>
        )}

        {state.kind === "idle" && (
          <div className="ci-result">
            <p className="eyebrow">Check in</p>
            <h1>Scan to check in</h1>
            <ol className="ci-steps">
              <li>At the start of class, your instructor shows a QR code.</li>
              <li>Open your phone's camera and point it at the code.</li>
              <li>Tap the link that appears. You'll be marked present.</li>
            </ol>
            <p className="ci-hint">You need to have booked the class. Check-in opens 30 minutes before class starts.</p>
            <Link to="/timetable" className="btn btn-outline">My timetable</Link>
          </div>
        )}
      </div>
    </section>
  );
}

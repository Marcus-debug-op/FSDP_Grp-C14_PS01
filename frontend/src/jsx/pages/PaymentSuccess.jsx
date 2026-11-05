import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCheckoutStatus } from "../../js/services/paymentService.js";
import "../../css/student-dashboard.css";

// PAY-3: Stripe sends the student back here. The payment only counts once
// Stripe's webhook has confirmed it, so this page checks until it has.
const CHECK_EVERY_MS = 2000;
const GIVE_UP_AFTER = 15; // about 30 seconds

const fmtMoney = (cents) =>
  (cents / 100).toLocaleString("en-SG", { style: "currency", currency: "SGD" });

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(sessionId ? "" : "No payment to check.");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) return undefined;
    let tries = 0;
    let timer;
    let stopped = false;

    async function check() {
      try {
        const p = await getCheckoutStatus(sessionId);
        if (stopped) return;
        setPayment(p);
        if (p.status !== "pending") return; // succeeded or failed: done
      } catch (err) {
        if (!stopped) setError(err.message);
        return;
      }
      tries += 1;
      if (tries >= GIVE_UP_AFTER) setTimedOut(true);
      else timer = setTimeout(check, CHECK_EVERY_MS);
    }

    check();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  let title = "Confirming your payment...";
  let body = "This usually takes a few seconds. Please don't close this page.";
  if (error) {
    title = "Something went wrong.";
    body = error;
  } else if (payment?.status === "succeeded") {
    title = "Payment confirmed.";
    body = payment.purpose === "membership"
      ? `Your membership is active and its lesson credits have been added. You paid ${fmtMoney(payment.amountCents)}.`
      : `Your lesson credits have been added. You paid ${fmtMoney(payment.amountCents)}.`;
  } else if (payment?.status === "failed") {
    title = "Payment didn't go through.";
    body = `${payment.failureReason || "The payment failed."} You haven't been charged.`;
  } else if (timedOut) {
    title = "Still confirming.";
    body = "Stripe hasn't confirmed this payment yet. Check your payment history on the dashboard in a minute.";
  }

  return (
    <div className="sp">
      <span className="sp-glyph" aria-hidden="true">合</span>
      <div className="sp-content">
        <div className="sp-main">
          <header className="sp-intro" aria-live="polite">
            <p className="sp-body sp-muted">Payments</p>
            <h1 className="sp-hero">{title}</h1>
            <p className="sp-body sp-lead">{body}</p>
            <div className="sp-intro-action sp-button-row">
              <Link to="/dashboard" className="sp-btn sp-btn-primary">Back to dashboard</Link>
              {payment?.status === "failed" && (
                <Link to="/payments" className="sp-btn sp-btn-secondary">Try again</Link>
              )}
            </div>
          </header>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCheckoutStatus } from "../../js/services/paymentService.js";
import ScrollReveal from "../components/ScrollReveal.jsx";
import "../../css/payments.css";

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
  } else if (payment?.status === "succeeded" && payment.isRegistration) {
    // New-member registration: paid, but membership waits for photo check and Shihan approval.
    title = "Payment received.";
    body = `Thank you. Your ${fmtMoney(payment.amountCents)} registration fee is confirmed. Your membership becomes active once your profile photo is accepted and the Shihan approves your application. You can follow its progress on your profile.`;
  } else if (payment?.status === "succeeded") {
    title = "Payment confirmed.";
    body = payment.purpose === "membership"
      ? `Your membership is active. You paid ${fmtMoney(payment.amountCents)}. To book lessons, buy lesson credits (1 credit = 1 lesson).`
      // a grading exam fee. Without this case the page told the
      // student their lesson credits had been added.
      : payment.purpose === "grading_fee"
        ? `Your grading application has been submitted. You paid ${fmtMoney(payment.amountCents)} for the exam fee. Your instructor will review it next.`
        : `Your lesson credits have been added. You paid ${fmtMoney(payment.amountCents)}.`;
  } else if (payment?.status === "failed") {
    title = "Payment didn't go through.";
    body = `${payment.failureReason || "The payment failed."} You haven't been charged.`;
  } else if (timedOut) {
    title = "Still confirming.";
    body = "Stripe hasn't confirmed this payment yet. Check your payment history on the dashboard in a minute.";
  }

  return (
    <section className="section pay-page">
      <div className="container">
        <ScrollReveal>
          <div aria-live="polite">
            <p className="eyebrow">Payments</p>
            <h1>{title}</h1>
            <p className="lead">{body}</p>
          </div>
        </ScrollReveal>
        <div className="pay-actions">
          <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
          {payment?.status === "failed" && (
            // A failed exam fee is retried from the grading page, where the
            // Apply button is; everything else from Payments.
            <Link to={payment.purpose === "grading_fee" ? "/grading" : "/payments"} className="btn btn-outline">Try again</Link>
          )}
          {payment?.status === "succeeded" && payment.purpose === "grading_fee" && (
            <Link to="/grading" className="btn btn-outline">View my grading</Link>
          )}
          {payment?.status === "succeeded" && payment.isRegistration && (
            <Link to="/profile" className="btn btn-outline">View application status</Link>
          )}
          {payment?.status === "succeeded" && payment.purpose === "membership" && !payment.isRegistration && (
            <Link to="/payments" className="btn btn-outline">Buy lesson credits</Link>
          )}
        </div>
      </div>
    </section>
  );
}

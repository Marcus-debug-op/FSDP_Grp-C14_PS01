import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { startCheckout } from "../../js/services/paymentService.js";
import { getRegistrationPlans } from "../../js/services/registrationService.js";
import "../../css/auth.css";

export default function RegistrationCheckout() {
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(null);
  const planId = Number(sessionStorage.getItem("pending_registration_plan_id"));
  useEffect(() => {
    getRegistrationPlans().then((plans) => {
      const chosen = plans.find((p) => p.id === planId);
      if (!chosen) throw new Error("Your registration plan is unavailable. Contact the team.");
      setPlan(chosen);
    }).catch((err) => setError(err.message));
  }, [planId]);

  async function pay() {
    setBusy(true);
    setError("");
    try { await startCheckout("membership", planId); }
    catch (err) { setError(err.message); setBusy(false); }
  }

  return <section className="section"><div className="container narrow">
    <p className="eyebrow">Final step</p>
    <h1>Complete your registration</h1>
    <p className="lead">Your account has been saved. Your membership remains pending until Stripe confirms a successful payment.</p>
    {params.get("cancelled") && <p role="status">Checkout was cancelled. You can try again when ready.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {plan && <div className="signup-membership-card">
      <h2>{plan.name}</h2>
      <p>Registration total: <strong>SGD {(plan.priceCents / 100).toFixed(2)}</strong></p>
      <p>Training passes and credit top-ups are not part of registration.</p>
      <button className="btn btn-primary" type="button" disabled={busy} onClick={pay}>{busy ? "Opening secure checkout..." : "Proceed to Stripe Checkout"}</button>
    </div>}
    <p><Link to="/profile">View saved profile</Link></p>
  </div></section>;
}

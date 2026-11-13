import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { startCheckout } from "../../js/services/paymentService.js";
import { getRegistrationPlans } from "../../js/services/registrationService.js";
import { getApplicationStatus } from "../../js/services/studentService.js";
import "../../css/auth.css";

export default function RegistrationCheckout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(null);
  const [verifiedUnpaid, setVerifiedUnpaid] = useState(false);
  const [checking, setChecking] = useState(true);
  const storedPlanId = Number(sessionStorage.getItem("pending_registration_plan_id"));
  const [planId, setPlanId] = useState(storedPlanId);

  useEffect(() => {
    let cancelled = false;
    async function verifyAndLoad() {
      setChecking(true);
      try {
        const { application } = await getApplicationStatus();
        if (cancelled) return;
        if (!application || application.paymentStatus === "succeeded" || application.status === "active_member") {
          sessionStorage.removeItem("pending_registration_plan_id");
          navigate("/dashboard", { replace: true });
          return;
        }
        if (application.status !== "pending_payment") {
          navigate("/dashboard", { replace: true });
          return;
        }
        const resolvedPlanId = Number(application.planId);
        if (!Number.isSafeInteger(resolvedPlanId) || resolvedPlanId < 1) {
          setError("Registration plan not found. Open your profile to check your application.");
          return;
        }
        if (planId !== resolvedPlanId) setPlanId(resolvedPlanId);
        const plans = await getRegistrationPlans();
        if (cancelled) return;
        const chosen = plans.find((p) => p.id === resolvedPlanId);
        if (!chosen) throw new Error("Your registration plan is unavailable. Contact the team.");
        setPlan(chosen);
        setVerifiedUnpaid(true);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not verify your registration status.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    verifyAndLoad();
    return () => { cancelled = true; };
  }, [navigate]);

  async function pay() {
    if (busy || !verifiedUnpaid) return;
    setBusy(true);
    setError("");
    try {
      // Recheck immediately before checkout; the first status check could be stale.
      const { application } = await getApplicationStatus();
      if (!application || application.status !== "pending_payment" || application.paymentStatus === "succeeded") {
        sessionStorage.removeItem("pending_registration_plan_id");
        navigate("/dashboard", { replace: true });
        return;
      }
      await startCheckout("membership", planId);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return <section className="section"><div className="container narrow">
    <p className="eyebrow">Final step</p>
    <h1>Complete your registration</h1>
    <p className="lead">Your account has been saved. Complete the registration payment, then await the Shihan's approval.</p>
    {params.get("cancelled") && <p role="status">Checkout was cancelled. You can try again when ready.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {checking && <p role="status">Checking your registration status...</p>}
    {verifiedUnpaid && plan && <div className="signup-membership-card">
      <h2>{plan.name}</h2>
      <p>Registration total: <strong>SGD {(plan.priceCents / 100).toFixed(2)}</strong></p>
      <p>This one-time S$60 fee includes the current-year membership, membership book and handbook. The S$48 annual membership renewal is separate and is not charged today. Training passes and attire are separate.</p>
      <button className="btn btn-primary" type="button" disabled={busy} onClick={pay}>{busy ? "Opening secure checkout..." : "Proceed to Stripe Checkout"}</button>
    </div>}
    <p><Link to="/profile">View saved profile</Link></p>
  </div></section>;
}

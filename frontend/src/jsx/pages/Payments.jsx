import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { getOptions, startCheckout } from "../../js/services/paymentService.js";
import "../../css/content.css";
import "../../css/payments.css";

// PAY-1 + PAY-2: choose a membership plan or credit package, then pay on
// Stripe Checkout (test mode). Prices always come from the server.
// The membership fee doesn't include lessons: students need an active
// membership AND lesson credits to book (1 credit = 1 lesson).

const fmtMoney = (cents) =>
  (cents / 100).toLocaleString("en-SG", { style: "currency", currency: "SGD" });

function OptionCard({ title, price, lines, buttonLabel, busy, onBuy }) {
  return (
    <article className="card pay-card">
      <h3>{title}</h3>
      <p className="pay-price">{price}</p>
      <ul className="pay-lines">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <button type="button" className="btn btn-outline btn-small" onClick={onBuy} disabled={busy}>
        {busy ? "Opening checkout..." : buttonLabel}
      </button>
    </article>
  );
}

export default function Payments() {
  const [params] = useSearchParams();
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    getOptions().then(setOptions).catch((err) => setError(err.message));
  }, []);

  async function buy(kind, id) {
    setError("");
    setBusyKey(`${kind}-${id}`);
    try {
      await startCheckout(kind, id); // leaves the page on success
    } catch (err) {
      setError(err.message);
      setBusyKey("");
    }
  }

  return (
    <section className="section pay-page">
      <div className="container">
        <ScrollReveal>
          <p className="eyebrow">Payments</p>
          <h1>Keep Training</h1>
          <p className="lead">
            To book lessons you need an active membership and lesson credits. The membership fee
            doesn't include lessons, and each lesson costs 1 credit. Payment is handled securely by Stripe.
          </p>
        </ScrollReveal>

        {params.get("cancelled") && (
          <p className="notice pay-notice" role="status">Checkout was cancelled. You haven't been charged.</p>
        )}
        {error && <p className="notice pay-notice pay-error" role="alert">{error}</p>}

        {!options && !error && <p className="pay-loading">Loading options...</p>}

        {options && (
          <>
            <section className="pay-group" aria-labelledby="plans-title">
              <h2 className="day-heading" id="plans-title">Membership fee</h2>
              <div className="grid">
                {options.plans.map((p) => (
                  <OptionCard
                    key={p.id}
                    title={p.name}
                    price={fmtMoney(p.price_cents)}
                    lines={[
                      `${p.duration_months} ${p.duration_months === 1 ? "month" : "months"} of membership`,
                      "Lesson credits sold separately",
                    ]}
                    buttonLabel="Choose plan"
                    busy={busyKey === `membership-${p.id}`}
                    onBuy={() => buy("membership", p.id)}
                  />
                ))}
              </div>
            </section>

            {options.packages.length > 0 && (
              <section className="pay-group" aria-labelledby="credits-title">
                <h2 className="day-heading" id="credits-title">Lesson credits</h2>
                <div className="grid">
                  {options.packages.map((p) => (
                    <OptionCard
                      key={p.id}
                      title={p.name}
                      price={fmtMoney(p.price_cents)}
                      lines={[
                        `${p.credits} lessons (1 credit = 1 lesson)`,
                        `${fmtMoney(Math.round(p.price_cents / p.credits))} per lesson`,
                      ]}
                      buttonLabel="Buy credits"
                      busy={busyKey === `credits-${p.id}`}
                      onBuy={() => buy("credits", p.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <p className="pay-policy">All purchases are final. Credits and memberships are non-refundable.</p>
          </>
        )}
      </div>
    </section>
  );
}

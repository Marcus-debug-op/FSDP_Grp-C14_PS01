import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getOptions, startCheckout } from "../services/paymentService.js";
import "../student-dashboard.css";

// PAY-1 + PAY-2: choose a membership plan or credit package, then pay on
// Stripe Checkout (test mode). Prices always come from the server.

const fmtMoney = (cents) =>
  (cents / 100).toLocaleString("en-SG", { style: "currency", currency: "SGD" });

function OptionCard({ title, price, lines, buttonLabel, busy, onBuy }) {
  return (
    <article className="sp-box sp-card sp-option">
      <p className="sp-label">{title}</p>
      <p className="sp-card-value">{price}</p>
      {lines.map((l) => <p className="sp-body" key={l}>{l}</p>)}
      <button type="button" className="sp-btn sp-btn-secondary sp-option-btn" onClick={onBuy} disabled={busy}>
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
    <div className="sp">
      <span className="sp-glyph" aria-hidden="true">合</span>
      <div className="sp-content">
        <div className="sp-main">
          <header className="sp-intro">
            <p className="sp-body sp-muted">Payments</p>
            <h1 className="sp-hero">Keep training.</h1>
            <p className="sp-body sp-lead">
              Renew your membership or top up lesson credits. Payment is handled securely by Stripe.
            </p>
          </header>

          {params.get("cancelled") && (
            <p className="sp-notice" role="status">Checkout was cancelled. You haven't been charged.</p>
          )}
          {error && <p className="sp-notice sp-notice-error" role="alert">{error}</p>}

          {!options && !error && <p className="sp-body sp-muted">Loading options...</p>}

          {options && (
            <>
              <section aria-labelledby="plans-title">
                <h2 className="sp-section-title" id="plans-title">Membership plans</h2>
                <div className="sp-grid sp-grid-cards">
                  {options.plans.map((p) => (
                    <OptionCard
                      key={p.id}
                      title={p.name}
                      price={fmtMoney(p.price_cents)}
                      lines={[
                        `${p.duration_months} ${p.duration_months === 1 ? "month" : "months"}`,
                        `${p.included_credits} lesson credits included`,
                      ]}
                      buttonLabel="Choose plan"
                      busy={busyKey === `membership-${p.id}`}
                      onBuy={() => buy("membership", p.id)}
                    />
                  ))}
                </div>
              </section>

              <section aria-labelledby="credits-title">
                <h2 className="sp-section-title" id="credits-title">Top up credits</h2>
                <div className="sp-grid sp-grid-cards">
                  {options.packages.map((p) => (
                    <OptionCard
                      key={p.id}
                      title={p.name}
                      price={fmtMoney(p.price_cents)}
                      lines={[`${fmtMoney(Math.round(p.price_cents / p.credits))} per lesson`]}
                      buttonLabel="Buy credits"
                      busy={busyKey === `credits-${p.id}`}
                      onBuy={() => buy("credits", p.id)}
                    />
                  ))}
                </div>
              </section>

              <p className="sp-label">All purchases are final. Credits and memberships are non-refundable.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

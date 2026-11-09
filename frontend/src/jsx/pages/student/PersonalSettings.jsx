import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSettings, saveSettings, chooseHomeDojo } from "../../../js/services/settingsService.js";
import { colourHex, formatDate, timeAtBelt } from "../../../js/utils/beltFormat.js";
import "../../../css/settings.css";

// FSDP-42 "Manage personal settings".
//
// Editable: phone, address, emergency contact.
// View-only: belt and membership -- shown as plain text with no inputs, because
// only an instructor or the front desk can change those.
// Changing the address changes the nearby-dojo suggestions below it; the
// student then has to confirm one before their home dojo actually moves.

// The fields this page can save, and the label used when reporting an error
// about one. Keys match the API's camelCase body.
const FIELDS = [
  "phone",
  "address",
  "postalCode",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelationship",
];

const MEMBERSHIP_LABEL = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  pending_payment: "Awaiting payment",
};

// The plan name from a real memberships row is already properly cased
// ("Annual"), but the sign-up fallback stores it lowercase ("annual"), so the
// first letter is lifted rather than relying on CSS capitalize, which would
// also re-case words inside a name like "6-month plan".
function planName(membership) {
  if (!membership.plan) return "";
  if (!membership.fromSignup) return membership.plan;
  return membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1);
}

// Pulls just the editable fields out of the API payload into form state.
function toForm(contact) {
  const form = {};
  for (const field of FIELDS) form[field] = contact[field] ?? "";
  return form;
}

export default function PersonalSettings() {
  const [data, setData] = useState(null);      // the whole API payload
  const [form, setForm] = useState(null);      // what's currently in the inputs
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [status, setStatus] = useState("");    // success message, announced politely
  const [saving, setSaving] = useState(false);
  const [choosing, setChoosing] = useState(0); // centre id currently being confirmed

  useEffect(() => {
    getSettings()
      .then((payload) => {
        setData(payload);
        setForm(toForm(payload.contact));
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  // Only send what actually changed, so saving the address can't quietly
  // rewrite the emergency contact with a stale value from the form.
  const changes = useMemo(() => {
    if (!data || !form) return {};
    const diff = {};
    for (const field of FIELDS) {
      if (form[field] !== (data.contact[field] ?? "")) diff[field] = form[field];
    }
    return diff;
  }, [data, form]);

  const dirty = Object.keys(changes).length > 0;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus("");
    setSaveError("");
  }

  function applyPayload(payload, message) {
    setData(payload);
    setForm(toForm(payload.contact));
    setStatus(message);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setSaveError("");
    setStatus("");
    // Remember whether the address moved, so the confirmation can say so.
    const addressChanged = "postalCode" in changes || "address" in changes;
    try {
      const payload = await saveSettings(changes);
      applyPayload(
        payload,
        addressChanged && payload.nearbyDojos.length > 0
          ? "Saved. Your nearby dojos have been updated below."
          : "Saved."
      );
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChooseDojo(centre) {
    setChoosing(centre.id);
    setSaveError("");
    setStatus("");
    try {
      applyPayload(await chooseHomeDojo(centre.id), `${centre.name} is now your home dojo.`);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setChoosing(0);
    }
  }

  function handleReset() {
    setForm(toForm(data.contact));
    setStatus("");
    setSaveError("");
  }

  // ---------- Loading and failure ----------
  if (loadError) {
    return (
      <section className="section">
        <div className="container narrow">
          <p className="eyebrow">Settings</p>
          <h1>Personal details</h1>
          <p className="notice" role="alert">{loadError}</p>
          <div className="button-row">
            <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!data || !form) {
    return (
      <section className="section">
        <div className="container narrow">
          <p className="eyebrow">Settings</p>
          <h1>Personal details</h1>
          <p aria-live="polite">Loading your details...</p>
        </div>
      </section>
    );
  }

  const { belt, membership, homeDojo, nearbyDojos, profileReady } = data;

  return (
    <section className="section">
      <div className="container narrow set-page">
        <p className="eyebrow">Settings</p>
        <h1>Personal details</h1>
        <p className="lead">
          Keep your contact details correct so we can reach you, and so your emergency
          contact is who you'd want us to call.
        </p>

        {/* One live region for both outcomes, so a screen reader announces
            whichever happened without the page shifting. */}
        <div className="set-live" aria-live="polite">
          {status && <p className="set-status">{status}</p>}
        </div>
        {saveError && <p className="form-error" role="alert">{saveError}</p>}

        {/* ---------- Editable ---------- */}
        <form className="set-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="set-card" disabled={saving}>
            <legend className="set-card-title">Contact details</legend>

            <div className="set-grid">
              <label className="set-span-full">
                Phone number
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="9123 4567"
                  autoComplete="tel"
                  maxLength={30}
                />
                <span className="form-hint">Digits, spaces and + - ( ) only.</span>
              </label>

              {/* One field for the whole address. A textarea rather than an
                  input because a full address with a unit number wraps, and
                  "street-address" is the autofill token for the multi-line
                  form of an address. */}
              <label className="set-span-full">
                Address
                <textarea
                  name="address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Blk 123 Bishan Street 12, #08-34"
                  autoComplete="street-address"
                  rows={2}
                  maxLength={255}
                />
                <span className="form-hint">Include your unit number, if you have one.</span>
              </label>

              <label>
                Postal code
                <input
                  type="text"
                  name="postalCode"
                  value={form.postalCode}
                  onChange={(e) => update("postalCode", e.target.value)}
                  placeholder="579783"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={7}
                />
                <span className="form-hint">6 digits. We use this to suggest dojos near you.</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="set-card" disabled={saving}>
            <legend className="set-card-title">Emergency contact</legend>
            <p className="set-card-note">
              Who we should call if something happens during training.
            </p>

            <div className="set-grid">
              <label>
                Name
                <input
                  type="text"
                  name="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={(e) => update("emergencyContactName", e.target.value)}
                  placeholder="Mei Ling Tan"
                  maxLength={100}
                />
              </label>

              <label>
                Contact number
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={(e) => update("emergencyContactPhone", e.target.value)}
                  placeholder="9123 4567"
                  maxLength={30}
                />
              </label>

              <label className="set-span-full">
                Relationship <span className="set-optional">optional</span>
                <input
                  type="text"
                  name="emergencyContactRelationship"
                  value={form.emergencyContactRelationship}
                  onChange={(e) => update("emergencyContactRelationship", e.target.value)}
                  placeholder="Mother"
                  list="set-relationships"
                  maxLength={50}
                />
                <datalist id="set-relationships">
                  <option value="Mother" /><option value="Father" /><option value="Spouse" />
                  <option value="Brother" /><option value="Sister" /><option value="Guardian" />
                  <option value="Friend" />
                </datalist>
              </label>
            </div>
          </fieldset>

          <div className="set-actions">
            <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            {dirty && !saving && (
              <button type="button" className="set-text-button" onClick={handleReset}>
                Discard changes
              </button>
            )}
            {data.contact.updatedAt && !dirty && (
              <span className="set-saved-at">Last updated {data.contact.updatedAt}</span>
            )}
          </div>
        </form>

        {/* ---------- Nearby dojos, driven by the postal code above ---------- */}
        <section className="set-card set-nearby" aria-labelledby="set-nearby-title">
          <h2 className="set-card-title" id="set-nearby-title">Dojos near you</h2>

          {homeDojo ? (
            <p className="set-card-note">
              Your home dojo is <strong>{homeDojo.name}</strong>. It's used to pick which
              classes your dashboard suggests.
            </p>
          ) : (
            <p className="set-card-note">You don't have a home dojo yet.</p>
          )}

          {nearbyDojos.length === 0 ? (
            <p className="set-empty">
              {form.postalCode
                ? "Save your postal code to see the dojos closest to you."
                : "Add your postal code above and we'll show the dojos closest to you."}
            </p>
          ) : (
            <>
              <ul className="set-dojo-list">
                {nearbyDojos.map((dojo) => (
                  <li key={dojo.id} className={dojo.isHomeDojo ? "is-home" : undefined}>
                    <div className="set-dojo-text">
                      <h3>
                        {dojo.name}
                        {dojo.isHomeDojo && <span className="set-chip">Home dojo</span>}
                      </h3>
                      <p className="set-dojo-address">{dojo.address}</p>
                      <p className="set-dojo-distance">
                        {dojo.label}
                        {dojo.area && <span className="set-dojo-area"> · {dojo.area}</span>}
                      </p>
                    </div>
                    {!dojo.isHomeDojo && (
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => handleChooseDojo(dojo)}
                        disabled={!profileReady || choosing !== 0}
                      >
                        {choosing === dojo.id ? "Saving..." : "Make this my home dojo"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="set-card-note set-fineprint">
                Distances are rough, worked out from your postal code area rather than your
                exact address. Closed and renovating dojos aren't listed.
              </p>
              {!profileReady && (
                <p className="set-empty">
                  Your belt and home dojo haven't been recorded yet, so you can't set a home
                  dojo here. Ask the front desk and these buttons will start working.
                </p>
              )}
            </>
          )}
        </section>

        {/* ---------- View-only ---------- */}
        <section className="set-card set-readonly" aria-labelledby="set-readonly-title">
          <h2 className="set-card-title" id="set-readonly-title">Account, belt and membership</h2>
          <p className="set-card-note">
            These are kept by the school and can't be edited here. To change your name or
            email address, ask the front desk.
            {belt && <> See <Link to="/belt-progress">My Belt</Link> for your full history.</>}
          </p>

          <dl className="details set-details">
            <div><dt>Name</dt><dd>{data.contact.fullName}</dd></div>
            <div><dt>Email</dt><dd className="set-email">{data.contact.email}</dd></div>
            <div>
              <dt>Current belt</dt>
              <dd>
                {belt ? (
                  <>
                    <span
                      className="belt-swatch"
                      style={{ background: colourHex(belt.colour) }}
                      aria-hidden="true"
                    />
                    {belt.name}
                  </>
                ) : (
                  "Not recorded yet"
                )}
              </dd>
            </div>
            {belt && (
              <>
                <div><dt>Awarded on</dt><dd>{formatDate(belt.awardedOn)}</dd></div>
                <div><dt>Time at belt</dt><dd>{timeAtBelt(belt)}</dd></div>
              </>
            )}
            <div>
              <dt>Membership</dt>
              <dd>
                {membership.plan ? `${planName(membership)} · ` : ""}
                {MEMBERSHIP_LABEL[membership.state] || membership.state}
              </dd>
            </div>
            {membership.endDate && (
              <div><dt>Renews on</dt><dd>{formatDate(membership.endDate)}</dd></div>
            )}
            <div>
              <dt>Home dojo</dt>
              <dd>{homeDojo ? homeDojo.name : "Not set"}</dd>
            </div>
          </dl>
        </section>

        <div className="button-row">
          <Link to="/dashboard" className="btn btn-outline">Back to Dashboard</Link>
        </div>
      </div>
    </section>
  );
}

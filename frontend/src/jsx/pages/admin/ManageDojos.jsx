import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createCentre, getCentres, setCentreStatus, updateCentre } from "../../../js/services/adminService.js";
import "../../../css/auth.css";
import "../../../css/admin.css";

function CentreForm({ centre, onSaved, onCancel }) {
  const [name, setName] = useState(centre?.name || "");
  const [address, setAddress] = useState(centre?.address || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const saved = centre ? await updateCentre(centre.id, { name, address }) : await createCentre({ name, address });
      onSaved(saved, centre ? "updated" : "added");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <section className="dojo-form-panel" aria-labelledby="dojo-form-title">
      <h2 id="dojo-form-title" ref={headingRef} tabIndex={-1}>{centre ? `Edit ${centre.name}` : "Add a Dojo"}</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label>
          Dojo name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </label>
        <label>
          Address
          <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={255} />
          <span className="form-hint">Optional, but students will see it when they book.</span>
        </label>
        <div className="button-row form-buttons">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : centre ? "Save Changes" : "Add Dojo"}
          </button>
          <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

export default function ManageDojos() {
  const [centres, setCentres] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    getCentres().then(setCentres).catch((err) => setError(err.message));
  }, []);

  function openForm(centre) {
    setNotice("");
    setEditing({ centre });
  }

  function handleSaved(saved, action) {
    setCentres((current) =>
      current.some((c) => c.id === saved.id) ? current.map((c) => (c.id === saved.id ? saved : c)) : [...current, saved]
    );
    setEditing(null);
    setNotice(`${saved.name} ${action}.`);
  }

  async function toggleStatus(centre) {
    setError("");
    setBusyId(centre.id);
    try {
      const saved = await setCentreStatus(centre.id, !centre.isActive);
      setCentres((current) => current.map((c) => (c.id === saved.id ? saved : c)));
      setNotice(`${saved.name} is now ${saved.isActive ? "active" : "inactive"}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Setup</p>
        <h1>Dojos</h1>
        <p className="lead">Every venue where classes run. Open a dojo to see its weekly class timetable.</p>

        {!editing && (
          <div className="button-row">
            <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>Add Dojo</button>
          </div>
        )}

        {notice && <p className="notice admin-notice" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {editing && (
          <CentreForm key={editing.centre?.id ?? "new"} centre={editing.centre} onSaved={handleSaved} onCancel={() => setEditing(null)} />
        )}

        {!centres && !error && <p>Loading...</p>}
        {centres && centres.length === 0 && <p className="notice admin-notice">No dojos yet. Add your first dojo to get started.</p>}

        {centres && centres.length > 0 && (
          <ul className="grid dojo-list">
            {centres.map((centre) => (
              <li key={centre.id} className={centre.isActive ? "card" : "card card-inactive"}>
                <span className="tag">{centre.isActive ? "Active" : "Inactive"}</span>
                <h3>{centre.name}</h3>
                <p className="admin-card-text">{centre.address || "No address yet"}</p>
                <dl className="details">
                  <div>
                    <dt>Weekly classes</dt>
                    <dd>{centre.activeClasses}</dd>
                  </div>
                </dl>
                <div className="card-actions">
                  <Link to={`/admin/schedule?dojo=${centre.id}`} className="btn btn-outline btn-small">View Timetable</Link>
                  <button type="button" className="link-button" onClick={() => openForm(centre)}>Edit</button>
                  <button type="button" className="link-button" onClick={() => toggleStatus(centre)} disabled={busyId === centre.id}>
                    {centre.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { createDojo, getDojos, setDojoStatus, updateDojo } from "../../services/adminService.js";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import "../../auth.css";
import "../../admin.css";

let roomKey = 0;
const nextKey = () => `room-${++roomKey}`;
const blankRoom = () => ({ key: nextKey(), name: "", capacity: "", isActive: true });

function formFromDojo(dojo) {
  if (!dojo) return { name: "", address: "", postalCode: "", rooms: [blankRoom()] };
  return {
    name: dojo.name,
    address: dojo.address,
    postalCode: dojo.postalCode || "",
    rooms: dojo.rooms.map((room) => ({ ...room, key: nextKey(), capacity: String(room.capacity) })),
  };
}

function DojoForm({ dojo, onSaved, onCancel }) {
  const [form, setForm] = useState(() => formFromDojo(dojo));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const updateRoom = (key, changes) =>
    setForm({ ...form, rooms: form.rooms.map((room) => (room.key === key ? { ...room, ...changes } : room)) });
  const removeRoom = (key) => setForm({ ...form, rooms: form.rooms.filter((room) => room.key !== key) });

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      name: form.name,
      address: form.address,
      postalCode: form.postalCode,
      rooms: form.rooms.map((room) => ({
        ...(room.id ? { id: room.id } : {}),
        name: room.name,
        capacity: room.capacity === "" ? "" : Number(room.capacity),
        isActive: room.isActive,
      })),
    };
    try {
      const saved = dojo ? await updateDojo(dojo.id, payload) : await createDojo(payload);
      onSaved(saved, dojo ? "updated" : "added");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <section className="dojo-form-panel" aria-labelledby="dojo-form-title">
      <h2 id="dojo-form-title" ref={headingRef} tabIndex={-1}>{dojo ? `Edit ${dojo.name}` : "Add a Dojo"}</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label>
          Dojo name
          <input value={form.name} onChange={setField("name")} maxLength={100} required />
        </label>
        <label>
          Address
          <input value={form.address} onChange={setField("address")} maxLength={255} required />
        </label>
        <label>
          Postal code
          <input value={form.postalCode} onChange={setField("postalCode")} inputMode="numeric" pattern="\d{6}" maxLength={6} />
          <span className="form-hint">Optional. 6 digits.</span>
        </label>

        <fieldset className="room-fieldset">
          <legend>Rooms</legend>
          {form.rooms.map((room, index) => (
            <div className="room-row" key={room.key}>
              <label>
                Room {index + 1} name
                <input value={room.name} onChange={(e) => updateRoom(room.key, { name: e.target.value })} maxLength={50} required />
              </label>
              <label>
                Capacity
                <input type="number" min="1" max="500" value={room.capacity}
                       onChange={(e) => updateRoom(room.key, { capacity: e.target.value })} required />
              </label>
              {room.id ? (
                <label className="check-row">
                  <input type="checkbox" checked={room.isActive}
                         onChange={(e) => updateRoom(room.key, { isActive: e.target.checked })} />
                  In use
                </label>
              ) : (
                form.rooms.length > 1 && (
                  <button type="button" className="link-button" onClick={() => removeRoom(room.key)}>Remove room {index + 1}</button>
                )
              )}
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-small" onClick={() => setForm({ ...form, rooms: [...form.rooms, blankRoom()] })}>
            Add Room
          </button>
          <span className="form-hint">Saved rooms cannot be deleted. Untick "In use" to stop new lessons there.</span>
        </fieldset>

        <div className="button-row form-buttons">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : dojo ? "Save Changes" : "Add Dojo"}
          </button>
          <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

export default function ManageDojos() {
  const [dojos, setDojos] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    getDojos().then(setDojos).catch((err) => setError(err.message));
  }, []);

  function openForm(dojo) {
    setNotice("");
    setEditing({ dojo });
  }

  function handleSaved(saved, action) {
    setDojos((current) =>
      current.some((d) => d.id === saved.id) ? current.map((d) => (d.id === saved.id ? saved : d)) : [...current, saved]
    );
    setEditing(null);
    setNotice(`${saved.name} ${action}.`);
  }

  async function toggleStatus(dojo) {
    setError("");
    setBusyId(dojo.id);
    try {
      const saved = await setDojoStatus(dojo.id, !dojo.isActive);
      setDojos((current) => current.map((d) => (d.id === saved.id ? saved : d)));
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
        <AdminTabs />
        <p className="eyebrow">Setup</p>
        <h1>Dojos &amp; Rooms</h1>
        <p className="lead">The venues where classes run. Inactive dojos stay on record but are hidden when lessons are created.</p>

        {!editing && (
          <div className="button-row">
            <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>Add Dojo</button>
          </div>
        )}

        {notice && <p className="notice admin-notice" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {editing && (
          <DojoForm key={editing.dojo?.id ?? "new"} dojo={editing.dojo} onSaved={handleSaved} onCancel={() => setEditing(null)} />
        )}

        {!dojos && !error && <p>Loading...</p>}
        {dojos && dojos.length === 0 && <p className="notice admin-notice">No dojos yet. Add your first dojo to get started.</p>}

        {dojos && dojos.length > 0 && (
          <ul className="grid dojo-list">
            {dojos.map((dojo) => (
              <li key={dojo.id} className={dojo.isActive ? "card" : "card card-inactive"}>
                <span className="tag">{dojo.isActive ? "Active" : "Inactive"}</span>
                <h3>{dojo.name}</h3>
                <p className="admin-card-text">{dojo.address}</p>
                <dl className="details">
                  {dojo.rooms.map((room) => (
                    <div key={room.id}>
                      <dt>{room.name}</dt>
                      <dd>{room.capacity} people{room.isActive ? "" : " (not in use)"}</dd>
                    </div>
                  ))}
                </dl>
                <div className="card-actions">
                  <button type="button" className="btn btn-outline btn-small" onClick={() => openForm(dojo)}>Edit</button>
                  <button type="button" className="link-button" onClick={() => toggleStatus(dojo)} disabled={busyId === dojo.id}>
                    {dojo.isActive ? "Deactivate" : "Reactivate"}
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

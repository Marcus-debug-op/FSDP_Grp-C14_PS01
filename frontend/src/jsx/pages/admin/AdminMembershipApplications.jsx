import { useEffect, useState } from "react";
import { decideMembershipApplication, getMembershipApplication, getMembershipApplicationPhoto, getMembershipApplicationEvidence, listMembershipApplications, requestMembershipPhotoResubmission, acceptMembershipApplicationPhoto, advanceMembershipBook, listHQAlerts, acknowledgeHQAlert } from "../../../js/services/adminService.js";
import "../../../css/admin-applications.css";

const fmt = (date) => date ? new Date(date).toLocaleString('en-SG') : '—';
const money = (cents) => `S$${(Number(cents || 0)/100).toFixed(2)}`;
// "3 hours ago" style label for alert times.
const ago = (date) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(date)) / 60000));
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};
const nice = (value) => value === null || value === undefined || value === '' ? 'Not provided' : value;
export default function AdminMembershipApplications() {
  // Opens on the admin's to-do list so approved members awaiting their book don't disappear.
  const [status, setStatus] = useState('action');
  const [hqAlerts,setHQAlerts] = useState([]);
  const [hqError,setHQError] = useState('');
  async function refreshHQAlerts() {
    try { setHQAlerts(await listHQAlerts());setHQError(''); }
    catch(e) {setHQError(e.message);}
  }
  async function acknowledgeHQ(id) {
    try { await acknowledgeHQAlert(id);await refreshHQAlerts(); }
    catch(e) {setHQError(e.message);}
  }
  const [items, setItems] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [confirmDecision, setConfirmDecision] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [photoReason, setPhotoReason] = useState('');
  const [evidenceError, setEvidenceError] = useState('');

  useEffect(() => {
    if (!detail?.id || !detail.onboarding?.has_photo) {
      setPhotoUrl(null);
      setPhotoError('');
      return;
    }
    const controller = new AbortController();
    let objectUrl = null;
    setPhotoUrl(null);
    setPhotoError('');
    getMembershipApplicationPhoto(detail.id, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return;
        if (!blob) { setPhotoError('Photo not found.'); return; }
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setPhotoError(err.message);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [detail?.id, detail?.onboarding?.has_photo]);

  async function refresh() {
    setError(''); setLoading(true);
    try { setItems(await listMembershipApplications(status)); await refreshHQAlerts(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); setDetail(null); setConfirmDecision(null); }, [status]);
  useEffect(() => { setEvidenceError(''); }, [detail?.id]);

  // Opens the uploaded certificate in a new tab. The tab is opened first so the
  // browser doesn't treat it as a pop-up, then the private file is loaded into it.
  async function viewEvidence() {
    setEvidenceError('');
    const tab = window.open('', '_blank');
    try {
      const blob = await getMembershipApplicationEvidence(detail.id);
      if (!blob) { tab?.close(); setEvidenceError('Certificate not found.'); return; }
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url; else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      tab?.close();
      setEvidenceError(err.message);
    }
  }
  useEffect(() => { refreshHQAlerts(); }, []);

  async function openDetail(id) {
    setError('');setDetail(null);setReason('');setConfirmDecision(null);
    try { setDetail(await getMembershipApplication(id)); }
    catch (err) { setError(err.message); }
  }
  async function submitDecision() {
    if (!detail || !confirmDecision || busy) return;
    setBusy(true);setError('');
    try {
      await decideMembershipApplication(detail.id, confirmDecision, reason);
      await refresh();
      setDetail(await getMembershipApplication(detail.id));
      setConfirmDecision(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function handlePhotoAction(action) {
    if (!detail || busy) return;
    setBusy(true); setError('');
    try {
      if (action === 'request') await requestMembershipPhotoResubmission(detail.id, photoReason.trim());
      else await acceptMembershipApplicationPhoto(detail.id);
      setDetail(await getMembershipApplication(detail.id));
      await refresh();
      setPhotoReason('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function advanceBook(nextStatus) {
    if (!detail || busy || !window.confirm(`Update membership book to "${nextStatus.replaceAll('_', ' ')}"?`)) return;
    setBusy(true); setError('');
    try {
      await advanceMembershipBook(detail.id, nextStatus);
      setDetail(await getMembershipApplication(detail.id));
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const bookSteps = { not_prepared: 'preparing', preparing: 'ready', ready: 'issued' };
  const bookActions = { preparing: 'Start preparing book', ready: 'Mark ready for collection', issued: 'Confirm book issued' };
  // Plain-language "what to do next" for each row in the list.
  const nextStep = (a) => {
    if (a.approval_status === 'rejected') return 'Rejected';
    if (a.approval_status === 'pending') {
      if (a.photo_review_status === 'resubmission_requested') return "Waiting for student's new photo";
      if (a.photo_review_status !== 'accepted') return 'Review profile photo';
      return 'Record Shihan decision';
    }
    if (!a.has_active_membership) return 'Approved · awaiting verified payment';
    if (a.book_status === 'issued') return 'Complete';
    return bookActions[bookSteps[a.book_status || 'not_prepared']];
  };
  const paymentLabel = (a) => Number(a.succeeded_count) > 0 ? 'Possible paid registration (verify)' : Number(a.pending_count) > 0 ? 'Payment pending' : 'No matching payment';
  return <section className="section"><div className="container adm-app">
    <p className="eyebrow">Administration</p><h1>Membership Applications</h1>
    <p className="lead">Review registration applications and record the Shihan's decision. Membership activation requires verified payment, approval and an accepted photo.</p>
    {(hqAlerts.length > 0 || hqError) ? <section className="adm-hq" aria-label="HQ newcomers to contact">
      <div className="adm-hq-head">
        <h2>HQ newcomers to contact <span className="adm-hq-count">{hqAlerts.length}</span></h2>
        <p>Arrange their first class, HQ session pass and training attire, then mark as done.</p>
      </div>
      {hqError && <p role="alert" className="form-error">{hqError}</p>}
      <ul className="adm-hq-list">{hqAlerts.map(alert => <li key={alert.id} className="adm-hq-item">
        <div className="adm-hq-who">
          <strong>{alert.full_name}</strong>
          <span>{alert.event_type === 'reapplication' ? 'Reapplied' : 'New signup'} · {alert.experience_level === 'experienced' ? 'Has experience' : 'Beginner'} · {ago(alert.created_at)}</span>
        </div>
        <div className="adm-hq-contact">
          {alert.phone ? <a href={`tel:${alert.phone}`}>{alert.phone}</a> : <span>No phone</span>}
          <a href={`mailto:${alert.email}`}>{alert.email}</a>
        </div>
        <div className="adm-hq-actions">
          <button type="button" className="adm-hq-link" onClick={() => openDetail(alert.application_id)}>View application</button>
          <button type="button" className="adm-hq-done" onClick={() => acknowledgeHQ(alert.id)}>Mark as done</button>
        </div>
      </li>)}</ul>
    </section> : <p className="adm-hq-empty">No HQ newcomers waiting to be contacted.</p>}
    <div className="adm-app-toolbar">
      <label>Application status <select value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="action">Needs action</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option>
      </select></label><button type="button" className="btn btn-outline" onClick={refresh}>Refresh</button>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading applications…</p> : items.length === 0 ? <p>{status === 'action' ? 'Nothing needs action right now. Use the filter to see approved, rejected or all applications.' : 'No applications in this category.'}</p> :
      <div className="adm-app-tablewrap"><table className="adm-app-table"><thead><tr><th>Applicant</th><th>Dojo</th><th>Registration</th><th>Payment</th><th>Approval</th><th>Next step</th><th>Action</th></tr></thead><tbody>
        {items.map(a=><tr key={a.id}><td><strong>{a.full_name}</strong><small>{a.email}</small></td>
        <td>{a.centre_name}{a.centre_name === "ASK Headquarters Dojo" && <small>HQ · coordinate session pass/attire</small>}</td><td>{a.plan_name}<small>{money(a.price_cents)}</small></td>
        <td>{paymentLabel(a)}</td><td><span className="adm-app-status">{a.approval_status}</span></td>
        <td>{nextStep(a)}</td>
        <td><button className="btn btn-outline" type="button" onClick={()=>openDetail(a.id)}>Review</button></td></tr>)}
      </tbody></table></div>}
    {detail && <div className="adm-app-panel">
      <div className="adm-app-panel-head"><h2>Application #{detail.id}</h2><button type="button" className="btn btn-outline" onClick={()=>setDetail(null)}>Close</button></div>
      <div className="adm-app-photo-review">
        <div className="adm-app-photo-frame">
          {photoUrl ? <img src={photoUrl} alt={`Profile photo uploaded by ${detail.full_name}`} />
            : <span>{detail.onboarding?.has_photo ? 'Loading photo…' : 'No photo uploaded'}</span>}
        </div>
        <div>
          <h3>Applicant profile photo</h3>
          <p>Check that the photo clearly shows one person's face and is appropriate for a membership profile.</p>
          <p>Compare the photo with an authorised identity-check process where required. A photo alone cannot prove a person's identity.</p>
          {photoError && <p role="alert" className="form-error">{photoError}</p>}
        </div>
      </div>
      {detail.approval_status === 'pending' && <div className="adm-photo-revision">
        <h3>Profile photo review</h3>
        <p>Review status: <strong>{detail.photo_review_status?.replaceAll('_', ' ') || 'pending review'}</strong></p>
        {detail.photo_review_note && <p>Requested correction: {detail.photo_review_note}</p>}
        {['pending_review', 'resubmitted'].includes(detail.photo_review_status) && <>
          <label>Reason to request a replacement photo
            <textarea rows={2} maxLength={500} value={photoReason} onChange={e=>setPhotoReason(e.target.value)} placeholder="For example, the face is obscured or the image is too blurry." />
          </label>
          <div className="adm-app-actions">
            <button className="btn btn-outline" type="button" disabled={busy || photoReason.trim().length < 10} onClick={()=>handlePhotoAction('request')}>Request replacement photo</button>
            <button className="btn btn-outline" type="button" disabled={busy || !detail.onboarding?.has_photo} onClick={()=>handlePhotoAction('accept')}>Accept photo</button>
          </div>
        </>}
        {detail.photo_review_status === 'resubmission_requested' && <p>Waiting for the student to upload a replacement photo.</p>}
      </div>}
      {detail.last_reapply_note && <p className="adm-app-note"><strong>Latest reconsideration request:</strong> {detail.last_reapply_note}</p>}
      <div className="adm-app-fields">
        <div><b>Student</b><span>{detail.full_name}</span></div>
        <div><b>Email</b><span>{detail.email}</span></div>
        <div><b>Preferred dojo</b><span>{detail.centre_name}</span></div>
        <div><b>Registration plan</b><span>{detail.plan_name} · {money(detail.price_cents)}</span></div>
        <div><b>Payment</b><span>{paymentLabel(detail)}</span></div>
        <div><b>Submitted</b><span>{fmt(detail.created_at)}</span></div>
        <div><b>Date of birth</b><span>{nice(detail.onboarding?.date_of_birth)}</span></div>
        <div><b>Gender</b><span>{nice(detail.onboarding?.gender)}</span></div>
        <div><b>Experience</b><span>{nice(detail.onboarding?.experience_level)}</span></div>
        <div><b>Previous rank</b><span>{nice(detail.onboarding?.previous_rank)}</span></div>
        <div><b>Experience evidence</b><span>{detail.onboarding?.has_evidence
          ? <>{detail.onboarding.evidence_filename}{' '}<button type="button" className="btn btn-outline" onClick={viewEvidence}>View certificate</button></>
          : nice(detail.onboarding?.evidence_filename)}
          {evidenceError && <small role="alert" className="form-error">{evidenceError}</small>}</span></div>
        <div><b>Contact</b><span>{nice(detail.onboarding?.phone)}</span></div>
        <div><b>Training goal</b><span>{nice(detail.onboarding?.training_goal)}</span></div>
        <div><b>Experience notes</b><span>{nice(detail.onboarding?.experience_notes)}</span></div>
      </div>
      <section className="adm-book-tracker" aria-label="Membership book tracking">
        <h3>Membership book tracking</h3>
        <p>Current stage: <strong>{(detail.book_status || 'not_prepared').replaceAll('_', ' ')}</strong></p>
        <p className="adm-book-note">Prepare the physical membership book after the application is approved and membership is active. Confirm issuance only when the student has actually received it.</p>
        {detail.approval_status !== 'approved' ? <p>Book processing becomes available after approval and membership activation.</p> :
          bookSteps[detail.book_status || 'not_prepared'] ?
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => advanceBook(bookSteps[detail.book_status || 'not_prepared'])}>
              {busy ? 'Saving…' : bookActions[bookSteps[detail.book_status || 'not_prepared']]}
            </button> : <p>Membership book issued.</p>}
        <p className="adm-book-note">The server verifies the linked successful payment and active membership before accepting any change.</p>
      </section>
      <p className="adm-app-note">Payment shown here is only an indicative student/amount match. Verify the exact payment and Shihan decision independently. Neither approval nor payment alone activates membership.</p>
      {detail.approval_status === 'pending' ? <>
        {detail.photo_review_status !== 'accepted' && <p className="adm-app-note">Please accept the photo before recording approval. Rejection remains available.</p>}
        <div className="adm-app-actions"><button type="button" className="btn btn-primary" disabled={detail.photo_review_status !== 'accepted'} onClick={()=>setConfirmDecision('approved')}>Record approval</button>
        <button type="button" className="btn btn-outline" onClick={()=>setConfirmDecision('rejected')}>Record rejection</button></div>
        {confirmDecision && <div className="adm-app-confirm"><p><strong>Confirm {confirmDecision}?</strong> Record this only after receiving the Shihan's actual decision.</p>
          {confirmDecision==='rejected' && <label>Reason for rejection <textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)} rows={3}/></label>}
          <button className="btn btn-primary" type="button" disabled={busy || (confirmDecision==='rejected' && reason.trim().length<5)} onClick={submitDecision}>{busy?'Saving…':'Confirm decision'}</button>
          <button className="btn btn-outline" type="button" disabled={busy} onClick={()=>setConfirmDecision(null)}>Cancel</button>
        </div>}
      </> : <p><strong>Decision:</strong> {detail.approval_status} · {fmt(detail.reviewed_at)} {detail.rejection_reason && `· ${detail.rejection_reason}`}</p>}
    </div>}
  </div></section>;
}

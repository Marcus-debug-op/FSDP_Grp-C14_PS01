import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getProfile, getPhotoReviewStatus, getApplicationStatus, reapplyForMembership, resubmitApplicationPhoto } from "../../../js/services/studentService.js";
import "../../../css/student-profile.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token";

const LABELS = { male: "Male", female: "Female", other: "Other", prefer_not_to_say: "Prefer not to say" };
const nice = (v) => v === null || v === undefined || v === "" ? "Not provided" : v;

const APPLICATION_STATES = {
  pending_payment: { label: "Pending payment", description: "Complete your registration payment to continue the membership review.", tone: "pending" },
  pending_approval: { label: "Pending approval", description: "Your registration payment was received. Your application is awaiting review.", tone: "pending" },
  photo_resubmission_required: { label: "New photo required", description: "The admin has requested a replacement profile photo. See the photo update section below.", tone: "action" },
  awaiting_photo_review: { label: "Photo under review", description: "Your new photo was submitted. Wait for the admin to review it.", tone: "pending" },
  awaiting_activation: { label: "Awaiting activation", description: "Your application is being finalised. If your photo is not yet accepted, an admin must review it first.", tone: "pending" },
  rejected: { label: "Application rejected", description: "Your application was not approved. See the reason below or contact an administrator.", tone: "action" },
  active_member: { label: "Active member", description: "Your membership is active.", tone: "active" },
};

function ApplicationStatusCard({ application, activeMembership, busy, error, onRefresh }) {
  const [reapplyNote,setReapplyNote]=useState('');
  const [reapplyBusy,setReapplyBusy]=useState(false);
  const [reapplyError,setReapplyError]=useState('');
  const [reapplyMessage,setReapplyMessage]=useState('');
  async function submitReapplication(e) {
    e.preventDefault();setReapplyBusy(true);setReapplyError('');
    try {
      const result=await reapplyForMembership(reapplyNote);
      setReapplyMessage(result.message);
      setReapplyNote('');
      await onRefresh();
    } catch(err){setReapplyError(err.message||'Unable to submit request.');}
    finally{setReapplyBusy(false);}
  }
  const state = application ? (APPLICATION_STATES[application.status] || {
    label: "Status unavailable", description: "Please contact an administrator if this persists.", tone: "pending"
  }) : null;
  return (
    <section className="stprofile-card stprofile-application" aria-label="Membership application status">
      <div className="stprofile-application-head">
        <div><h2>Membership Application Status</h2><p>Track your registration and membership progress.</p></div>
        <button type="button" className="stprofile-refresh" disabled={busy} onClick={onRefresh}>
          {busy ? "Refreshing…" : "Refresh status"}
        </button>
      </div>
      {error ? <p role="alert" className="stprofile-application-error">{error}</p>
      : busy && !application ? <p role="status">Checking your application…</p>
      : !application && activeMembership ? <>
        <span role="status" className="stprofile-application-badge active">Active member</span>
        <p className="stprofile-application-description">Your membership is active.</p>
        <dl className="stprofile-application-details">
          <Field label="Membership plan" value={activeMembership.planName} />
          <Field label="Membership ends" value={activeMembership.endDate} />
        </dl>
      </>
      : !application ? <p>No membership application found for this account.</p>
      : <>
        <span role="status" className={`stprofile-application-badge ${state.tone}`}>{state.label}</span>
        <p className="stprofile-application-description">{state.description}</p>
        {application.status === "pending_payment" && (
          <p><Link to="/registration/checkout" className="btn btn-primary">Complete registration payment</Link></p>
        )}
        <dl className="stprofile-application-details">
          <Field label="Registration plan" value={application.planName} />
          <Field label="Preferred dojo" value={application.preferredCentre} />
          <Field label="Payment" value={application.paymentStatus === "succeeded" ? "Paid" : application.paymentStatus === "unlinked" ? "Not linked / unverified" : application.paymentStatus} />
          <Field label="Application review" value={application.approvalStatus} />
          {application.membership && <Field label="Membership" value={application.membership.status} />}
          {application.membership?.endDate && <Field label="Membership ends" value={application.membership.endDate} />}
        </dl>
        {application.status === "rejected" && <div className="stprofile-reconsideration-flow">
          <div className="stprofile-rejection-reason" role="note">
            <div className="stprofile-rejection-symbol" aria-hidden="true">!</div>
            <div>
              <h3>Application not approved</h3>
              <p className="stprofile-rejection-label">Reason provided by the administrator</p>
              <p className="stprofile-rejection-detail">{application.rejectionReason || "Please contact the administrator for more information."}</p>
            </div>
          </div>
          <form onSubmit={submitReapplication} className="stprofile-reapply-panel">
            <div className="stprofile-reapply-title">
              <div>
                <h3>Request reconsideration</h3>
                <p>Have additional information to share? Submit an explanation for the administrator to review your application again.</p>
              </div>
            </div>
            <label htmlFor="stprofile-reapply-reason">Your explanation <span className="stprofile-required">Required</span></label>
            <textarea id="stprofile-reapply-reason" rows={5} minLength={10} maxLength={500} required value={reapplyNote} onChange={e=>setReapplyNote(e.target.value)} placeholder="Explain what has changed, or provide the additional training details requested by the administrator." />
            <div className="stprofile-reapply-bottom">
              <span className="stprofile-reapply-hint">{reapplyNote.trim().length}/500 characters · Minimum 10</span>
              <button type="submit" className="stprofile-action stprofile-reapply-submit" disabled={reapplyBusy || reapplyNote.trim().length < 10}>{reapplyBusy ? "Submitting…" : "Submit reconsideration"}</button>
            </div>
            <p className="stprofile-reapply-footnote">Your existing account will be reused. Don't pay again unless the system explicitly asks you to.</p>
            {reapplyError && <p className="stprofile-reapply-feedback error" role="alert">{reapplyError}</p>}
            {reapplyMessage && <p className="stprofile-reapply-feedback success" role="status">{reapplyMessage}</p>}
          </form>
        </div>}
        {application.status === "photo_resubmission_required" && application.photoReviewNote &&
          <p className="stprofile-application-note"><strong>Photo update requested:</strong> {application.photoReviewNote}</p>}
      </>}
    </section>
  );
}

function Field({ label, value }) {
  return <div className="stprofile-field"><dt>{label}</dt><dd>{nice(value)}</dd></div>;
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [review, setReview] = useState(null);
  const [replacement, setReplacement] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [photoVersion, setPhotoVersion] = useState(0);
  const [application, setApplication] = useState(null);
  const [activeMembership, setActiveMembership] = useState(null);
  const [applicationBusy, setApplicationBusy] = useState(true);
  const [applicationError, setApplicationError] = useState("");
  async function refreshApplicationStatus() {
    setApplicationBusy(true);
    setApplicationError("");
    try {
      const data = await getApplicationStatus();
      setApplication(data.application ?? null);
      setActiveMembership(data.activeMembership ?? null);
    } catch (err) {
      setApplicationError(err.message || "Could not load your application status.");
    } finally {
      setApplicationBusy(false);
    }
  }
  useEffect(() => { refreshApplicationStatus(); }, []);

  useEffect(() => { getPhotoReviewStatus().then(({application})=>setReview(application)).catch(()=>{}); }, []);
  async function uploadReplacement(e) {
    e.preventDefault();
    if (!replacement || photoBusy) return;
    setPhotoBusy(true);setPhotoMessage('');
    try {
      await resubmitApplicationPhoto(replacement);
      const {application} = await getPhotoReviewStatus();
      setReview(application);setReplacement(null);setPhotoVersion(v=>v+1);
      await refreshApplicationStatus();
      setPhotoMessage('Photo submitted. The admin can now review the replacement.');
    } catch (err) { setPhotoMessage(err.message); }
    finally { setPhotoBusy(false); }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProfile().then(({ profile }) => { if (active) setProfile(profile); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!profile?.hasPhoto || !API_URL) return;
    const controller = new AbortController();
    let currentUrl = null;
    async function loadPhoto() {
      try {
        const res = await fetch(`${API_URL}/api/auth/profile-photo`, {
          headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        currentUrl = URL.createObjectURL(blob);
        setPhotoUrl(currentUrl);
      } catch (err) { if (err.name !== "AbortError") console.error("Profile photo unavailable", err); }
    }
    loadPhoto();
    return () => { controller.abort(); if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [profile?.hasPhoto, photoVersion]);

  const initial = (profile?.fullName || user?.fullName || "S").trim().charAt(0).toUpperCase();
  return (
    <div className="stprofile-page">
      <div className="stprofile-wrap">
        <Link className="stprofile-back" to="/dashboard">← Back to Dashboard</Link>
        <div className="stprofile-heading">
          <div><p className="stprofile-eyebrow">STUDENT ACCOUNT</p><h1>My Profile</h1><p>View the details from your registration.</p></div>
        </div>
        {loading ? <div className="stprofile-card" role="status">Loading your profile…</div>
        : error ? <div className="stprofile-card" role="alert"><p>{error}</p><button className="stprofile-action" onClick={() => window.location.reload()}>Try again</button></div>
        : profile && <>
          <section className="stprofile-card stprofile-identity" aria-label="Student identity">
            <div className="stprofile-avatar" aria-label="Profile picture">{photoUrl ? <img src={photoUrl} alt="Your profile" /> : <span>{initial}</span>}</div>
            <div className="stprofile-identity-text"><h2>{profile.fullName}</h2><p>{profile.email}</p><span className="stprofile-tag">Student account</span></div>
          </section>
          <ApplicationStatusCard application={application} activeMembership={activeMembership} busy={applicationBusy} error={applicationError} onRefresh={refreshApplicationStatus} />
          {review?.photo_review_status === 'resubmission_requested' && <section className="stprofile-card" aria-label="Replace profile photo">
            <h2>Profile photo needs updating</h2>
            <p>Admin request: <strong>{review.photo_review_note}</strong></p>
            <p>Upload a clear, appropriate photo showing your face. JPEG, PNG or WebP, maximum 2MB.</p>
            <form onSubmit={uploadReplacement}>
              <label>Replacement photo <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setReplacement(e.target.files?.[0] || null)}/></label>
              <button className="stprofile-action" type="submit" disabled={photoBusy || !replacement}>{photoBusy ? 'Submitting…' : 'Submit replacement photo'}</button>
            </form>
            {photoMessage && <p role="status">{photoMessage}</p>}
          </section>}
          {review?.photo_review_status === 'resubmitted' && <div className="stprofile-notice" role="status">Your replacement photo is awaiting admin review.</div>}
          {!profile.onboardingComplete && <div className="stprofile-notice">Signup details have not been recorded for this account. Contact an administrator if this seems incorrect.</div>}
          <div className="stprofile-grid">
            <section className="stprofile-card"><h2>Personal information</h2><dl className="stprofile-fields">
              <Field label="Full name" value={profile.fullName}/><Field label="Email address" value={profile.email}/>
              <Field label="Date of birth" value={profile.dateOfBirth}/><Field label="Gender" value={LABELS[profile.gender] || profile.gender}/>
              <Field label="Contact number" value={profile.phone}/><Field label="Joined on" value={profile.joinedOn}/>
            </dl></section>
            <section className="stprofile-card"><h2>Aikido experience</h2><dl className="stprofile-fields">
              <Field label="Experience level" value={profile.experienceLevel === "beginner" ? "Beginner" : profile.experienceLevel === "experienced" ? "Previously trained" : null}/>
              <Field label="Previous rank" value={profile.previousRank}/><Field label="Training background" value={profile.experienceNotes}/>
              <Field label="Certificate / evidence" value={profile.evidenceFilename}/>
              <Field label="Training goal" value={profile.trainingGoal}/>
            </dl></section>
          </div>
          <section className="stprofile-card stprofile-membership"><div><h2>Membership</h2><p>Plan selected during registration</p></div><div className="stprofile-member-right"><strong>{profile.membershipPlan === "annual" ? "1-year membership" : nice(profile.membershipPlan)}</strong><span className={profile.membershipStatus === "active" ? "stprofile-status active" : "stprofile-status"}>{profile.membershipStatus === "active" ? "Active" : profile.membershipStatus === "pending_payment" ? (application?.paymentStatus === "succeeded" ? "Paid · awaiting approval" : "Payment pending") : nice(profile.membershipStatus)}</span></div></section>
          <p className="stprofile-footnote">Your registration status is updated from your application, verified payment and membership records. Membership activation also requires approval and an accepted profile photo. Passwords and uploaded documents are never displayed.</p>
        </>}
      </div>
    </div>
  );
}

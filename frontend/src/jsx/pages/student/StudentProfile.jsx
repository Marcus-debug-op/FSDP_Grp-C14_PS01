import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getProfile } from "../../../js/services/studentService.js";
import "../../../css/student-profile.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token";

const LABELS = { male: "Male", female: "Female", other: "Other", prefer_not_to_say: "Prefer not to say" };
const nice = (v) => v === null || v === undefined || v === "" ? "Not provided" : v;

function Field({ label, value }) {
  return <div className="stprofile-field"><dt>{label}</dt><dd>{nice(value)}</dd></div>;
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState(null);

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
  }, [profile?.hasPhoto]);

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
          <section className="stprofile-card stprofile-membership"><div><h2>Membership</h2><p>Plan selected during registration</p></div><div className="stprofile-member-right"><strong>{profile.membershipPlan === "annual" ? "1-year membership" : nice(profile.membershipPlan)}</strong><span className={profile.membershipStatus === "active" ? "stprofile-status active" : "stprofile-status"}>{profile.membershipStatus === "pending_payment" ? "Payment pending" : profile.membershipStatus === "active" ? "Active" : nice(profile.membershipStatus)}</span></div></section>
          <p className="stprofile-footnote">Your information is read-only here. Passwords and uploaded documents are never displayed. Membership is not active until payment is confirmed.</p>
        </>}
      </div>
    </div>
  );
}

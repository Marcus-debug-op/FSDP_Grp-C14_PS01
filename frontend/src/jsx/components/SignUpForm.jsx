import { useEffect, useRef, useState } from "react";
import { getRegistrationPlans, getRegistrationCentres } from "../../js/services/registrationService.js";
import { useAuth } from "../context/AuthContext.jsx";

const STEPS = ["Account", "Experience", "Membership", "Profile"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

function dateIsValid(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= todayString;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

export default function SignUpForm() {
  const { signup } = useAuth();
  const [step, setStep] = useState(0);
  // Prevent a rapid second click from submitting when Continue becomes Create Account.
  const lastStepChangeAt = useRef(0);
  const TRANSITION_GUARD_MS = 650;
  const [direction, setDirection] = useState("forward");
  const [details, setDetails] = useState({
    fullName: "", email: "", dateOfBirth: "", gender: "", password: "", confirm: "",
    experienceLevel: "beginner", experienceNotes: "", previousRank: "",
    phone: "", trainingGoal: "",
    // FSDP-42: contact details, captured on the Profile step after membership.
    address: "", postalCode: "",
    emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "",
  });
  const [plans, setPlans] = useState([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  useEffect(() => {
    let active = true;
    getRegistrationPlans().then((rows) => {
      if (!active) return;
      setPlans(rows);
      setSelectedPlanId(rows.length === 1 ? rows[0].id : null);
      setPlanLoading(false);
    }).catch((err) => {
      if (active) { setPlanError(err.message); setPlanLoading(false); }
    });
    return () => { active = false; };
  }, []);
  const [centres, setCentres] = useState([]);
  const [centreLoading, setCentreLoading] = useState(true);
  const [centreError, setCentreError] = useState("");
  const [preferredCentreId, setPreferredCentreId] = useState("");
  useEffect(() => {
    let active = true;
    getRegistrationCentres().then((rows) => {
      if (active) { setCentres(rows); setCentreLoading(false); }
    }).catch((err) => {
      if (active) { setCentreError(err.message); setCentreLoading(false); }
    });
    return () => { active = false; };
  }, []);
  const [experienceFile, setExperienceFile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (name, value) => setDetails((prev) => ({ ...prev, [name]: value }));
  const goTo = (target) => {
    if (Date.now() - lastStepChangeAt.current < TRANSITION_GUARD_MS) return;
    lastStepChangeAt.current = Date.now();
    setDirection(target > step ? "forward" : "back");
    setError("");
    setStep(target);
  };

  function next() {
    if (Date.now() - lastStepChangeAt.current < TRANSITION_GUARD_MS) return;
    setError("");
    if (step === 0) {
      if (details.fullName.trim().length < 2 || details.fullName.trim().length > 100) return setError("Enter your full name (2–100 characters).");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) return setError("Enter a valid email address.");
      if (!dateIsValid(details.dateOfBirth)) return setError("Enter a valid date of birth (not a future date).");
      if (!["male", "female", "other", "prefer_not_to_say"].includes(details.gender)) return setError("Please select a gender option.");
      if (details.password.length < 8 || details.password.length > 72) return setError("Password must be between 8 and 72 characters.");
      if (details.password !== details.confirm) return setError("Passwords do not match.");
    }
    if (step === 2 && (!selectedPlanId || !plans.some(p => p.id === selectedPlanId))) return setError("Choose a registration plan before continuing.");
    if (step === 1 && details.experienceNotes.length > 1000) return setError("Training notes must be under 1,000 characters.");
    // The Membership step always navigates to Profile; never creates an account.
    goTo(Math.min(3, step + 1));
  }

  function toggleExperience(hasExperience) {
    if (!hasExperience) setExperienceFile(null);
    setDetails((current) => ({
      ...current,
      experienceLevel: hasExperience ? "experienced" : "beginner",
      previousRank: hasExperience ? current.previousRank : "",
      experienceNotes: hasExperience ? current.experienceNotes : "",
    }));
  }

  function chooseFile(event) {
    const file = event.target.files?.[0] || null;
    if (file && (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE)) {
      event.target.value = "";
      setExperienceFile(null);
      return setError("Please choose a PDF, PNG or JPG file up to 2 MB.");
    }
    setError("");
    setExperienceFile(file);
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE || file.size === 0) {
      event.target.value = "";
      return setError("Choose a JPG, PNG or WebP profile photo up to 2 MB.");
    }
    setError("");
    setProfilePhoto(file);
    // A blob URL is temporary and stays only in the browser; it is never sent to the API.
    setPhotoPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
  }

  function clearPhoto() {
    setProfilePhoto(null);
    setPhotoPreview((old) => { if (old) URL.revokeObjectURL(old); return ""; });
  }

  async function submit(event) {
    event.preventDefault();
    if (step !== 3 || submitting) return;
    // Ignore an accidental second click while the Profile step is animating in.
    if (Date.now() - lastStepChangeAt.current < TRANSITION_GUARD_MS) return;
    setError("");
    if (!selectedPlanId || !plans.some(p => p.id === selectedPlanId)) return setError("Please choose a registration plan.");
    if (!profilePhoto) return setError("Please upload a profile photo to complete your profile.");
    if (!details.phone.trim()) return setError("Please enter your contact number.");
    // FSDP-42. These repeat the server's rules so a typo is caught here rather
    // than after a round trip. The postal code strips spaces first, exactly as
    // utils/contactValidation.js does, so "579 783" is accepted both places.
    if (!details.address.trim()) return setError("Please enter your home address.");
    if (!/^\d{6}$/.test(details.postalCode.replace(/\s/g, ""))) return setError("Please enter your 6-digit postal code.");
    if (!details.emergencyContactName.trim()) return setError("Please enter the name of your emergency contact.");
    if (!details.emergencyContactPhone.trim()) return setError("Please enter a contact number for your emergency contact.");
    if (!details.trainingGoal.trim()) return setError("Please enter your Aikido training goal.");
    if (centreLoading || centreError || !centres.some(c => String(c.id) === preferredCentreId)) {
      return setError("Please select an available preferred dojo.");
    }
    setSubmitting(true);
    try {
      const evidence = details.experienceLevel === "experienced" && experienceFile ? await fileToDataUrl(experienceFile) : null;
      const photoData = profilePhoto ? await fileToDataUrl(profilePhoto) : null;
      // Store only the server-issued plan identifier, not a client-supplied price.
      // The post-signup page resumes checkout if Stripe is temporarily unavailable.
      sessionStorage.setItem("pending_registration_plan_id", String(selectedPlanId));
      await signup({
        fullName: details.fullName.trim(),
        email: details.email.trim(),
        dateOfBirth: details.dateOfBirth,
        gender: details.gender,
        password: details.password,
        experienceLevel: details.experienceLevel,
        experienceNotes: details.experienceLevel === "experienced" ? details.experienceNotes.trim() : "",
        previousRank: details.experienceLevel === "experienced" ? details.previousRank.trim() : "",
        experienceFile: evidence ? { name: experienceFile.name, type: experienceFile.type, dataUrl: evidence } : null,
        membershipSelection: "annual_pending_payment",
        selectedRegistrationPlanId: selectedPlanId,
        profilePhoto: photoData ? { name: profilePhoto.name, type: profilePhoto.type, dataUrl: photoData } : null,
        phone: details.phone.trim(),
        trainingGoal: details.trainingGoal.trim(),
        address: details.address.trim(),
        postalCode: details.postalCode.replace(/\s/g, ""),
        emergencyContactName: details.emergencyContactName.trim(),
        emergencyContactPhone: details.emergencyContactPhone.trim(),
        emergencyContactRelationship: details.emergencyContactRelationship.trim(),
        preferredCentreId: Number(preferredCentreId),
      });
      // AuthContext handles the signed-in state and existing dashboard redirect.
    } catch (err) {
      setError(err?.message || "Could not create your account. Please try again.");
      setSubmitting(false);
    }
  }

  const today = new Date();
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <form className="auth-form signup-wizard" onSubmit={submit} noValidate>
      <div className="signup-progress-head">
        <span>CREATE YOUR ACCOUNT</span>
        <span>Step {step + 1} of {STEPS.length}</span>
      </div>
      <div className="signup-progress-track" role="progressbar" aria-label="Signup progress" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4}>
        <div className="signup-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="signup-step-names" aria-label="Registration steps">
        {STEPS.map((name, index) => <li key={name} className={index === step ? "active" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined}>{name}</li>)}
      </ol>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div key={step} className={`signup-step-panel signup-enter-${direction}`}>
        {step === 0 && <>
          <h2>Let's get you started</h2>
          <p className="signup-subtitle">Create your account to begin your Aikido journey.</p>
          <div className="signup-field-grid">
            <label className="signup-span-full">Full name <input autoComplete="name" placeholder="Enter your full name" value={details.fullName} onChange={e => update("fullName", e.target.value)} maxLength={100} required /></label>
            <label className="signup-span-full">Email address <input type="email" autoComplete="email" placeholder="you@example.com" value={details.email} onChange={e => update("email", e.target.value)} required /></label>
            <label className="signup-span-full">Date of birth <input type="date" autoComplete="bday" min="1900-01-01" max={maxDate} value={details.dateOfBirth} onChange={e => update("dateOfBirth", e.target.value)} required /></label>
            <label className="signup-span-full">Gender
              <select value={details.gender} onChange={e => update("gender", e.target.value)} required>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </label>
            <label>Password <input type="password" autoComplete="new-password" placeholder="At least 8 characters" value={details.password} onChange={e => update("password", e.target.value)} minLength={8} maxLength={72} required /></label>
            <label>Confirm password <input type="password" autoComplete="new-password" placeholder="Repeat your password" value={details.confirm} onChange={e => update("confirm", e.target.value)} required /></label>
          </div>
        </>}

        {step === 1 && <>
          <h2>Your training experience</h2>
          <p className="signup-subtitle">We welcome everyone, whether this is your first class or you're returning to the mat.</p>
          <label className="signup-experience-toggle">
            <input
              type="checkbox"
              checked={details.experienceLevel === "experienced"}
              onChange={(event) => toggleExperience(event.target.checked)}
            />
            <span><strong>I have previous Aikido experience</strong><small>Leave unchecked if you're just starting out.</small></span>
          </label>
          {details.experienceLevel === "experienced" ? <div className="signup-extra-fields">
            <label>Previous rank / belt <input placeholder="e.g. 5th kyu" maxLength={100} value={details.previousRank} onChange={e => update("previousRank", e.target.value)} /></label>
            <label>Training background <textarea maxLength={1000} rows={3} placeholder="Previous dojo, years of training..." value={details.experienceNotes} onChange={e => update("experienceNotes", e.target.value)} /></label>
            <label>Supporting certificate <span className="signup-optional">(optional · PDF, PNG or JPG · max 2 MB)</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={chooseFile} /></label>
            {experienceFile && <p className="form-hint">Selected: {experienceFile.name}</p>}
          </div> : <p className="signup-soft-note">No previous experience needed. You can continue to the membership step.</p>}
        </>}

        {step === 2 && <>
          <h2>Choose your membership</h2>
          <p className="signup-subtitle">Select your registration package. Payment is completed securely after profile setup.</p>
          {planLoading && <p role="status" className="signup-soft-note">Loading membership options...</p>}
          {planError && <p role="alert" className="signup-soft-note">Could not load membership plans: {planError}</p>}
          {!planLoading && !planError && plans.length === 0 && (
            <p role="alert" className="signup-soft-note">No registration package is available. Please contact the team.</p>
          )}
          {!planLoading && !planError && plans.map((plan) => (
            <label key={plan.id} className="signup-membership-card" style={{ display: "block", cursor: "pointer", marginBottom: "1rem" }}>
              <div className="signup-plan-top">
                <span>NEW STUDENT REGISTRATION</span>
                <span className="signup-plan-tag">{plan.durationMonths} MONTHS</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginTop: "1rem" }}>
                <h3 style={{ margin: 0 }}>{plan.name}</h3>
                <input
                  type="radio"
                  name="registrationPlan"
                  value={plan.id}
                  checked={selectedPlanId === plan.id}
                  onChange={() => setSelectedPlanId(plan.id)}
                  aria-label={`Select ${plan.name}`}
                />
              </div>
              <p style={{ marginTop: ".75rem" }}><strong>SGD {(plan.priceCents / 100).toFixed(2)}</strong> one-time registration fee (includes current-year membership, handbook and membership book)</p>
              <div className="signup-plan-note">
                <strong>Payment and Shihan approval required for membership activation</strong>
                <span>Complete your profile next, then proceed to Stripe Checkout. Annual renewal is S$48 in subsequent years; not charged again at signup. Training passes and attire are separate.</span>
              </div>
            </label>
          ))}
        </>}

        {step === 3 && <>
          <h2>Make it yours</h2>
          <p className="signup-subtitle">Complete your profile before creating your account.</p>
          <div className="signup-field-grid">
            <div className="signup-span-full signup-photo-field">
              <span className="signup-photo-title">Profile photo</span>
              <div className="signup-photo-row">
                <div className="signup-photo-avatar" aria-label={profilePhoto ? "Profile photo preview" : "No profile photo selected"}>
                  {photoPreview ? <img src={photoPreview} alt="Your profile photo preview" /> : <span aria-hidden="true">👤</span>}
                </div>
                <div className="signup-photo-actions">
                  <label className="signup-photo-upload">Choose photo
                    <input required={!profilePhoto} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={choosePhoto} />
                  </label>
                  {profilePhoto && <button type="button" className="signup-remove-photo" onClick={clearPhoto}>Remove photo</button>}
                  <small>JPG, PNG or WebP · Max 2 MB · Square photo recommended</small>
                </div>
              </div>
            </div>
            <label className="signup-span-full">Preferred dojo
              <select
                required
                value={preferredCentreId}
                onChange={e => setPreferredCentreId(e.target.value)}
                disabled={centreLoading || !!centreError}
              >
                <option value="">{centreLoading ? "Loading dojos…" : "Select your preferred dojo"}</option>
                {centres.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
              {centres.some(c=>String(c.id)===String(preferredCentreId) && c.name === 'ASK Headquarters Dojo') &&
                <p role="status" className="form-hint">ASK HQ selected: our admin team will receive an in-app coordination alert for your first class, HQ session pass and training attire.</p>}
              {centreError && <small role="alert">Could not load dojos: {centreError}</small>}
              {!centreLoading && !centreError && centres.length === 0 && <small role="alert">No active dojos available.</small>}
            </label>
            <label>Contact number <input required type="tel" autoComplete="tel" placeholder="e.g. +65 9123 4567" maxLength={30} value={details.phone} onChange={e => update("phone", e.target.value)} /></label>
            <label>Postal code <input required type="text" autoComplete="postal-code" inputMode="numeric" placeholder="e.g. 579783" maxLength={7} value={details.postalCode} onChange={e => update("postalCode", e.target.value)} /></label>
            <label className="signup-span-full">Home address <textarea required maxLength={255} rows={2} placeholder="e.g. Blk 123 Bishan Street 12, #08-34" autoComplete="street-address" value={details.address} onChange={e => update("address", e.target.value)} />
              <span className="form-hint">Include your unit number, if you have one. We use your postal code to suggest dojos near you.</span>
            </label>

            {/* FSDP-42. Its own group with a line of explanation: people give a
                far more useful answer when they know why a dojo is asking. */}
            <div className="signup-span-full">
              <strong>Emergency contact</strong>
              <p className="form-hint">Who we should call if something happens while you're training.</p>
            </div>
            <label>Contact name <input required type="text" placeholder="e.g. Mei Ling Tan" maxLength={100} value={details.emergencyContactName} onChange={e => update("emergencyContactName", e.target.value)} /></label>
            <label>Their contact number <input required type="tel" placeholder="e.g. +65 9123 4567" maxLength={30} value={details.emergencyContactPhone} onChange={e => update("emergencyContactPhone", e.target.value)} /></label>
            <label className="signup-span-full">Relationship to you <span className="signup-optional">(optional)</span><input type="text" placeholder="e.g. Mother" maxLength={50} value={details.emergencyContactRelationship} onChange={e => update("emergencyContactRelationship", e.target.value)} /></label>

            <label className="signup-span-full">Your training goal <textarea required maxLength={500} rows={3} placeholder="What would you like to achieve through Aikido?" value={details.trainingGoal} onChange={e => update("trainingGoal", e.target.value)} /></label>
          </div>
          <p className="signup-soft-note">When you finish, your pending account will be created and you will proceed to secure payment.</p>
        </>}
      </div>

      <div className="signup-actions">
        {step > 0 && <button type="button" className="btn btn-outline" disabled={submitting} onClick={() => goTo(step - 1)}>Back</button>}

        {step < 3
          ? <button type="button" className="btn btn-primary signup-next" disabled={step === 2 && (planLoading || !!planError || !selectedPlanId)} onClick={next}>Continue <span aria-hidden="true">→</span></button>
          : <button type="submit" className="btn btn-primary signup-next" disabled={submitting}>{submitting ? "Creating account…" : "Create account →"}</button>}
      </div>
    </form>
  );
}
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const STEPS = ["Account", "Experience", "Membership", "Profile"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

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
  const [direction, setDirection] = useState("forward");
  const [details, setDetails] = useState({
    fullName: "", email: "", dateOfBirth: "", password: "", confirm: "",
    experienceLevel: "beginner", experienceNotes: "", previousRank: "",
    preferredName: "", phone: "", trainingGoal: "",
  });
  const [experienceFile, setExperienceFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (name, value) => setDetails((prev) => ({ ...prev, [name]: value }));
  const goTo = (target) => {
    setDirection(target > step ? "forward" : "back");
    setError("");
    setStep(target);
  };

  function next() {
    setError("");
    if (step === 0) {
      if (details.fullName.trim().length < 2 || details.fullName.trim().length > 100) return setError("Enter your full name (2–100 characters).");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) return setError("Enter a valid email address.");
      if (!dateIsValid(details.dateOfBirth)) return setError("Enter a valid date of birth (not a future date).");
      if (details.password.length < 8 || details.password.length > 72) return setError("Password must be between 8 and 72 characters.");
      if (details.password !== details.confirm) return setError("Passwords do not match.");
    }
    if (step === 1 && details.experienceNotes.length > 1000) return setError("Training notes must be under 1,000 characters.");
    goTo(Math.min(3, step + 1));
  }

  function selectBeginner() {
    setExperienceFile(null);
    setDetails((current) => ({ ...current, experienceLevel: "beginner", previousRank: "", experienceNotes: "" }));
    goTo(2);
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

  async function submit(event) {
    event.preventDefault();
    if (step !== 3 || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const evidence = details.experienceLevel === "experienced" && experienceFile ? await fileToDataUrl(experienceFile) : null;
      await signup({
        fullName: details.fullName.trim(),
        email: details.email.trim(),
        dateOfBirth: details.dateOfBirth,
        password: details.password,
        experienceLevel: details.experienceLevel,
        experienceNotes: details.experienceLevel === "experienced" ? details.experienceNotes.trim() : "",
        previousRank: details.experienceLevel === "experienced" ? details.previousRank.trim() : "",
        experienceFile: evidence ? { name: experienceFile.name, type: experienceFile.type, dataUrl: evidence } : null,
        membershipSelection: "annual_pending_payment",
        preferredName: details.preferredName.trim(),
        phone: details.phone.trim(),
        trainingGoal: details.trainingGoal.trim(),
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
            <label>Password <input type="password" autoComplete="new-password" placeholder="At least 8 characters" value={details.password} onChange={e => update("password", e.target.value)} minLength={8} maxLength={72} required /></label>
            <label>Confirm password <input type="password" autoComplete="new-password" placeholder="Repeat your password" value={details.confirm} onChange={e => update("confirm", e.target.value)} required /></label>
          </div>
        </>}

        {step === 1 && <>
          <h2>Your training experience</h2>
          <p className="signup-subtitle">We welcome everyone, whether this is your first class or you're returning to the mat.</p>
          <div className="signup-choice-grid">
            <button type="button" className={`signup-choice ${details.experienceLevel === "beginner" ? "selected" : ""}`} aria-pressed={details.experienceLevel === "beginner"} onClick={() => update("experienceLevel", "beginner")}>
              <span className="signup-choice-symbol" aria-hidden="true">✦</span><strong>I'm new to Aikido</strong><small>No experience needed</small>
            </button>
            <button type="button" className={`signup-choice ${details.experienceLevel === "experienced" ? "selected" : ""}`} aria-pressed={details.experienceLevel === "experienced"} onClick={() => update("experienceLevel", "experienced")}>
              <span className="signup-choice-symbol" aria-hidden="true">◈</span><strong>I've trained before</strong><small>Share your experience (optional)</small>
            </button>
          </div>
          {details.experienceLevel === "experienced" ? <div className="signup-extra-fields">
            <label>Previous rank / belt <input placeholder="e.g. 5th kyu" maxLength={100} value={details.previousRank} onChange={e => update("previousRank", e.target.value)} /></label>
            <label>Training background <textarea maxLength={1000} rows={3} placeholder="Previous dojo, years of training..." value={details.experienceNotes} onChange={e => update("experienceNotes", e.target.value)} /></label>
            <label>Supporting certificate <span className="signup-optional">(optional · PDF, PNG or JPG · max 2 MB)</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={chooseFile} /></label>
            {experienceFile && <p className="form-hint">Selected: {experienceFile.name}</p>}
          </div> : <p className="signup-soft-note">Perfect! You'll start with beginner-friendly classes. You can skip this step.</p>}
        </>}

        {step === 2 && <>
          <h2>Your membership</h2>
          <p className="signup-subtitle">Explore the annual plan before completing your profile.</p>
          <div className="signup-membership-card">
            <div className="signup-plan-top"><span>STUDENT MEMBERSHIP</span><span className="signup-plan-tag">12 MONTHS</span></div>
            <h3>Annual membership</h3>
            <p>Access your student membership journey and upcoming training features.</p>
            <div className="signup-plan-note"><strong>Payment coming soon</strong><span>Stripe is not connected yet. No payment will be collected, and membership stays pending until payment is implemented.</span></div>
          </div>
        </>}

        {step === 3 && <>
          <h2>Make it yours</h2>
          <p className="signup-subtitle">Just a few optional details to personalise your experience.</p>
          <div className="signup-field-grid">
            <label>Preferred name <span className="signup-optional">(optional)</span><input placeholder="What should we call you?" maxLength={100} value={details.preferredName} onChange={e => update("preferredName", e.target.value)} /></label>
            <label>Contact number <span className="signup-optional">(optional)</span><input type="tel" autoComplete="tel" placeholder="e.g. +65 9123 4567" maxLength={30} value={details.phone} onChange={e => update("phone", e.target.value)} /></label>
            <label className="signup-span-full">Your training goal <span className="signup-optional">(optional)</span><textarea maxLength={500} rows={3} placeholder="What would you like to achieve through Aikido?" value={details.trainingGoal} onChange={e => update("trainingGoal", e.target.value)} /></label>
          </div>
          <p className="signup-soft-note">When you finish, your account will be created and you'll be signed in.</p>
        </>}
      </div>

      <div className="signup-actions">
        {step > 0 && <button type="button" className="btn btn-outline" disabled={submitting} onClick={() => goTo(step - 1)}>Back</button>}
        {step === 1 && details.experienceLevel === "beginner" && <button type="button" className="signup-text-button" onClick={selectBeginner}>I'm a beginner — skip</button>}
        {step < 3
          ? <button type="button" className="btn btn-primary signup-next" onClick={next}>Continue <span aria-hidden="true">→</span></button>
          : <button type="submit" className="btn btn-primary signup-next" disabled={submitting}>{submitting ? "Creating account…" : "Create account →"}</button>}
      </div>
    </form>
  );
}

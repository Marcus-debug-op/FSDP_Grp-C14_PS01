import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getAssessments, saveAssessment } from "../../../js/services/instructorService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import BackButton from "../../components/BackButton.jsx";
import ReadinessRow from "../../components/ReadinessRow.jsx";
import SignaturePad from "../../components/SignaturePad.jsx";
import { gradingDay } from "./InstructorGrading.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

const RESULTS = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
];

function stateOf(candidate) {
  if (!candidate.assessment) return { label: "Not started", button: "Assess", className: "is-none" };
  if (candidate.assessment.status === "draft") return { label: "Draft saved", button: "Continue", className: "is-draft" };
  return { label: "Submitted", button: "View", className: "is-done" };
}

// One candidate's assessment: readiness for reference, Pass or Fail, feedback
// and a drawn signature. Save a draft any time; Sign and Submit locks it.
function AssessmentForm({ gradingId, candidate, canAssess, onSaved }) {
  const saved = candidate.assessment;
  const locked = saved?.status === "submitted" || !canAssess;
  const [result, setResult] = useState(saved?.result || null);
  const [feedback, setFeedback] = useState(saved?.feedback || "");
  const [signature, setSignature] = useState(saved?.signature || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(submit) {
    if (submit && !window.confirm(`Submit ${candidate.fullName}'s assessment? It can't be changed after this.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await saveAssessment(gradingId, candidate.applicationId, { result, feedback, signature, submit });
      setNotice(submit ? "Assessment signed and submitted." : "Draft saved.");
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="assess-form">
      <p className="eyebrow">Assessment · {candidate.currentBelt} to {candidate.nextBelt}</p>
      <h2 className="assess-name">{candidate.fullName}</h2>
      <p className="trends-note">
        Months at {candidate.currentBelt} on the grading day: {saved?.monthsAtRank ?? candidate.monthsAtBelt ?? "–"} (saved with the result).
      </p>

      <ul className="readiness-list">
        <ReadinessRow student={candidate} linkName={false} />
      </ul>

      {saved?.status === "submitted" ? (
        <div className="assess-submitted">
          <p><strong>Result:</strong> {saved.result === "pass" ? "Pass" : "Fail"}</p>
          <p><strong>Feedback:</strong> {saved.feedback}</p>
          <p><strong>Signed by</strong> {saved.assessedBy} on {saved.signedAt}</p>
          {saved.signature && <img className="assess-signature-img" src={saved.signature} alt={`Signature of ${saved.assessedBy}`} />}
          <p className="trends-note">Submitted for processing. It can't be changed.</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); save(true); }}>
          <p className="assess-label" id="result-label">Result</p>
          <div className="roster-options assess-results" role="group" aria-labelledby="result-label">
            {RESULTS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`roster-option roster-option-${option.value === "pass" ? "present" : "absent"}${result === option.value ? " is-selected" : ""}`}
                aria-pressed={result === option.value}
                disabled={locked || busy}
                onClick={() => setResult(result === option.value ? null : option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="assess-label" htmlFor="assess-feedback">Feedback</label>
          <textarea
            id="assess-feedback"
            className="assess-feedback"
            rows={4}
            maxLength={2000}
            value={feedback}
            placeholder="What they did well, and what to work on before the next grading"
            disabled={locked || busy}
            onChange={(e) => setFeedback(e.target.value)}
          />

          <p className="assess-label">Your signature</p>
          <SignaturePad key={candidate.applicationId} initial={saved?.signature || null} onChange={setSignature} disabled={locked || busy} />

          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="notice" role="status">{notice}</p>}

          {canAssess && (
            <div className="offer-actions assess-actions">
              <button type="button" className="btn btn-outline" disabled={busy} onClick={() => save(false)}>
                Save Draft
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Saving..." : "Sign and Submit"}
              </button>
            </div>
          )}
          <p className="trends-note">Submitting locks the assessment and sends it for processing. The student sees it as submitted, not the result.</p>
        </form>
      )}
    </div>
  );
}

// FSDP-18 / FSDP-75: the examiner's page for one grading. Lists every approved
// candidate with how far their assessment has got, and opens the form for one.
export default function GradingAssessment() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    getAssessments(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  function open(applicationId) {
    setSelectedId(applicationId);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }), 0);
  }

  function replaceCandidate(updated) {
    setData({ ...data, candidates: data.candidates.map((c) => (c.applicationId === updated.applicationId ? updated : c)) });
  }

  const grading = data?.grading;
  const candidates = data?.candidates || [];
  const submittedCount = candidates.filter((c) => c.assessment?.status === "submitted").length;
  const selected = candidates.find((c) => c.applicationId === selectedId);

  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container analytics-page">
          <BackButton />
          {error && <p className="form-error" role="alert">{error}</p>}

          {grading && (
            <>
              <p className="eyebrow">You're the examiner</p>
              <h1 className="roster-title">{gradingDay(grading.date)}</h1>
              <p className="lead">
                {grading.centre}, {formatTime(grading.startTime)} · {candidates.length} approved{" "}
                {candidates.length === 1 ? "candidate" : "candidates"} · {submittedCount} submitted
              </p>

              {data.testMode && (
                <p className="notice">Test mode is on, so you can assess before the grading day. Turn it off before the real grading.</p>
              )}
              {!data.canAssess && <p className="notice">Assessments open on the grading day. You can look through the candidates until then.</p>}

              {candidates.length === 0 ? (
                <p className="notice readiness-empty">No candidates have been approved for this grading yet.</p>
              ) : (
                <ul className="check-on-list candidate-list">
                  {candidates.map((candidate) => {
                    const state = stateOf(candidate);
                    return (
                      <li key={candidate.applicationId} className={`candidate-row${candidate.applicationId === selectedId ? " is-open" : ""}`}>
                        <div>
                          <strong>{candidate.fullName}</strong>
                          <span className="check-on-dojo">{candidate.currentBelt} to {candidate.nextBelt}</span>
                        </div>
                        <span className={`candidate-state ${state.className}`}>
                          {state.label}
                          {candidate.assessment?.status === "submitted" && ` · ${candidate.assessment.result === "pass" ? "Pass" : "Fail"}`}
                        </span>
                        <button type="button" className="btn btn-outline btn-small" onClick={() => open(candidate.applicationId)}>
                          {state.button}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div ref={formRef} className="assess-anchor">
                {selected && (
                  <AssessmentForm
                    key={selected.applicationId}
                    gradingId={grading.id}
                    candidate={selected}
                    canAssess={data.canAssess}
                    onSaved={replaceCandidate}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

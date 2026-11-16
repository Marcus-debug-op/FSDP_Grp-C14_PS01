// Talks to the grading API.
// Address comes from frontend/.env (VITE_API_URL).
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token"; // same key AuthContext.jsx saves the login under

async function request(path, { method = "GET", body } = {}) {
  if (!API_URL) {
    throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");
  }

  const headers = { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// Everything the grading page needs, in one call. Serves both the progress bar
// (FSDP-61) and the eligibility breakdown (FSDP-63), because they are computed
// from the same counts:
//   { profileReady, currentBelt, nextBelt, atHighestBelt, progress,
//     eligible, unmet, nextGrading, application, canApply, syllabus }
//
// `canApply` is the server's own decision and is re-checked when an
// application is actually submitted -- never treat it as the only gate.
//
// `fee` is { amountCents } for the belt being graded for, or null when no exam
// fee has been set up for it -- in which case canApply is false too.
export const getEligibility = () => request("/api/grading/eligibility");

// the student has decided to apply. The server checks eligibility,
// the deadline and the fee again, then answers with a Stripe Checkout address,
// and this sends the browser there (same as paymentService.startCheckout).
//
// Nothing is created by this call. The application only exists once Stripe has
// confirmed the exam fee, so closing the Stripe page leaves nothing behind.
export async function applyForGrading(gradingSessionId) {
  const { url } = await request("/api/grading/applications", {
    method: "POST",
    body: { gradingSessionId },
  });
  window.location.assign(url);
}

// the student's grading applications and where each stands, for the
// status tracker. Returns:
//   { steps:        [{ key, label }, ...]   the fixed four-step journey,
//     applications: [{ id, gradingSessionId, belt:{name,colour},
//                      gradingDate, startTime, centreName, appliedOn,
//                      acceptedOn, assessedOn,
//                      step, statusKey, statusLabel }, ...] }  newest first
//
// `step` is 1..steps.length -- how far this application has reached. Grading
// results are out of scope and never included: a submitted assessment shows
// only as "Submitted for processing".
export const getMyApplications = () => request("/api/grading/applications/me");

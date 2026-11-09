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
export const getEligibility = () => request("/api/grading/eligibility");

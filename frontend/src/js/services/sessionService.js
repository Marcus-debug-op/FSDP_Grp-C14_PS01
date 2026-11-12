// Talks to the session change API (FSDP-56): an admin, or the instructor
// teaching it, cancels a lesson or moves it to another dojo for the day.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token";

async function request(path, { method = "GET", body } = {}) {
  if (!API_URL) throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");

  let res;
  try {
    res = await fetch(`${API_URL}/api/sessions${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// { session: { id, title, date, startTime, endTime, status, centreId, centre, canChange, booked, ... }, centres }
export const getSession = (sessionId) => request(`/${encodeURIComponent(sessionId)}`);

// { cancelled, studentsTold, creditsReturned }
export const cancelSession = (sessionId, reason) =>
  request(`/${encodeURIComponent(sessionId)}/cancel`, { method: "POST", body: { reason } });

// { moved, centre, studentsTold }
export const moveSession = (sessionId, centreId, note) =>
  request(`/${encodeURIComponent(sessionId)}/move`, { method: "POST", body: { centreId, note } });

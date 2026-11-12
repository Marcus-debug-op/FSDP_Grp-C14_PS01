// Talks to the lesson booking API. Uses the same saved token as AuthContext.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token";

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Something went wrong.");
    error.status = res.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

// Upcoming lessons plus the student's credits and membership.
// filters = { centreId, day, instructorId, suitsBelt } (empty values are skipped)
export function getLessons(filters = {}) {
  const params = new URLSearchParams();
  if (filters.centreId) params.set("centreId", filters.centreId);
  if (filters.day !== "" && filters.day !== undefined) params.set("day", filters.day);
  if (filters.instructorId) params.set("instructorId", filters.instructorId);
  if (filters.suitsBelt) params.set("suitsBelt", "1");
  const query = params.toString();
  return request(`/api/student/lessons${query ? `?${query}` : ""}`);
}

// { bookingId, creditsLeft, lesson: { id, title, centre, date, startTime } }
export const bookLesson = (sessionId) =>
  request(`/api/student/lessons/${encodeURIComponent(sessionId)}/book`, { method: "POST" });

// Cancels the student's booking for a session (FSDP-55).
// Inside the notice period the server answers 409 with code "late_cancel"
// unless acceptLostCredit is true.
// { bookingId, refunded, lateCancel, creditsLeft, lesson: { id, title, centre, date, startTime } }
export const cancelLesson = (sessionId, { acceptLostCredit = false } = {}) =>
  request(`/api/student/lessons/${encodeURIComponent(sessionId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ acceptLostCredit }),
  });

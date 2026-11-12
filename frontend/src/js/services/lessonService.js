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
// filters = { centreId, day, date, type, instructorId, suitsBelt } (empty values are skipped)
// type is "group" or "private" (1-on-1); leave it empty for both.
export function getLessons(filters = {}) {
  const params = new URLSearchParams();
  if (filters.centreId) params.set("centreId", filters.centreId);
  if (filters.day !== "" && filters.day !== undefined) params.set("day", filters.day);
  if (filters.date) params.set("date", filters.date);
  if (filters.type) params.set("type", filters.type);
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

// FSDP-41: the student's lessons for the week containing `week` ("YYYY-MM-DD").
// { weekStart, thisWeek, today, items: [...] }
export const getTimetable = (week) =>
  request(`/api/student/timetable${week ? `?week=${encodeURIComponent(week)}` : ""}`);

// FSDP-59: past lessons. filters = { month: "YYYY-MM", centreId }
// { items, summary: { attended, missed, cancelled }, options: { months, centres } }
export function getHistory(filters = {}) {
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  if (filters.centreId) params.set("centreId", filters.centreId);
  const query = params.toString();
  return request(`/api/student/history${query ? `?${query}` : ""}`);
}

// FSDP-54: 1-on-1 sessions.
// { lessons, centres, credits, creditCost, daysAhead, maxOpenRequests, timeChoices }
export const getPrivateLessons = () => request("/api/student/private-lessons");

// request = { centreId, preferredDate, preferredTime, note }
export const requestPrivateLesson = (request_) =>
  request("/api/student/private-lessons", { method: "POST", body: JSON.stringify(request_) });

export const withdrawPrivateLesson = (id) =>
  request(`/api/student/private-lessons/${encodeURIComponent(id)}/withdraw`, { method: "POST" });

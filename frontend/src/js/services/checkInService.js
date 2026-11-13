// QR check-in API: instructors get a short-lived code, students send it back.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token";

async function post(path, body) {
  if (!API_URL) throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new Error("Cannot reach the server. Check your internet connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// Instructor: { token, expiresInSeconds, session }
export const createCheckInQr = (sessionId) => post(`/api/instructor/sessions/${sessionId}/qr`);

// Student: { alreadyCheckedIn, session }
export const checkInWithToken = (token) => post("/api/student/check-in", { token });

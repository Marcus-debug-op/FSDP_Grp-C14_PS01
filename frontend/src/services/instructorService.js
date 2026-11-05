// Talks to the instructor API. Uses the same saved token as AuthContext.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token";

async function request(path, { method = "GET", body } = {}) {
  if (!API_URL) throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");

  let res;
  try {
    res = await fetch(`${API_URL}/api/instructor${path}`, {
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

export const getTodaysClasses = () => request("/classes").then((d) => d.classes);
export const getRoster = (sessionId) => request(`/sessions/${sessionId}/roster`);
export const saveAttendance = (sessionId, records) =>
  request(`/sessions/${sessionId}/attendance`, { method: "PUT", body: { records } });

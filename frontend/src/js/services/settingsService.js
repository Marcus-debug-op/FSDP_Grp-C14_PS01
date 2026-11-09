// Talks to the student personal-settings API.   FSDP-42
// Address comes from frontend/.env (VITE_API_URL).
// NOTE: authService.js keeps its request() helper private, so this file has a
// small copy, like beltService.js does. Once the team agrees on a shared
// apiClient.js, all three can use that instead. This copy also sends a body,
// which the other two don't need.
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

// Everything the settings page shows, in one call:
//   { profileReady, contact, belt, membership, homeDojo, nearbyDojos }
// belt and membership are for display only -- there is no route that writes them.
export const getSettings = () => request("/api/student/settings");

// Saves only the fields passed in, and returns the same shape as getSettings,
// with nearbyDojos recalculated from the new postal code.
export const saveSettings = (changes) =>
  request("/api/student/settings", { method: "PATCH", body: changes });

// Confirms one of the suggested dojos as the student's home dojo.
// Returns the same shape as getSettings.
export const chooseHomeDojo = (centreId) =>
  request("/api/student/settings/home-dojo", { method: "PUT", body: { centreId } });

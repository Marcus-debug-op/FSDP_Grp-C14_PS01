// Talks to the backend belt API. Address comes from frontend/.env (VITE_API_URL).
// NOTE: authService.js keeps its request() helper private, so this file has a small copy.
// Once the team agrees on a shared apiClient.js, both files can use that instead.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token"; // same key AuthContext.jsx saves the login under

async function request(path) {
  if (!API_URL) {
    throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` },
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// Returns { belt }. "belt" is null if the student has no profile/belt yet.
export const getMyBelt = () => request("/api/belts/me");

// Returns { progression, hasProfile }. progression is the full belt ladder,
// each item tagged status: "achieved" | "current" | "upcoming".
export const getMyProgression = () => request("/api/belts/me/progression");

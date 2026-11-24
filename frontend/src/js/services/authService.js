// Talks to the backend auth API. The address comes from frontend/.env (VITE_API_URL).
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// Returns { token, user }
export const signup = (details) =>
  request("/api/auth/signup", { method: "POST", body: JSON.stringify(details) });

// Returns { token, user }
export const login = (details) =>
  request("/api/auth/login", { method: "POST", body: JSON.stringify(details) });

// Returns the signed-in user (used to restore a session after a page refresh)
export async function getMe(token) {
  const data = await request("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  return data.user;
}

// FSDP-90 forgot password. Each returns { message } (check also returns { valid }).
export const requestPasswordReset = (email) =>
  request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });

export const checkResetToken = (token) =>
  request("/api/auth/reset-password/check", { method: "POST", body: JSON.stringify({ token }) });

export const resetPassword = ({ token, password }) =>
  request("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });

// Step 1 signup check: only returns { exists }, not private application details.
export const checkSignupEmail = (email) =>
  request("/api/auth/check-email", { method: "POST", body: JSON.stringify({ email }) });

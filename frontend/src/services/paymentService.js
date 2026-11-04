// Talks to the payment API. Uses the same saved token as AuthContext.
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
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// { plans: [...], packages: [...] }
export const getOptions = () => request("/api/payments/options");

// Sends the student to Stripe Checkout. kind = "membership" | "credits"
export async function startCheckout(kind, itemId) {
  const { url } = await request("/api/payments/checkout", {
    method: "POST",
    body: JSON.stringify({ kind, itemId }),
  });
  window.location.assign(url);
}

// { status, purpose, amountCents, failureReason }
export const getCheckoutStatus = (sessionId) =>
  request(`/api/payments/session/${encodeURIComponent(sessionId)}`);

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function getRegistrationPlans() {
  if (!API_URL) throw new Error("Set VITE_API_URL in frontend/.env");
  const response = await fetch(`${API_URL}/api/registration/plans`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not load membership plans.");
  return data.plans || [];
}

export async function getRegistrationCentres() {
  if (!API_URL) throw new Error("Set VITE_API_URL in frontend/.env");
  const response = await fetch(`${API_URL}/api/registration/centres`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not load dojo locations.");
  return data.centres || [];
}

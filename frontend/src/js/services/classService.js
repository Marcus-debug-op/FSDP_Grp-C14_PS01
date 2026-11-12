// The public timetable always uses the database. No stale hardcoded fallback.
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

export async function getClasses() {
  const res = await fetch(`${API_URL}/api/classes`);
  if (!res.ok) throw new Error(`Timetable request failed (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Unexpected timetable response");
  return data;
}

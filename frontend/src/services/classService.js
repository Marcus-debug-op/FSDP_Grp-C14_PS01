import { hqClasses } from "../data/hqClasses.js";

// Set VITE_USE_CLASSES_API=true in frontend/.env once the backend has /api/classes.
// Until then the timetable uses the Headquarters Dojo schedule in data/hqClasses.js.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const USE_API = import.meta.env.VITE_USE_CLASSES_API === "true";

// Returns an array of classes. Each class has: id, name, type, day, start, time, instructor, dojo, note
export async function getClasses() {
  if (USE_API && API_URL) {
    try {
      const res = await fetch(`${API_URL}/api/classes`);
      if (!res.ok) throw new Error(`API responded with ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("Classes API unavailable, using the built-in timetable:", err.message);
    }
  }
  return hqClasses;
}

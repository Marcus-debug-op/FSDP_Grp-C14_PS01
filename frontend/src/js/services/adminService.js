const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token";

async function request(path, { method = "GET", body, query } = {}) {
  if (!API_URL) throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");
  const params = new URLSearchParams(
    Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
  const url = `${API_URL}/api/admin${path}${params.toString() ? `?${params}` : ""}`;
  let res;
  try {
    res = await fetch(url, {
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

export const getOverview = () => request("/overview");
export const getDashboard = (view) => request("/dashboard", { query: { view } });

export const getCentres = () => request("/centres").then((d) => d.centres);
export const createCentre = (centre) => request("/centres", { method: "POST", body: centre }).then((d) => d.centre);
export const updateCentre = (id, centre) => request(`/centres/${id}`, { method: "PUT", body: centre }).then((d) => d.centre);
export const setCentreStatus = (id, isActive) =>
  request(`/centres/${id}/status`, { method: "PATCH", body: { isActive } }).then((d) => d.centre);

export const getInstructors = () => request("/instructors").then((d) => d.instructors);

export const getSchedule = (query) => request("/schedule", { query });

export const getAttendance = (query) => request("/attendance", { query });
export const getSessionAttendance = (id) => request(`/attendance/sessions/${id}`);

export const getBelts = () => request("/belts").then((d) => d.belts);
export const searchStudents = (query) => request("/students", { query });
export const getStudent = (id) => request(`/students/${id}`);

export const getPrivateLessons = (view) => request("/private-lessons", { query: { view } });
export const getInstructorAvailability = (query) =>
  request("/private-lessons/availability", { query }).then((d) => d.instructors);
export const createPrivateLesson = (lesson) => request("/private-lessons", { method: "POST", body: lesson }).then((d) => d.lesson);
export const schedulePrivateLesson = (id, lesson) =>
  request(`/private-lessons/${id}/schedule`, { method: "PATCH", body: lesson }).then((d) => d.lesson);
export const cancelPrivateLesson = (id, adminNote) =>
  request(`/private-lessons/${id}/cancel`, { method: "PATCH", body: { adminNote } });
export const recordPrivateLessonOutcome = (id, outcome) =>
  request(`/private-lessons/${id}/outcome`, { method: "PATCH", body: { outcome } }).then((d) => d.lesson);

// New-member application review (admin-only API)
export const listMembershipApplications = (status = "pending") => request("/applications", { query: { status } }).then((r) => r.applications);
export const getMembershipApplication = (id) => request(`/applications/${id}`).then((r) => r.application);
export const decideMembershipApplication = (id, decision, rejectionReason = "") =>
  request(`/applications/${id}/decision`, { method: "PATCH", body: { decision, rejectionReason } });

// Private profile photo: fetch as a Blob using admin JWT, not a public <img> URL.
export async function getMembershipApplicationPhoto(id, { signal } = {}) {
  if (!API_URL) throw new Error('Backend address is not configured.');
  const res = await fetch(`${API_URL}/api/admin/applications/${encodeURIComponent(id)}/photo`, {
    headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` },
    signal,
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load the photo (${res.status}).`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Unexpected photo file type.');
  return blob;
}

export const requestMembershipPhotoResubmission = (id, reason) =>
  request(`/applications/${id}/photo/request`, { method: 'PATCH', body: { reason } });
export const acceptMembershipApplicationPhoto = (id) =>
  request(`/applications/${id}/photo/accept`, { method: 'PATCH' });

// Admin-only membership book tracking.
export const advanceMembershipBook = (id, status) =>
  request(`/applications/${id}/book`, { method: "PATCH", body: { status } }).then((r) => r.book);

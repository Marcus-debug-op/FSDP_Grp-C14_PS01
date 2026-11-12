// Talks to the student portal API. Uses the same saved token as AuthContext.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "shinjukai_token";

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

// Everything the student dashboard shows, in one call.
export const getDashboard = () => request("/api/student/dashboard");

// Student personal data: protected, no hardcoded values.
export const getProfile = () => request("/api/student/profile");

export const getPhotoReviewStatus = () => request('/api/student/application/photo-status');
export async function resubmitApplicationPhoto(file) {
  if (!API_URL) throw new Error('Backend address not configured.');
  if (!['image/jpeg','image/png','image/webp'].includes(file?.type) || file.size > 2*1024*1024 || !file.size) {
    throw new Error('Choose a JPEG, PNG or WebP photo under 2MB.');
  }
  const res = await fetch(`${API_URL}/api/student/application/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}`, 'Content-Type': file.type },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not submit your photo.');
  return data;
}

// Read-only, authenticated membership application progress.
export const getApplicationStatus = () => request("/api/student/application/status");

// Notices about bookings, payments, lesson changes and 1-on-1s
// (FSDP-47, 53, 54, 56). { unread, notices: [{ id, type, title, body, read, createdAt }] }
export const getNotices = () => request("/api/student/notices");

export async function markNoticesRead() {
  if (!API_URL) throw new Error("Backend address not set. Add VITE_API_URL to frontend/.env and restart.");
  const res = await fetch(`${API_URL}/api/student/notices/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` },
  }).catch(() => {
    throw new Error("Cannot reach the server. Is the backend running?");
  });
  if (!res.ok) throw new Error("Couldn't mark your notices as read.");
}

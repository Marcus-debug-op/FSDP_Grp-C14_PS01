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

// Today's group classes and accepted private lessons: { classes, privateLessons }.
export const getToday = () => request("/classes");
export const getCalendar = (month) => request(`/calendar?month=${month}`);
// status: "present" | "absent" | null (clears the mark)
export const markPrivateLesson = (lessonId, status) =>
  request(`/private-lessons/${lessonId}/attendance`, { method: "PUT", body: { status } }).then((d) => d.lesson);
export const getOffers =() => request("/offers").then((d) => d.offers);
export const acceptOffer = (offerId) => request(`/offers/${offerId}/accept`, { method: "POST" });
export const declineOffer = (offerId, reason) => request(`/offers/${offerId}/decline`, { method: "POST", body: { reason } });
export const getAttendanceTrends =() => request("/attendance-trends");
export const getStudentProgress = (studentId) => request(`/students/${studentId}/progress`);
export const getGradingReadiness =() => request("/grading-readiness").then((d) => d.students);
export const getUpcomingGradings = () => request("/gradings").then((d) => d.gradings);
// FSDP-18 / FSDP-75: the examiner's candidates, and saving one assessment.
// body: { result: "pass" | "fail" | null, feedback, signature, submit }
export const getAssessments = (gradingId) => request(`/gradings/${gradingId}/assessments`);
export const saveAssessment = (gradingId, applicationId, body) =>
  request(`/gradings/${gradingId}/assessments/${applicationId}`, { method: "PUT", body }).then((d) => d.candidate);
export const getGradingApplicants =(gradingId) => request(`/gradings/${gradingId}/applicants`);
export const setApplicantApproval = (gradingId, studentId, approved) =>
  request(`/gradings/${gradingId}/applicants/${studentId}/approval`, { method: "PUT", body: { approved } });
// FSDP-69 "Can't make it": returns the updated roster session.
export const requestCover = (sessionId, reason) =>
  request(`/sessions/${sessionId}/cover-request`, { method: "POST", body: { reason } }).then((d) => d.session);
export const getRoster =(sessionId) => request(`/sessions/${sessionId}/roster`);
export const saveAttendance = (sessionId, records) =>
  request(`/sessions/${sessionId}/attendance`, { method: "PUT", body: { records } });

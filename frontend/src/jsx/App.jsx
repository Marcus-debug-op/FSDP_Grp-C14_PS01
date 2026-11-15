import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { MembershipAccessProvider } from "./context/MembershipAccessContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import AdminShell from "./components/admin/AdminShell.jsx";
import Home from "./pages/Home.jsx";
import PublicTimetable from "./pages/PublicTimetable.jsx";
import About from "./pages/About.jsx";
import Dojos from "./pages/Dojos.jsx";
import JoinFees from "./pages/JoinFees.jsx";
import ClassesGuide from "./pages/ClassesGuide.jsx";
import Contact from "./pages/Contact.jsx";
import NotFound from "./pages/NotFound.jsx";
import CheckIn from "./pages/student/CheckIn.jsx";
import CheckInQr from "./pages/instructor/CheckInQr.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Payments from "./pages/Payments.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";
import RegistrationCheckout from "./pages/RegistrationCheckout.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import AdminSchedule from "./pages/admin/AdminSchedule.jsx";
import ManageDojos from "./pages/admin/ManageDojos.jsx";
import AdminAttendance from "./pages/admin/AdminAttendance.jsx";
import AdminStudents from "./pages/admin/AdminStudents.jsx";
import AdminMembershipApplications from "./pages/admin/AdminMembershipApplications.jsx";
import AdminStudentProfile from "./pages/admin/AdminStudentProfile.jsx";
import AdminPrivateLessons from "./pages/admin/AdminPrivateLessons.jsx";
import AdminCoverRequests from "./pages/admin/AdminCoverRequests.jsx";
import AdminGrading from "./pages/admin/AdminGrading.jsx";
import AdminGradingApplications from "./pages/admin/AdminGradingApplications.jsx";
import BeltProgress from "./pages/student/BeltProgress.jsx";
import BookLessons from "./pages/student/BookLessons.jsx";
import MyTimetable from "./pages/student/MyTimetable.jsx";
import Grading from "./pages/student/Grading.jsx";
import StudentProfile from "./pages/student/StudentProfile.jsx";
import PersonalSettings from "./pages/student/PersonalSettings.jsx";
import Inbox from "./pages/student/Inbox.jsx";
import ClassRoster from "./pages/instructor/ClassRoster.jsx";
import InstructorCalendar from "./pages/instructor/InstructorCalendar.jsx";
import InstructorGrading from "./pages/instructor/InstructorGrading.jsx";
import InstructorAnalytics from "./pages/instructor/InstructorAnalytics.jsx";
import InstructorGradingSession from "./pages/instructor/InstructorGradingSession.jsx";

// AuthProvider makes the signed-in user available to every page below it.
export default function App() {
  const { pathname } = useLocation();
  // These pages fade in on arrival, like the homepage.
  const isPublicPage = [
    "/", "/classes", "/about",
    "/dashboard", "/profile", "/lessons", "/timetable", "/payments", "/grading", "/check-in", "/settings",
  ].includes(pathname);
  return (
    <AuthProvider>
      <MembershipAccessProvider>
      <ScrollToTop />
      <SiteFrame isPublicPage={isPublicPage} pathname={pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/classes" element={<ClassesGuide />} />
          <Route path="/schedule" element={<PublicTimetable />} />
          <Route path="/dojos" element={<Dojos />} />
          <Route path="/about" element={<About />} />
          <Route path="/join" element={<JoinFees />} />
          <Route path="/contact" element={<Contact />} />
          {/* Sign In and Sign Up share one page with a toggle */}
          <Route path="/signin" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          {/* Only signed-in users can open the dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* Student payments (Stripe Checkout, test mode) */}
          <Route path="/registration/checkout" element={<ProtectedRoute role="student"><RegistrationCheckout /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute activeMembership><Payments /></ProtectedRoute>} />
          <Route path="/payments/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          {/* Browse and book group lessons */}
          <Route path="/lessons" element={<ProtectedRoute><BookLessons /></ProtectedRoute>} />
          {/* Weekly timetable and past lessons. FSDP-41, FSDP-59 */}
          <Route path="/timetable" element={<ProtectedRoute role="student"><MyTimetable /></ProtectedRoute>} />
          {/* Student pages not built yet: placeholders until the real pages are ready */}
          <Route path="/lessons" element={<ProtectedRoute activeMembership><ComingSoon page="lessons" /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute activeMembership><ComingSoon page="timetable" /></ProtectedRoute>} />
          <Route path="/check-in" element={<ProtectedRoute activeMembership role="student"><CheckIn /></ProtectedRoute>} />
          {/* Personal settings is built: contact details editable, belt and membership view-only. FSDP-42 */}
          <Route path="/settings" element={<ProtectedRoute><PersonalSettings /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute role="student"><Inbox /></ProtectedRoute>} />
          <Route path="/grading" element={<ProtectedRoute activeMembership role="student"><Grading /></ProtectedRoute>} />
          <Route path="/admin/schedule" element={<ProtectedRoute role="admin"><AdminSchedule /></ProtectedRoute>} />
          <Route path="/admin/dojos" element={<ProtectedRoute role="admin"><ManageDojos /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AdminAttendance /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
          <Route path="/admin/applications" element={<ProtectedRoute role="admin"><AdminMembershipApplications /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute role="admin"><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/students/:id" element={<ProtectedRoute role="admin"><AdminStudentProfile /></ProtectedRoute>} />
          <Route path="/admin/private-lessons" element={<ProtectedRoute role="admin"><AdminPrivateLessons /></ProtectedRoute>} />
          <Route path="/admin/cover-requests" element={<ProtectedRoute role="admin"><AdminCoverRequests /></ProtectedRoute>} />
          <Route path="/admin/grading" element={<ProtectedRoute role="admin"><AdminGrading /></ProtectedRoute>} />
          <Route path="/admin/grading/:id" element={<ProtectedRoute role="admin"><AdminGradingApplications /></ProtectedRoute>} />
          <Route path="/belt-progress" element={<ProtectedRoute activeMembership><BeltProgress /></ProtectedRoute>} />
          <Route path="/instructor/classes/:id" element={<ProtectedRoute role="instructor"><ClassRoster /></ProtectedRoute>} />
          <Route path="/instructor/sessions/:id/qr" element={<ProtectedRoute role="instructor"><CheckInQr /></ProtectedRoute>} />
          <Route path="/instructor/calendar" element={<ProtectedRoute role="instructor"><InstructorCalendar /></ProtectedRoute>} />
          <Route path="/instructor/analytics" element={<ProtectedRoute role="instructor"><InstructorAnalytics /></ProtectedRoute>} />
          <Route path="/instructor/grading" element={<ProtectedRoute role="instructor"><InstructorGrading /></ProtectedRoute>} />
          <Route path="/instructor/gradings/:id" element={<ProtectedRoute role="instructor"><InstructorGradingSession /></ProtectedRoute>} />
          {/* Any unknown address falls back to the homepage */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SiteFrame>
      </MembershipAccessProvider>
    </AuthProvider>
  );
}

function SiteFrame({ isPublicPage, pathname, children }) {
  const { user } = useAuth();
  const adminArea = user?.role === "admin" && (pathname === "/dashboard" || pathname.startsWith("/admin/"));
  if (adminArea) return <AdminShell>{children}</AdminShell>;
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Navbar />
      <main id="main" className={isPublicPage ? "public-page-enter" : ""} key={isPublicPage ? pathname : "private"}>
        {children}
      </main>
      <Footer />
    </>
  );
}

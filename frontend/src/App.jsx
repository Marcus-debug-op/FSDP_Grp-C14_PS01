import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Home from "./pages/Home.jsx";
import PublicTimetable from "./pages/PublicTimetable.jsx";
import About from "./pages/About.jsx";
import Dojos from "./pages/Dojos.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Payments from "./pages/Payments.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import AdminSchedule from "./pages/admin/AdminSchedule.jsx";
import ManageDojos from "./pages/admin/ManageDojos.jsx";
import BeltProgress from "./pages/student/BeltProgress.jsx";

// AuthProvider makes the signed-in user available to every page below it.
export default function App() {
  const { pathname } = useLocation();
  // These pages fade in on arrival, like the homepage.
  const isPublicPage = [
    "/", "/classes", "/about",
    "/dashboard", "/lessons", "/timetable", "/payments", "/grading", "/check-in", "/settings",
  ].includes(pathname);
  return (
    <AuthProvider>
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Navbar />
      <main id="main" className={isPublicPage ? "public-page-enter" : ""} key={isPublicPage ? pathname : "private"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/classes" element={<PublicTimetable />} />
          <Route path="/dojos" element={<Dojos />} />
          <Route path="/about" element={<About />} />
          {/* Sign In and Sign Up share one page with a toggle */}
          <Route path="/signin" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          {/* Only signed-in users can open the dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* Student payments (Stripe Checkout, test mode) */}
          <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="/payments/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          {/* Student pages not built yet: placeholders until the real pages are ready */}
          <Route path="/lessons" element={<ProtectedRoute><ComingSoon page="lessons" /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute><ComingSoon page="timetable" /></ProtectedRoute>} />
          <Route path="/check-in" element={<ProtectedRoute><ComingSoon page="checkIn" /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><ComingSoon page="settings" /></ProtectedRoute>} />
          {/* Grading is a teammate's part; swap in their page when it's ready */}
          <Route path="/grading" element={<ProtectedRoute><ComingSoon page="grading" /></ProtectedRoute>} />
          <Route path="/admin/schedule" element={<ProtectedRoute role="admin"><AdminSchedule /></ProtectedRoute>} />
          <Route path="/admin/dojos" element={<ProtectedRoute role="admin"><ManageDojos /></ProtectedRoute>} />
          <Route path="/belt-progress" element={<ProtectedRoute><BeltProgress /></ProtectedRoute>} />
          {/* Any unknown address falls back to the homepage */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </AuthProvider>
  );
}

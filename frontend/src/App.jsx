import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Home from "./pages/Home.jsx";
import PublicTimetable from "./pages/PublicTimetable.jsx";
import About from "./pages/About.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";

// AuthProvider makes the signed-in user available to every page below it.
export default function App() {
  return (
    <AuthProvider>
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Navbar />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/classes" element={<PublicTimetable />} />
          <Route path="/about" element={<About />} />
          {/* Sign In and Sign Up share one page with a toggle */}
          <Route path="/signin" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          {/* Only signed-in users can open the dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* Any unknown address falls back to the homepage */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </AuthProvider>
  );
}

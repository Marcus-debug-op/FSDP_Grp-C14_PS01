import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import AttendanceTrends from "../../components/AttendanceTrends.jsx";
import "../../../css/auth.css";
import "../../../css/instructor.css";

// Analytics page: attendance at the instructor's classes over the last
// 8 weeks and the students whose attendance has dropped (FSDP-71).
export default function InstructorAnalytics() {
  return (
    <div className="instructor-portal">
      <InstructorNavbar />

      <section className="section instructor-kanji-section">
        <span className="instructor-kanji instructor-kanji-low" aria-hidden="true">合</span>
        <div className="container analytics-page">
          <p className="eyebrow">Last 8 weeks</p>
          <h1 className="roster-title">Analytics</h1>
          <p className="lead">How often students are coming to your classes, and who might need a check-in.</p>

          <AttendanceTrends />
        </div>
      </section>
    </div>
  );
}

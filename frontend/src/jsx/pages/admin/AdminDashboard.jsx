import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getOverview } from "../../../js/services/adminService.js";
import { formatWeekRange } from "../../../js/utils/formatters.js";
import "../../../css/auth.css";
import "../../../css/admin.css";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getOverview().then(setOverview).catch((err) => setError(err.message));
  }, []);

  return (
    <section className="section">
      <div className="container">
        <span className="role-badge">{user.role}</span>
        <h1>Welcome, {user.fullName}</h1>
        <p className="lead">See the class timetable for every dojo and keep the dojo list up to date.</p>

        {error && <p className="form-error" role="alert">{error}</p>}

        {overview && (
          <>
            <p className="admin-week">This week: {formatWeekRange(overview.weekStart, overview.weekEnd)}</p>
            <ul className="stats admin-stats">
              <li><strong>{overview.lessonsThisWeek}</strong><span>Lessons this week</span></li>
              <li><strong>{overview.activeClasses}</strong><span>Weekly classes</span></li>
              <li><strong>{overview.activeCentres}</strong><span>Active dojos</span></li>
              <li><strong>{overview.instructors}</strong><span>Instructors</span></li>
            </ul>
          </>
        )}

        <div className="grid admin-cards">
          <article className="card">
            <span className="tag">Timetable</span>
            <h3>Class Timetable</h3>
            <p className="admin-card-text">Every class for the week, by day. Choose a dojo or an instructor to narrow it down.</p>
            <Link to="/admin/schedule" className="btn btn-outline btn-small">Open Timetable</Link>
          </article>
          <article className="card">
            <span className="tag">Attendance</span>
            <h3>Attendance</h3>
            <p className="admin-card-text">See who came to each class, who was late or absent, and how each check-in was recorded.</p>
            <Link to="/admin/attendance" className="btn btn-outline btn-small">View Attendance</Link>
          </article>
          <article className="card">
            <span className="tag">Setup</span>
            <h3>Dojos</h3>
            <p className="admin-card-text">See every dojo, how many weekly classes it runs, and open its timetable.</p>
            <Link to="/admin/dojos" className="btn btn-outline btn-small">Manage Dojos</Link>
          </article>
        </div>
      </div>
    </section>
  );
}

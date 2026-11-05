import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getOverview } from "../../services/adminService.js";
import { formatWeekRange } from "../../utils/formatters.js";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import "../../auth.css";
import "../../admin.css";

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
        <AdminTabs />
        <span className="role-badge">{user.role}</span>
        <h1>Welcome, {user.fullName}</h1>
        <p className="lead">See every lesson across all dojos and keep the dojo list up to date.</p>

        {error && <p className="form-error" role="alert">{error}</p>}

        {overview && (
          <>
            <p className="admin-week">This week: {formatWeekRange(overview.weekStart, overview.weekEnd)}</p>
            <ul className="stats admin-stats">
              <li><strong>{overview.lessonsThisWeek}</strong><span>Lessons</span></li>
              <li><strong>{overview.withoutInstructor}</strong><span>Need an instructor</span></li>
              <li><strong>{overview.activeDojos}</strong><span>Active dojos</span></li>
              <li><strong>{overview.activeRooms}</strong><span>Rooms in use</span></li>
            </ul>
          </>
        )}

        <div className="grid admin-cards">
          <article className="card">
            <span className="tag">Scheduling</span>
            <h3>Schedule</h3>
            <p className="admin-card-text">Every lesson for the week, by day. Filter by dojo or instructor and spot lessons without an instructor.</p>
            <Link to="/admin/schedule" className="btn btn-outline btn-small">Open Schedule</Link>
          </article>
          <article className="card">
            <span className="tag">Setup</span>
            <h3>Dojos &amp; Rooms</h3>
            <p className="admin-card-text">Add the venues where classes run, with their rooms and how many people each room holds.</p>
            <Link to="/admin/dojos" className="btn btn-outline btn-small">Manage Dojos</Link>
          </article>
        </div>

        <p className="notice admin-notice"><strong>Sample data:</strong> these pages show example lessons and dojos until the database is connected.</p>
      </div>
    </section>
  );
}

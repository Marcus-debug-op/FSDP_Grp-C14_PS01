import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import StudentDashboard from "./StudentDashboard.jsx";
import "../auth.css";

// Landing page after sign-in. Students get the student portal; the other
// roles keep this placeholder until their dashboards are built.
const roleText = {
  student: "You will be able to book classes and track your progress here.",
  instructor: "You will be able to manage your classes and students here.",
  admin: "You will be able to manage the school's users and classes here.",
};

export default function Dashboard() {
  const { user } = useAuth();

  if (user.role === "student") return <StudentDashboard />;

  return (
    <section className="section">
      <div className="container narrow">
        <span className="role-badge">{user.role}</span>
        <h1>Welcome, {user.fullName}</h1>
        <p className="lead">{roleText[user.role]}</p>
        <div className="button-row">
          <Link to="/classes" className="btn btn-primary">View Classes</Link>
        </div>
      </div>
    </section>
  );
}

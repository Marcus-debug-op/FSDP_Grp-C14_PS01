import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Shows one class. Visitors cannot book, so the button leads to the Sign In page
// (which also has a Sign Up toggle).
export default function ClassCard({ item }) {
  const { user } = useAuth();

  return (
    <article className="card">
      <span className="tag">{item.type}</span>
      <h3>{item.name}</h3>
      {item.note && <p className="card-note">{item.note}</p>}
      <dl className="details">
        <div><dt>Day</dt><dd>{item.day}</dd></div>
        <div><dt>Time</dt><dd>{item.time}</dd></div>
        {item.instructor && <div><dt>Led by</dt><dd>{item.instructor}</dd></div>}
        <div><dt>Dojo</dt><dd>{item.dojo}</dd></div>
      </dl>
      {/* Signed-in users will get a real booking button in a later feature */}
      {!user && <Link to="/signin" className="btn btn-outline btn-small">Sign In to Book</Link>}
    </article>
  );
}

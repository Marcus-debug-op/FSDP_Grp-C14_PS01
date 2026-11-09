import { Link } from "react-router-dom";
import BeltCard from "../../components/student/BeltCard.jsx";
import BeltTimeline from "../../components/student/BeltTimeline.jsx";
import "../../../css/belt.css";

// Shows the current belt and the real belt history together. Two columns on wide
// screens: the current belt (and the way on to grading) on the left, the full
// history on the right. Stacks on narrow screens.
export default function BeltProgress() {
  return (
    <section className="section belt-section">
      <div className="container belt-page">
        <header className="belt-header">
          <p className="eyebrow">Training progress</p>
          <h1>My Belt</h1>
          <p className="belt-lead">Your current rank and every belt you've earned along the way.</p>
        </header>

        <div className="belt-grid">
          <div className="belt-col belt-col-side">
            <BeltCard />
            <aside className="belt-next">
              <p className="belt-next-label">Next step</p>
              <h2 className="belt-next-title">Ready for your next belt?</h2>
              <p className="belt-next-note">
                See how close you are, what's still to do, and when the next grading is.
              </p>
              <Link to="/grading" className="btn btn-primary">Check grading eligibility</Link>
            </aside>
          </div>

          <div className="belt-col">
            <article className="belt-panel">
              <h2 className="belt-history-title">Belt history</h2>
              <BeltTimeline />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

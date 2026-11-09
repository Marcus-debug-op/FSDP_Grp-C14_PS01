import BeltCard from "../../components/student/BeltCard.jsx";
import BeltTimeline from "../../components/student/BeltTimeline.jsx";

// Shows the current belt and the real belt history together, so they
export default function BeltProgress() {
  return (
    <section className="section">
      <div className="container narrow">
        <p className="eyebrow">Training progress</p>
        <h1>My Belt</h1>
        <BeltCard />
        <h2 className="belt-history-title">Belt history</h2>
        <BeltTimeline />
      </div>
    </section>
  );
}

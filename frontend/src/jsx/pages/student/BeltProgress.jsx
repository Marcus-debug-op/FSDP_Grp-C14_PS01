import BeltCard from "../../components/student/BeltCard.jsx";
import BeltTimeline from "../../components/student/BeltTimeline.jsx";

// Shows (current belt) and (progression) together so they can be tested
// before the student dashboard (FSDP-7) is ready. Quan Jun can also import <BeltCard />
// straight into the dashboard.
export default function BeltProgress() {
  return (
    <section className="section">
      <div className="container narrow">
        <p className="eyebrow">Training progress</p>
        <h1>My Belt</h1>
        <BeltCard />
        <h2 style={{ marginTop: "2.5rem" }}>Belt progression</h2>
        <BeltTimeline />
      </div>
    </section>
  );
}

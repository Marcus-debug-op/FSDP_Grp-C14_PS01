import { Link } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal.jsx";

// Placeholder for student pages that aren't built yet.
// Each one lists what the page will do, taken from its Jira stories,
// so the navbar works end to end while the real pages are being built.
// Replace the route in App.jsx with the real page when it's ready.
export const PLACEHOLDERS = {
  lessons: {
    kanji: "予約",
    eyebrow: "Book lessons",
    title: "Lesson booking is on its way.",
    lead: "Soon you'll be able to browse lessons across every dojo and book them with your credits.",
    planned: [
      "Browse upcoming lessons at every dojo, with filters",
      "Lessons that suit your belt or are near you, highlighted",
      "Book group lessons and 1-on-1 sessions",
      "Cancel a booking you can't make",
    ],
  },
  timetable: {
    kanji: "時間割",
    eyebrow: "My timetable",
    title: "Your timetable is on its way.",
    lead: "Soon you'll see your booked lessons in a weekly calendar, along with your past lessons.",
    planned: [
      "Weekly calendar of your booked lessons",
      "Cancelled or moved lessons labelled straight away",
      "Past lessons marked Attended, Missed or Cancelled",
    ],
  },
  grading: {
    kanji: "審査",
    eyebrow: "Grading",
    title: "Grading applications are on their way.",
    lead: "Soon you'll be able to check your eligibility and apply for the next grading here.",
    planned: [
      "See whether you meet the requirements for your next rank",
      "Apply for grading and pay the exam fee",
      "Track the status of your application",
    ],
  },
  checkIn: {
    kanji: "出席",
    eyebrow: "Check in",
    title: "QR check-in is on its way.",
    lead: "Soon you'll scan the code your instructor shows at the start of class to record your attendance.",
    planned: [
      "Scan the instructor's QR code with your phone camera",
      "Works for lessons you've booked, during the lesson",
      "Your attendance updates on your dashboard",
    ],
  },
  // "settings" used to live here. It is a real page now:
  // pages/student/PersonalSettings.jsx, routed at /settings.   FSDP-42
};

export default function ComingSoon({ page }) {
  const p = PLACEHOLDERS[page];
  return (
    <section className="section coming-soon">
      <div className="container two-col">
        <ScrollReveal>
          <p className="eyebrow">{p.eyebrow}</p>
          <h1>{p.title}</h1>
          <p className="lead">{p.lead}</p>
          <h2 className="coming-soon-heading">What you'll find here</h2>
          <ul className="coming-soon-list">
            {p.planned.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="button-row">
            <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={150} className="visual-reveal">
          <div className="panel" aria-hidden="true">
            <span className="panel-kanji">{p.kanji}</span>
            <span className="panel-tag">Coming soon</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

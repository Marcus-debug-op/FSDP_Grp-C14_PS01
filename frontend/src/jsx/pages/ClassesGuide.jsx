import { Link } from "react-router-dom";
import { classTypes } from "../../js/data/hqClasses.js";
import { site } from "../../js/data/siteInfo.js";
import "../../css/classes.css";
import usePageTitle from "../../js/hooks/usePageTitle.js";

// Public class guide: what each class is and who it is for, grouped so a
// visitor can find the right one quickly. "See times" opens the timetable
// already filtered to that class. Who-it's-for text reuses hqClasses.js.
// `filter` = the class type(s) as the timetable names them (from the database);
// several types are joined with "," (e.g. HQ and neighbourhood-dojo versions).
const groups = [
  {
    id: "adults",
    title: "Adults & teens",
    intro: "From your very first class to advanced training.",
    classes: [
      { name: "Adult class", text: classTypes.Adults, filter: "Adult" },
      { name: "Ladies class", text: classTypes.Ladies, filter: "Ladies" },
      { name: "Seniors class (SG50)", text: classTypes.SG50, filter: "Senior SG50" },
      { name: "Weapons class", text: "Weapons training", filter: "Weapons" },
      { name: "Intermediate class", text: classTypes.Intermediate, filter: "Intermediate" },
      { name: "Advanced class", text: classTypes.Advanced, filter: "Advanced" },
    ],
  },
  {
    id: "children",
    title: "Children & families",
    intro: "Classes for young children, older children and families training together.",
    classes: [
      { name: "Children juniors", text: classTypes["Children Juniors"], filter: "Children Juniors" },
      { name: "Children classes", text: "Children's classes at HQ and our neighbourhood dojos.", filter: "Children Beginners,Children" },
      { name: "Mixed / family class", text: classTypes["Mixed/Family"], filter: "Mixed/Family,Mixed" },
    ],
  },
];

export default function ClassesGuide() {
  usePageTitle("Classes");

  return (
    <>
      <section className="section cg-hero">
        <div className="container">
          <p className="eyebrow">Classes</p>
          <h1>Find the right class</h1>
          <p className="lead">Choose a class for yourself or your child, then check the timetable for days and times.</p>
          <nav className="cg-jump" aria-label="Jump to a group">
            <a href="#adults">Adults & teens</a>
            <a href="#children">Children & families</a>
            <a href="#private">Private & programmes</a>
          </nav>
        </div>
      </section>

      {groups.map((g, i) => (
        <section key={g.id} id={g.id} className={i % 2 ? "section section-alt" : "section"} aria-labelledby={`cg-${g.id}`}>
          <div className="container">
            <h2 id={`cg-${g.id}`}>{g.title}</h2>
            <p className="cg-intro">{g.intro}</p>
            <ul className="cg-grid">
              {g.classes.map((c) => (
                <li key={c.name} className="cg-card">
                  <h3>{c.name}</h3>
                  <p>{c.text}</p>
                  <Link to={`/schedule?type=${encodeURIComponent(c.filter)}`} className="cg-link">See times <span aria-hidden="true">→</span></Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section id="private" className="section" aria-labelledby="cg-private">
        <div className="container">
          <h2 id="cg-private">Private & programmes</h2>
          <p className="cg-intro">One-to-one coaching, and programmes for schools and organisations.</p>
          <ul className="cg-grid">
            <li className="cg-card">
              <h3>Private lessons</h3>
              <p>One-to-one lessons with an instructor. Members can request a lesson after signing in.</p>
              <Link to="/signin" className="cg-link">Sign in to request <span aria-hidden="true">→</span></Link>
            </li>
            <li className="cg-card">
              <h3>Schools & organisations</h3>
              <p>Programmes for schools and companies. Contact our HQ team to discuss what you need.</p>
              <a href={`mailto:${site.email}`} className="cg-link">Contact us <span aria-hidden="true">→</span></a>
            </li>
          </ul>
        </div>
      </section>

      <section className="cta">
        <div className="container center">
          <h2>Not sure where to start?</h2>
          <p>Most newcomers begin with the adult or children beginners class. Join online, or ask our HQ team for advice.</p>
          <div className="button-row center-row">
            <Link to="/join" className="btn btn-light">How to join</Link>
            <Link to="/join#faq" className="btn btn-light">Read the FAQ</Link>
            <a href={site.phoneHref} className="btn btn-light">Call {site.phoneDisplay}</a>
          </div>
        </div>
      </section>
    </>
  );
}

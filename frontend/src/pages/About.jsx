import { Link } from "react-router-dom";
import { shihan, instructorGroups } from "../data/instructors.js";
import "../content.css";

const facts = [
  { value: "1988", label: "Founded" },
  { value: "60+", label: "Dojos" },
  { value: "70", label: "Instructors" },
  { value: "10,000+", label: "Members" },
];

export default function About() {
  return (
    <>
      <section className="section">
        <div className="container narrow">
          <p className="eyebrow">About</p>
          <h1>Aikido Shinju-Kai</h1>
          <p className="lead">
            Founded in 1988, Aikido Shinju-Kai is a Singapore aikido school officially
            recognised by the Aikido World Headquarters in Japan.
          </p>
          <p>
            Training follows the principles and philosophy of aikido's founder, Morihei
            Ueshiba (O'Sensei). The school is led by Chairman Founder and Chief Instructor
            Philip Lee Shihan, and runs a permanent Headquarters Dojo alongside dojos
            across the island and overseas, with classes for adults and children.
          </p>
          <ul className="stats">
            {facts.map((f) => (
              <li key={f.label}><strong>{f.value}</strong><span>{f.label}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-alt" id="instructors">
        <div className="container">
          <p className="eyebrow">Our teachers</p>
          <h2>Instructors</h2>

          <div className="shihan">
            <span className="shihan-kanji" aria-hidden="true">師</span>
            <div>
              <strong>{shihan.name} {shihan.title}</strong>
              <span>{shihan.rank} &middot; Chief Instructor</span>
            </div>
          </div>

          {instructorGroups.map((g) => (
            <div key={g.rank} className="instructor-group">
              <h3>{g.heading ? `${g.heading} \u2013 ${g.rank}` : g.rank}</h3>
              <ul className="names">
                {g.people.map((p) => (
                  <li key={p}>{g.title ? `${p} ${g.title}` : p}</li>
                ))}
              </ul>
            </div>
          ))}

          <div className="button-row">
            <Link to="/classes" className="btn btn-primary">View Classes</Link>
          </div>
        </div>
      </section>
    </>
  );
}

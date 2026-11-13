import { Link } from "react-router-dom";
import { site } from "../../js/data/siteInfo.js";
import "../../css/contact.css";
import usePageTitle from "../../js/hooks/usePageTitle.js";

// Public Contact page. All details come from siteInfo.js, so they match the
// footer and the Join & Fees page.
const topics = [
  { label: "Joining & membership", subject: "Joining Aikido Shinju-Kai" },
  { label: "Classes & timetable", subject: "Question about classes" },
  { label: "Uniform for my first class", subject: "Uniform for my first class" },
  { label: "Something else", subject: "General enquiry" },
];

const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.hqAddress)}`;

export default function Contact() {
  usePageTitle("Contact");

  return (
    <>
      <section className="section ct-hero">
        <div className="container">
          <p className="eyebrow">Contact</p>
          <h1>Get in touch</h1>
          <p className="lead">Our HQ team can help with joining, classes and anything else. Many answers are already in our <Link to="/join#faq">FAQ</Link>.</p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container ct-grid">
          <article className="ct-card">
            <h2>Call or email</h2>
            <a className="ct-row" href={site.phoneHref}><span className="ct-label">Call</span>{site.phoneDisplay}</a>
            <a className="ct-row" href={`mailto:${site.email}`}><span className="ct-label">Email</span>{site.email}</a>
            <div className="ct-hours">
              <span className="ct-label">Office hours</span>
              <dl>{site.officeHours.map((o) => <div key={o.days}><dt>{o.days}</dt><dd>{o.hours}</dd></div>)}</dl>
            </div>
          </article>

          <article className="ct-card">
            <h2>Visit our HQ</h2>
            <p className="ct-strong">{site.hqName}</p>
            <p>{site.hqAddress}</p>
            <div className="button-row">
              <a className="btn btn-outline btn-small" href={mapUrl} target="_blank" rel="noreferrer">Open in Google Maps</a>
              <Link className="btn btn-outline btn-small" to="/dojos">Find a dojo near you</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>What can we help with?</h2>
          <p className="ct-muted">Pick a topic to start an email with the subject already filled in.</p>
          <ul className="ct-topics">
            {topics.map((t) => (
              <li key={t.label}>
                <a href={`mailto:${site.email}?subject=${encodeURIComponent(t.subject)}`}>{t.label} <span aria-hidden="true">→</span></a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

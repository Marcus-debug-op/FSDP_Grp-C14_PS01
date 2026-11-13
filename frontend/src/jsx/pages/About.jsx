import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal.jsx";
import CountUp from "../components/CountUp.jsx";
import { aboutTabs, aboutStats } from "../../js/data/aboutContent.js";
import {
  Benefits, History, Vision, Shihan, Instructors, Overseas, Family, LifeMembers, Careers,
} from "../components/about/AboutSections.jsx";
import "../../css/discover.css";
import usePageTitle from "../../js/hooks/usePageTitle.js";

// Which component shows for each tab
const panels = {
  benefits: Benefits, history: History, vision: Vision, shihan: Shihan, instructors: Instructors,
  overseas: Overseas, family: Family, "life-members": LifeMembers, careers: Careers,
};

export default function About() {
  usePageTitle("About");
  const { hash } = useLocation();
  const navigate = useNavigate();
  const tabRefs = useRef([]);
  const panelRef = useRef(null);

  // The address (for example /about#history) decides which section shows,
  // so a section can be bookmarked or shared, and the Back button works.
  const fromHash = hash.replace("#", "");
  const [active, setActive] = useState(panels[fromHash] ? fromHash : "benefits");

  useEffect(() => {
    if (panels[fromHash]) setActive(fromHash);
  }, [fromHash]);

  const index = aboutTabs.findIndex((t) => t.id === active);
  const Panel = panels[active];

  function select(id, { focus = false } = {}) {
    setActive(id);
    navigate(`/about#${id}`);
    if (focus) tabRefs.current[aboutTabs.findIndex((t) => t.id === id)]?.focus();
    // Bring the content into view if the page is scrolled past it
    const top = panelRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - 150, behavior: "smooth" });
    }
  }

  // Arrow keys, Home and End move between the tabs
  function handleKeys(e) {
    const last = aboutTabs.length - 1;
    let next = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = last;
    if (next !== null) {
      e.preventDefault();
      select(aboutTabs[next].id, { focus: true });
    }
  }

  const prev = aboutTabs[index - 1];
  const next = aboutTabs[index + 1];

  return (
    <>
      <section className="ab-header">
        <ScrollReveal className="container">
          <p className="eyebrow">About</p>
          <h1>Aikido Shinju-Kai</h1>
          <p className="lead">
            Founded in 1988 and officially recognised by the Aikido World Headquarters in Japan. Choose a
            topic to explore.
          </p>
          <ul className="stats">
            {aboutStats.map((s) => (
              <li key={s.label}>
                <strong>{s.plain ? s.to : <CountUp to={s.to} suffix={s.suffix} />}</strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </section>

      <section className="section ab-body">
        <div className="container ab-layout">
          <div className="ab-tabs" role="tablist" aria-label="About sections" aria-orientation="vertical" onKeyDown={handleKeys}>
            {aboutTabs.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => (tabRefs.current[i] = el)}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={active === t.id ? 0 : -1}
                className="ab-tab"
                onClick={() => select(t.id)}
              >
                <span className="ab-tab-kanji" aria-hidden="true">{t.kanji}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="ab-panel" key={active} ref={panelRef} role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
            <p className="ab-count">Section {index + 1} of {aboutTabs.length}</p>
            <h2>{aboutTabs[index].label}</h2>
            <Panel />

            <div className="ab-pager">
              {prev ? (
                <button type="button" className="btn btn-outline btn-small" onClick={() => select(prev.id)}>&larr; {prev.label}</button>
              ) : <span />}
              {next ? (
                <button type="button" className="btn btn-primary btn-small" onClick={() => select(next.id)}>{next.label} &rarr;</button>
              ) : (
                <Link to="/classes" className="btn btn-primary btn-small">View Classes</Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

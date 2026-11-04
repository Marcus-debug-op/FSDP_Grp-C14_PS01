import { useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import useHeroScrollFade from "../hooks/useHeroScrollFade.js";

// Steps shown in "Getting started". The faint kanji are the numbers 1, 2, 3.
const steps = [
  { kanji: "一", title: "Register an account", text: "Create your student account in a minute." },
  { kanji: "二", title: "Find suitable classes", text: "Browse classes by dojo and day." },
  { kanji: "三", title: "Track your progress", text: "Follow your training journey over time." },
];

// Key facts about the school.
const stats = [
  { value: "1988", label: "Founded" },
  { value: "60+", label: "Dojos" },
  { value: "10,000+", label: "Members" },
];

// The three characters of "Aikido".
const meaning = [
  { kanji: "合", name: "Ai", text: "Harmony" },
  { kanji: "気", name: "Ki", text: "Vital energy" },
  { kanji: "道", name: "Do", text: "The way" },
];

export default function Home() {
  const { user, loading } = useAuth();
  // While a saved login is being checked, show nothing so a signed-in
  // student doesn't see the homepage flash before the redirect.
  if (loading) return null;
  // Signed-in students go straight to their dashboard.
  if (user?.role === "student") return <Navigate to="/dashboard" replace />;
  return <HomePage />;
}

function HomePage() {
  const heroRef = useRef(null);
  useHeroScrollFade(heroRef);
  return (
    <>
      {/* HERO. Optional photo: put hero.jpg in public/images/ */}
      <section className="hero" ref={heroRef}>
        <div className="container hero-content hero-scroll-content">
          <p className="eyebrow">Aikido School &mdash; Singapore</p>
          <p className="hero-kanji" aria-hidden="true">合気道</p>
          <h1>Begin Your Aikido Journey</h1>
          <span className="rule" aria-hidden="true"></span>
          <p className="hero-text">
            The way of harmony, taught in Singapore since 1988
            for adults and children.
          </p>
          <div className="button-row center-row">
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
            <Link to="/classes" className="btn btn-light">View Classes</Link>
          </div>
        </div>
      </section>

      {/* ABOUT: short intro + three key facts */}
      <section className="section">
        <div className="container two-col">
          <ScrollReveal>
          <div>
            <p className="eyebrow">About the school</p>
            <h2>Tradition and discipline, in the heart of Singapore.</h2>
            <p className="lead">
              Aikido Shinju-Kai is officially recognised by the Aikido World
              Headquarters in Japan, led by Chief Instructor Philip Lee Shihan.
            </p>
            <ul className="stats">
              {stats.map((s) => (
                <li key={s.label}>
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
          </ScrollReveal>
          <ScrollReveal delay={150} className="visual-reveal">
          <div className="panel" aria-hidden="true">
            <span className="panel-kanji">武道</span>
            <span className="panel-tag">The martial way</span>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* GETTING STARTED */}
      <section className="section section-alt">
        <div className="container">
          <ScrollReveal>
            <p className="eyebrow center">Getting started</p>
            <h2 className="center">Three simple steps</h2>
          </ScrollReveal>
          <ol className="steps">
            {steps.map((s) => (
              <ScrollReveal key={s.title} as="li" className="step" delay={steps.indexOf(s) * 110}>
                <span className="step-kanji" aria-hidden="true">{s.kanji}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </section>

      {/* MEANING OF AIKIDO */}
      <section className="section">
        <div className="container">
          <ScrollReveal>
            <p className="eyebrow center">Philosophy</p>
            <h2 className="center">Harmony in motion.</h2>
          </ScrollReveal>
          <ul className="meaning">
            {meaning.map((m) => (
              <ScrollReveal key={m.name} as="li" delay={meaning.indexOf(m) * 120}>
                <span className="meaning-kanji" aria-hidden="true">{m.kanji}</span>
                <span><strong>{m.name}</strong><br />{m.text}</span>
              </ScrollReveal>
            ))}
          </ul>
        </div>
      </section>

      {/* CLASS DISCOVERY */}
      <section className="cta">
        <ScrollReveal className="container center">
          <h2>Find your class.</h2>
          <p>See what is available for adults, children and more before you sign up.</p>
          <Link to="/classes" className="btn btn-light">See Full Timetable</Link>
        </ScrollReveal>
      </section>
    </>
  );
}

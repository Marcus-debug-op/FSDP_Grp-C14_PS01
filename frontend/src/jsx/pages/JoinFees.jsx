import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getRegistrationPlans } from "../../js/services/registrationService.js";
import { site } from "../../js/data/siteInfo.js";
import "../../css/join.css";
import usePageTitle from "../../js/hooks/usePageTitle.js";

// Public "Join & Fees" page: how joining works, what it costs, what to wear.
// The registration price is read from the database (same source as signup),
// so this page can never show a different price from checkout.
const steps = [
  { title: "Create your account", text: "Tell us about yourself, any previous training and your preferred dojo." },
  { title: "Pay the registration fee", text: "Pay securely online with Stripe once your profile is complete." },
  { title: "We review your application", text: "We check your profile photo and the Shihan approves your membership." },
  { title: "Start training", text: "Once approved, your membership is active and you can book and check in to classes." },
];

const faqs = [
  { q: "Do I need any experience?", a: "No. Most of our members started as complete beginners, and every dojo runs classes for newcomers." },
  { q: "I have trained at another dojo. What should I do?", a: "Tick “I have previous Aikido experience” when you sign up and tell us your rank. Our instructors will review it with you; a previous rank isn't carried over automatically." },
  { q: "When does my membership start?", a: "After your payment is received and the Shihan approves your application. It lasts until 31 December of the year you join, and you renew each year after that. You can follow each step on your profile page." },
  { q: "Can children join?", a: "Yes. We run children's and family classes. See our classes page for the age range of each class." },
  { q: "I am already an ASK member. Do I sign up again?", a: "Please contact our HQ team first so we can help you with your existing membership." },
];

export default function JoinFees() {
  const [price, setPrice] = useState(null);
  const { hash } = useLocation();
  usePageTitle("Join & Fees");

  // Links like /join#faq jump straight to that section (after the page's
  // usual scroll-to-top has run).
  useEffect(() => {
    if (!hash) return undefined;
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    return () => clearTimeout(timer);
  }, [hash]);

  useEffect(() => {
    let active = true;
    getRegistrationPlans()
      .then((plans) => { if (active && plans[0]) setPrice(plans[0].priceCents / 100); })
      .catch(() => { /* Price is optional here; the signup page always shows it. */ });
    return () => { active = false; };
  }, []);

  const priceText = price === null ? "See at signup" : `S$${price.toFixed(2)}`;

  return (
    <>
      <section className="section jf-hero">
        <div className="container">
          <p className="eyebrow">Join Aikido Shinju-Kai</p>
          <h1>Start training with us</h1>
          <p className="lead">Beginners of all ages are welcome. Here is how joining works and what it costs.</p>
          <div className="button-row">
            <Link to="/signup" className="btn btn-primary">Join now</Link>
            <Link to="/schedule" className="btn btn-outline">See the timetable</Link>
          </div>
          <nav className="jf-jump" aria-label="On this page">
            <span>On this page:</span>
            <a href="#how">How it works</a>
            <a href="#fees">Fees</a>
            <a href="#wear">What to wear</a>
            <a href="#faq" className="jf-jump-faq">FAQ</a>
          </nav>
        </div>
      </section>

      <section id="how" className="section section-alt" aria-labelledby="jf-steps-title">
        <div className="container">
          <p className="eyebrow">How it works</p>
          <h2 id="jf-steps-title">Four steps to your first class</h2>
          <ol className="jf-steps">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="jf-step-num" aria-hidden="true">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="fees" className="section" aria-labelledby="jf-fees-title">
        <div className="container">
          <p className="eyebrow">Fees</p>
          <h2 id="jf-fees-title">What it costs</h2>
          <div className="jf-fees">
            <article className="jf-fee jf-fee-main">
              <h3>Registration (new member)</h3>
              <p className="jf-price">{priceText}<span>one-time</span></p>
              <ul className="jf-includes" aria-label="Included">
                <li>Membership for the current year</li>
                <li>Aikido Shinju-Kai handbook</li>
                <li>Membership book</li>
              </ul>
            </article>
            <article className="jf-fee">
              <h3>Annual renewal</h3>
              <p className="jf-price">S$48.00<span>per year</span></p>
              <p className="jf-fee-note">From your second year onwards.</p>
            </article>
            <article className="jf-fee">
              <h3>Training passes</h3>
              {/* TODO (client to confirm): add training pass prices once ASK confirms them. */}
              <p className="jf-fee-note">Class fees depend on your dojo and how often you train. Your dojo will advise you before your first class.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="wear" className="section section-alt" aria-labelledby="jf-wear-title">
        <div className="container jf-two">
          <div>
            <p className="eyebrow">Your first class</p>
            <h2 id="jf-wear-title">What to wear</h2>
            <p className="jf-wear-lead">Aikido is practised in a training uniform made up of three pieces.</p>
            <ul className="jf-wear-items">
              {["Jacket", "Pants", "Belt"].map((label, i) => (
                <li key={label}><span className="jf-wear-num" aria-hidden="true">{i + 1}</span>{label}</li>
              ))}
            </ul>
            <div className="jf-tip">
              <strong>Need a uniform?</strong>
              <p>Contact us at least a week before your first class and an instructor can bring one for you.</p>
              <a className="btn btn-outline btn-small" href={`mailto:${site.email}?subject=${encodeURIComponent("Uniform for my first class")}`}>Email us about a uniform</a>
            </div>
          </div>
          <aside className="jf-contact" aria-labelledby="jf-contact-title">
            <h3 id="jf-contact-title">Questions before you join?</h3>
            <p className="jf-fee-note">Our HQ team is happy to help.</p>
            <a className="jf-contact-row" href={site.phoneHref}><span className="jf-contact-label">Call</span>{site.phoneDisplay}</a>
            <a className="jf-contact-row" href={`mailto:${site.email}`}><span className="jf-contact-label">Email</span>{site.email}</a>
            <div className="jf-hours">
              <span className="jf-contact-label">Office hours</span>
              <dl>{site.officeHours.map((o) => <div key={o.days}><dt>{o.days}</dt><dd>{o.hours}</dd></div>)}</dl>
            </div>
            <Link to="/contact" className="jf-contact-more">More ways to reach us <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </section>

      <section id="faq" className="section" aria-labelledby="jf-faq-title">
        <div className="container jf-faq-wrap">
          <p className="eyebrow">FAQ</p>
          <h2 id="jf-faq-title">Questions new members ask</h2>
          <p className="jf-fee-note">Can't find your answer? Email <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
          <div className="jf-faq">
            {faqs.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container center">
          <h2>Ready to begin?</h2>
          <p>Create your account in a few minutes. You will pay securely after completing your profile.</p>
          <Link to="/signup" className="btn btn-light">Join now</Link>
        </div>
      </section>
    </>
  );
}

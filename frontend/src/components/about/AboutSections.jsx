import { useState } from "react";
import ScrollReveal from "../ScrollReveal.jsx";
import { shihan, instructorGroups } from "../../data/instructors.js";
import {
  history, historyEras, eraOf, vision, missions, shihanProfile, shihanTimeline,
  overseasCountries, overseasInstructors, familyCountries, affiliationEmail, lifeMembers, deshi,
} from "../../data/aboutContent.js";

// Each function below is ONE section of the About page.

// ---------- Benefits of Aikido ----------
const benefitCards = [
  { title: "Body", text: "A complete workout: aerobic fitness from vigorous practice, flexibility from stretching and the techniques themselves, and relaxation, because techniques only work when you are relaxed." },
  { title: "Mind", text: "Body and mind are trained together. Physical relaxation becomes mental calm, and the confidence you build shows in how you move and carry yourself." },
  { title: "Self-defence", text: "Techniques can be applied from gentle control to firm countermeasures, which suits a wide range of situations. In Japan, aikido is taught to the Tokyo Metropolitan Riot Police." },
];

const faqs = [
  { q: "How is aikido different from other martial arts?", a: "Traditional aikido is non-competitive. Rank comes from showing understanding of techniques, not from beating an opponent. You work with a partner, blend with a realistic attack and redirect its energy. Training covers strikes, kicks, grabs, chokes, multiple attackers and weapons, always aiming to resolve conflict safely." },
  { q: "Is aikido good for self-defence?", a: "Yes. It teaches you to handle many kinds of attack, and it also trains posture, breathing and mindset. Beyond balance, timing and reaction, aikido builds awareness, compassion and a sense of well-being." },
  { q: "What makes Aikido Shinju-Kai different?", a: "Founded by Philip Lee Shihan, the school aims to keep aikido instruction in Singapore at the highest level, with strong technique, legitimate instructors and a clear teaching method. It supports its instructors and dojos with standard grading requirements, seminars, and instructor training and certification." },
];

export function Benefits() {
  return (
    <>
      <p className="lead">
        Aikido is a Japanese martial art of throws, joint locks and pins, practised together with the
        sword, staff and knife.
      </p>
      <p>
        Morihei Ueshiba (O Sensei) created aikido in the early twentieth century, drawing on centuries of
        Japanese martial knowledge. It is a form of Budo, a &ldquo;martial way&rdquo;: a path of
        understanding and a way of life, not only a method of self-defence.
      </p>

      <div className="ab-cards">
        {benefitCards.map((c, i) => (
          <ScrollReveal key={c.title} delay={i * 110} className="ab-card">
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </ScrollReveal>
        ))}
      </div>

      <h3 className="ab-subhead">Common questions</h3>
      <div className="ab-faq">
        {faqs.map((f, i) => (
          <details key={f.q} open={i === 0}>
            <summary>{f.q}</summary>
            <p className="ab-faq-body">{f.a}</p>
          </details>
        ))}
      </div>

      <p className="ab-quote">
        Aikido in daily life: every day brings some kind of conflict. Training teaches you to see it as a
        chance to grow instead of something to avoid.
      </p>
    </>
  );
}

// ---------- Our History ----------
export function History() {
  const [era, setEra] = useState("All");
  const shown = history.filter((h) => era === "All" || eraOf(h.year) === era);

  return (
    <>
      <p className="lead">
        Founded in 1988, Aikido Shinju-Kai has grown into one of the most active aikido organisations in
        South-East Asia.
      </p>
      <div className="chip-row" role="group" aria-label="Filter by period">
        {historyEras.map((e) => (
          <button key={e} type="button" className="chip" aria-pressed={era === e} onClick={() => setEra(e)}>{e}</button>
        ))}
      </div>
      <ol className="ab-timeline" key={era}>
        {shown.map((h) => (
          <ScrollReveal key={h.year} as="li">
            <span className="ab-year">{h.year}</span>
            <h3>{h.title}</h3>
            <p>{h.text}</p>
          </ScrollReveal>
        ))}
      </ol>
    </>
  );
}

// ---------- Vision & Mission ----------
export function Vision() {
  return (
    <>
      <ScrollReveal className="ab-vision">
        <p className="eyebrow">Our vision</p>
        <p className="ab-vision-text">{vision}</p>
      </ScrollReveal>
      <h3 className="ab-subhead">Our mission</h3>
      <div className="ab-cards">
        {missions.map((m, i) => (
          <ScrollReveal key={m.title} delay={i * 110} className="ab-card">
            <span className="ab-card-num" aria-hidden="true">{i + 1}</span>
            <h3>{m.title}</h3>
            <p>{m.text}</p>
          </ScrollReveal>
        ))}
      </div>
    </>
  );
}

// ---------- Philip Lee Shihan ----------
export function Shihan() {
  const [full, setFull] = useState(false);
  const items = shihanTimeline.filter((t) => full || t.highlight);

  return (
    <>
      <div className="ab-profile">
        <span className="ab-profile-kanji" aria-hidden="true">師</span>
        <div>
          <h3>{shihanProfile.name}</h3>
          <p className="ab-profile-zh" lang="zh">{shihanProfile.chinese}</p>
          <p className="ab-profile-role">{shihanProfile.role}</p>
        </div>
      </div>
      <p className="lead">{shihanProfile.summary}</p>

      <h3 className="ab-subhead">{full ? "Full career timeline" : "Career highlights"}</h3>
      <ol className="ab-timeline" key={String(full)}>
        {items.map((t) => (
          <ScrollReveal key={t.year} as="li">
            <span className="ab-year">{t.year} <small>age {t.age}</small></span>
            <p>{t.text}</p>
          </ScrollReveal>
        ))}
      </ol>
      <button type="button" className="btn btn-outline btn-small" onClick={() => setFull(!full)} aria-expanded={full}>
        {full ? "Show highlights only" : "Show full timeline"}
      </button>
    </>
  );
}

// ---------- Our Instructors ----------
export function Instructors() {
  const [rank, setRank] = useState("All");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const groups = instructorGroups
    .filter((g) => rank === "All" || g.rank === rank)
    .map((g) => ({ ...g, people: g.people.filter((p) => !q || p.toLowerCase().includes(q)) }))
    .filter((g) => g.people.length > 0);
  const total = groups.reduce((n, g) => n + g.people.length, 0);

  return (
    <>
      <div className="ab-profile">
        <span className="ab-profile-kanji" aria-hidden="true">師</span>
        <div>
          <h3>{shihan.name} {shihan.title}</h3>
          <p className="ab-profile-role">{shihan.rank} &middot; Chief Instructor</p>
        </div>
      </div>

      <div className="chip-row" role="group" aria-label="Filter by grade">
        {["All", ...instructorGroups.map((g) => g.rank)].map((r) => (
          <button key={r} type="button" className="chip" aria-pressed={rank === r} onClick={() => setRank(r)}>{r}</button>
        ))}
      </div>
      <label className="dj-search ab-search">
        <span className="sr-only">Search instructors by name</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" />
      </label>
      <p className="result-count" aria-live="polite">Showing {total} {total === 1 ? "instructor" : "instructors"}</p>

      {groups.map((g) => (
        <div key={g.rank} className="ab-group">
          <h3 className="ab-group-title">{g.heading ? `${g.heading} \u2013 ${g.rank}` : g.rank}</h3>
          <ul className="ab-names">
            {g.people.map((p) => <li key={p}>{g.title ? `${p} ${g.title}` : p}</li>)}
          </ul>
        </div>
      ))}
      {total === 0 && <p>No instructor matches that name.</p>}
    </>
  );
}

// ---------- Overseas Instructors ----------
export function Overseas() {
  const [country, setCountry] = useState("China");
  const list = overseasInstructors[country];

  return (
    <>
      <p className="lead">Instructors in our affiliated dojos around the region.</p>
      <div className="chip-row" role="group" aria-label="Choose a country">
        {overseasCountries.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={country === c} onClick={() => setCountry(c)}>
            {c} <span className="chip-count">{overseasInstructors[c].length}</span>
          </button>
        ))}
      </div>
      <div className="ab-people" key={country}>
        {list.map((p, i) => (
          <div key={`${p.name}-${i}`} className="ab-person" style={{ "--i": Math.min(i, 12) }}>
            <strong lang={country === "China" ? "zh" : undefined}>{p.name}</strong>
            <span lang={country === "China" ? "zh" : undefined}>{p.dojo}</span>
            <em>{p.rank}</em>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Our Extended Family ----------
export function Family() {
  return (
    <>
      <p className="lead">
        We welcome aikido organisations from around the world to join the Aikido Shinju-Kai umbrella.
      </p>
      <div className="ab-cards">
        {familyCountries.map((c, i) => (
          <ScrollReveal key={c.country} delay={i * 110} className="ab-card">
            <span className="ab-card-kanji" aria-hidden="true">{c.kanji}</span>
            <h3>{c.country}</h3>
            <p>{c.places.join(" \u00b7 ")}</p>
          </ScrollReveal>
        ))}
      </div>
      <p>Interested in becoming an affiliated dojo? Write to our International Affairs Department.</p>
      <a className="btn btn-primary" href={`mailto:${affiliationEmail}`}>Enquire about affiliation</a>
    </>
  );
}

// ---------- Life Members ----------
export function LifeMembers() {
  return (
    <>
      <p className="lead">
        Life Members are valued members of the Aikido Shinju-Kai family who help the school grow. The
        first Life Members helped make the Headquarters possible in 2003.
      </p>
      <p>
        Life Membership is by invitation from the Chief Instructor or the Shinju-Kai General Affairs
        Council. To learn more, speak to any council member or visit the Headquarters.
      </p>
      <div className="ab-faq">
        {lifeMembers.map((g, i) => (
          <details key={g.label} open={i === 0}>
            <summary>{g.label} <span className="chip-count">{g.names.length}</span></summary>
            <ul className="ab-names ab-faq-body">
              {g.names.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </details>
        ))}
      </div>
    </>
  );
}

// ---------- Careers (Deshi programme) ----------
export function Careers() {
  return (
    <>
      <p className="lead">{deshi.intro}</p>
      <p>{deshi.daily}</p>

      <div className="ab-cards ab-cards-2">
        <ScrollReveal className="ab-card">
          <h3>Who can apply</h3>
          <ul className="ab-list">{deshi.qualifications.map((x) => <li key={x}>{x}</li>)}</ul>
        </ScrollReveal>
        <ScrollReveal className="ab-card" delay={110}>
          <h3>What a Deshi does</h3>
          <ul className="ab-list">{deshi.responsibilities.map((x) => <li key={x}>{x}</li>)}</ul>
        </ScrollReveal>
      </div>

      <h3 className="ab-subhead">How to apply</h3>
      <p>Send a written application to the International Affairs Department that includes:</p>
      <ol className="ab-steps">
        {deshi.apply.map((x) => <li key={x}>{x}</li>)}
      </ol>
      <a className="btn btn-primary" href={`mailto:${deshi.email}`}>Email your application</a>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboard } from "../services/studentService.js";
import ScrollReveal from "../components/ScrollReveal.jsx";
import useHeroScrollFade from "../hooks/useHeroScrollFade.js";
import "../dashboard.css";

// Student portal home. Uses the same layout and motion as the homepage:
// dark hero that fades on scroll, alternating white/grey sections that reveal
// as you scroll, and the red call-to-action band at the bottom.

// ---------- Formatting helpers ----------
// Dates arrive as "YYYY-MM-DD" and times as "HH:MM", so build them as local dates.
const toDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtDate = (ymd) =>
  toDate(ymd).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
const fmtShortDate = (ymd) => toDate(ymd).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
const fmtDay = (ymd) => toDate(ymd).toLocaleDateString("en-SG", { weekday: "short" });
const fmtTime = (hm) => {
  const [h, m] = hm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const fmtMoney = (cents, currency = "sgd") =>
  (cents / 100).toLocaleString("en-SG", { style: "currency", currency: currency.toUpperCase() });
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const PURPOSE = {
  membership: "Membership fee",
  credit_topup: "Credit top-up",
  grading_fee: "Grading fee",
  other: "Payment",
};
const STATUS = {
  succeeded: { label: "Paid", tone: "ok" },
  failed: { label: "Failed", tone: "alert" },
  pending: { label: "Pending", tone: "muted" },
  refunded: { label: "Refunded", tone: "muted" },
};

// Hero text and main button change with grading eligibility.
function heroCopy(rank, grading) {
  const book = <Link to="/lessons" className="btn btn-primary">Book a Class</Link>;

  if (!rank.next) {
    return { body: `You hold ${rank.current}, the highest rank tracked in the portal.`, action: book };
  }
  if (rank.eligible && grading?.applicationStatus) {
    return { body: `Your application for the ${fmtDate(grading.date)} grading is ${grading.applicationStatus}.`, action: book };
  }
  if (rank.eligible && grading) {
    return {
      body: `You meet the attendance and time-in-rank requirements. Applications close on ${fmtDate(grading.closesOn)}.`,
      action: <Link to="/grading" className="btn btn-primary">Apply for Grading</Link>,
    };
  }
  if (rank.eligible) {
    return { body: `You meet the requirements for ${rank.next}. The next grading date hasn't been announced yet.`, action: book };
  }
  const parts = [];
  if (rank.classesNeeded) parts.push(plural(rank.classesNeeded, "more class", "more classes"));
  if (rank.monthsNeeded) parts.push(plural(rank.monthsNeeded, "more month"));
  return {
    body: `You need ${parts.join(" and ")} at ${rank.current} before you can grade for ${rank.next}.`,
    action: book,
  };
}

// ---------- Sections ----------
// Same two-column layout as the homepage's "About the school".
function RankSection({ rank }) {
  return (
    <section className="section" id="grading" aria-labelledby="rank-title">
      <div className="container two-col">
        <ScrollReveal>
          <p className="eyebrow">Rank progress</p>
          <h2 id="rank-title">
            {rank.next ? `Working towards ${rank.next}.` : `${rank.current}.`}
          </h2>
          <p className="lead">
            {rank.next
              ? `You currently hold ${rank.current}. Keep training to meet the grading requirements.`
              : "You've reached the top of the ranks tracked here."}
          </p>

          <div className="dash-track" aria-hidden="true">
            <span className="dash-dot is-done" />
            <span className="dash-line is-done" />
            <span className="dash-dot is-current" />
            <span className="dash-line" />
            <span className="dash-dot" />
          </div>
          <div className="dash-track-labels">
            <span>{rank.previous || "Start"}</span>
            <strong>{rank.current}</strong>
            <span>{rank.next || "Top rank"}</span>
          </div>

          {rank.next && (
            <ul className="stats">
              <li>
                <strong>{rank.classesAtRank}/{rank.classesRequired}</strong>
                <span>Classes at rank</span>
              </li>
              <li>
                <strong>{rank.monthsAtRank}/{rank.monthsRequired}</strong>
                <span>Months at rank</span>
              </li>
              <li>
                <strong>{rank.eligible ? "Ready" : "Training"}</strong>
                <span>Grading status</span>
              </li>
            </ul>
          )}
        </ScrollReveal>

        <ScrollReveal delay={150} className="visual-reveal">
          <div className="panel" aria-hidden="true">
            <span className="panel-kanji">昇進</span>
            <span className="panel-tag">{rank.next ? `Next · ${rank.next}` : "Highest rank"}</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// Same grey band and column layout as the homepage's "Getting started".
function GlanceSection({ nextClass, attendance, membership, credits }) {
  const membershipItem = !membership
    ? { value: "None", sub: "Choose a plan to start training." }
    : membership.state === "expired"
      ? { value: "Expired", sub: `Ended ${fmtDate(membership.endDate)}.` }
      : {
          value: "Active",
          sub: `${membership.plan} · renews ${fmtDate(membership.endDate)}.`,
          tag: membership.state === "expiring" ? `Expires in ${plural(membership.daysLeft, "day")}` : null,
        };

  const items = [
    {
      kanji: "次",
      label: "Next class",
      value: nextClass ? `${fmtDay(nextClass.date)}, ${fmtTime(nextClass.startTime)}` : "Nothing booked",
      sub: nextClass ? `${nextClass.title} · ${nextClass.centre}` : "Book a class to see it here.",
    },
    {
      kanji: "出",
      label: "Attendance",
      value: `${plural(attendance.thisMonth, "session")} this month`,
      sub: attendance.rate === null ? "Across all centres." : `${attendance.rate}% of booked classes attended.`,
    },
    { kanji: "会", label: "Membership", ...membershipItem },
    {
      kanji: "券",
      label: "Lesson credits",
      value: plural(credits, "credit"),
      sub: "1 credit per group lesson.",
      tag: credits <= 1 ? (credits === 0 ? "No credits left" : "Running low") : null,
      link: { to: "/payments", label: "Top up credits" },
    },
  ];

  return (
    <section className="section section-alt" aria-labelledby="glance-title">
      <div className="container">
        <ScrollReveal>
          <p className="eyebrow center">At a glance</p>
          <h2 className="center" id="glance-title">Your training this month</h2>
        </ScrollReveal>
        <ul className="dash-glance">
          {items.map((item, i) => (
            <ScrollReveal key={item.label} as="li" className="step" delay={i * 110}>
              <span className="step-kanji" aria-hidden="true">{item.kanji}</span>
              <p className="dash-label">{item.label}</p>
              <h3>{item.value}</h3>
              <p>{item.sub}</p>
              {item.tag && <span className="tag dash-tag">{item.tag}</span>}
              {item.link && <Link to={item.link.to} className="dash-link">{item.link.label}</Link>}
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Same cards as the Classes page.
function RecommendedSection({ recommended }) {
  return (
    <section className="section" aria-labelledby="rec-title">
      <div className="container">
        <ScrollReveal>
          <p className="eyebrow center">Recommended for your belt</p>
          <h2 className="center" id="rec-title">Classes to book next.</h2>
        </ScrollReveal>
        {recommended.length === 0 ? (
          <ScrollReveal>
            <p className="lead center dash-empty">No upcoming classes match your belt right now.</p>
          </ScrollReveal>
        ) : (
          <div className="grid dash-cards">
            {recommended.map((c, i) => (
              <ScrollReveal key={c.id} as="article" className="card" delay={i * 90}>
                <span className="tag">{fmtDay(c.date)}</span>
                <h3>{c.title}</h3>
                <dl className="details">
                  <div><dt>Date</dt><dd>{fmtShortDate(c.date)}</dd></div>
                  <div><dt>Time</dt><dd>{fmtTime(c.startTime)}</dd></div>
                  <div><dt>Dojo</dt><dd>{c.centre}</dd></div>
                </dl>
                <Link to="/lessons" className="btn btn-outline btn-small">Book</Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PaymentsSection({ payments }) {
  return (
    <section className="section section-alt" id="payments" aria-labelledby="pay-title">
      <div className="container">
        <ScrollReveal className="dash-head">
          <div>
            <p className="eyebrow">Payments</p>
            <h2 id="pay-title">Payment history</h2>
          </div>
          <Link to="/payments" className="btn btn-outline btn-small">Buy Credits</Link>
        </ScrollReveal>
        <ScrollReveal delay={120} className="dash-box">
          {payments.length === 0 ? (
            <p className="dash-empty-row">No payments yet.</p>
          ) : (
            <table className="dash-table">
              <thead>
                <tr><th scope="col">Date</th><th scope="col">Item</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const s = STATUS[p.status] || STATUS.pending;
                  return (
                    <tr key={p.id}>
                      <td>{fmtDate(p.date)}</td>
                      <td>
                        {PURPOSE[p.purpose] || "Payment"}
                        <span className="dash-amount">{fmtMoney(p.amountCents, p.currency)}</span>
                      </td>
                      <td className={`dash-status dash-status-${s.tone}`}>{s.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}

// ---------- Page ----------
export default function StudentDashboard() {
  const { user } = useAuth();
  const heroRef = useRef(null);
  useHeroScrollFade(heroRef);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  const ready = data && data.profileReady;
  let body = "Loading your progress...";
  let action = <Link to="/lessons" className="btn btn-primary">Book a Class</Link>;
  if (error) body = "We couldn't load your dashboard just now.";
  else if (data && !data.profileReady) body = "Your student profile isn't set up yet.";
  else if (ready) ({ body, action } = heroCopy(data.rank, data.grading));

  return (
    <>
      {/* HERO: same as the homepage, including the fade on scroll */}
      <section className="hero" ref={heroRef}>
        <div className="container hero-content hero-scroll-content">
          <p className="eyebrow">Welcome back, {user.fullName}</p>
          <p className="hero-kanji" aria-hidden="true">稽古</p>
          <h1>Your Path to the Next Rank</h1>
          <span className="rule" aria-hidden="true"></span>
          <p className="hero-text" aria-live="polite">{body}</p>
          <div className="button-row center-row">
            {action}
            <Link to="/payments" className="btn btn-light">Payments</Link>
          </div>
        </div>
      </section>

      {error && (
        <section className="section">
          <div className="container narrow">
            <p className="notice" role="alert">{error}</p>
          </div>
        </section>
      )}

      {data && !data.profileReady && (
        <section className="section">
          <div className="container narrow">
            <p className="notice">
              Please ask the front desk to record your belt and home centre, then refresh this page.
            </p>
          </div>
        </section>
      )}

      {ready && (
        <>
          <RankSection rank={data.rank} />
          <GlanceSection
            nextClass={data.nextClass}
            attendance={data.attendance}
            membership={data.membership}
            credits={data.credits}
          />
          <RecommendedSection recommended={data.recommended} />
          <PaymentsSection payments={data.payments} />
        </>
      )}

      {/* Red band: same as the homepage's class discovery */}
      <section className="cta">
        <ScrollReveal className="container center">
          <h2>Ready for your next class?</h2>
          <p>See every lesson across our dojos and book the ones that fit your week.</p>
          <Link to="/lessons" className="btn btn-light">Book Lessons</Link>
        </ScrollReveal>
      </section>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboard } from "../services/studentService.js";
import "../student-dashboard.css";

// Student portal home. Layout and styles follow the
// "Student portal · Desktop / Mobile" frames in the Figma design.

// ---------- Formatting helpers ----------
// Dates arrive as "YYYY-MM-DD" and times as "HH:MM", so build them as local dates.
const toDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtDate = (ymd) =>
  toDate(ymd).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
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
  succeeded: { label: "Paid", tone: "navy" },
  failed: { label: "Failed", tone: "red" },
  pending: { label: "Pending", tone: "grey" },
  refunded: { label: "Refunded", tone: "grey" },
};

// ---------- Small building blocks ----------
// Portal header from the design: logo, club name, four links.
// The site-wide Navbar hides itself on this page, so Sign out lives here too.
function PortalHeader() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate("/");
  }

  return (
    <header className="sp-header">
      <Link to="/" className="sp-brand">
        <img src="/images/logo.png" alt="" width="52" height="52" />
        <span>Shinju-kai</span>
      </Link>
      {/* Grading and Payments jump to their sections until those pages exist. */}
      <nav className="sp-nav" aria-label="Student portal">
        <Link to="/dashboard" className="sp-nav-link is-active" aria-current="page">Home</Link>
        <Link to="/classes" className="sp-nav-link">Classes</Link>
        <a href="#grading" className="sp-nav-link">Grading</a>
        <a href="#payments" className="sp-nav-link">Payments</a>
        <button type="button" className="sp-nav-link sp-signout" onClick={handleSignOut}>Sign out</button>
      </nav>
    </header>
  );
}

function SummaryCard({ label, value, sub, chip }) {
  return (
    <article className="sp-box sp-card">
      <p className="sp-label">{label}</p>
      <p className="sp-card-value">{value}</p>
      {chip && <span className={`sp-chip sp-chip-${chip.tone}`}>{chip.label}</span>}
      <p className="sp-body">{sub}</p>
    </article>
  );
}

function RankProgress({ rank }) {
  return (
    <section className="sp-box sp-rank" id="grading" aria-labelledby="rank-title">
      <h2 className="sp-rank-title" id="rank-title">Rank progress</h2>
      <div className="sp-rank-line" aria-hidden="true">
        <span className="sp-dot sp-dot-done" />
        <span className="sp-line sp-line-done" />
        <span className="sp-dot sp-dot-current" />
        <span className="sp-line" />
        <span className="sp-dot" />
      </div>
      <div className="sp-rank-labels">
        <span className="sp-label">{rank.previous || "Start"}</span>
        <span className="sp-rank-current">{rank.current}</span>
        <span className="sp-label">{rank.next || "Top rank"}</span>
      </div>
      {rank.next && (
        <dl className="sp-rank-stats">
          <div>
            <dt>Classes at {rank.current}</dt>
            <dd>{rank.classesAtRank} <span className="sp-label">· {rank.classesRequired} needed</span></dd>
          </div>
          <div>
            <dt>Time at {rank.current}</dt>
            <dd>
              {plural(rank.monthsAtRank, "month")} <span className="sp-label">· {rank.monthsRequired} needed</span>
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

// Headline text and button change with grading eligibility.
function Intro({ name, rank, grading }) {
  let body;
  let action = null;

  if (!rank.next) {
    body = `You hold ${rank.current}, the highest rank tracked in the portal.`;
  } else if (rank.eligible && grading?.applicationStatus) {
    body = `Your application for the ${fmtDate(grading.date)} grading is ${grading.applicationStatus}.`;
  } else if (rank.eligible && grading) {
    body = `You meet the attendance and time-in-rank requirements. Applications close on ${fmtDate(grading.closesOn)}.`;
    action = <Link to="/grading" className="sp-btn sp-btn-primary">Apply for grading</Link>;
  } else if (rank.eligible) {
    body = `You meet the requirements for ${rank.next}. The next grading date hasn't been announced yet.`;
  } else {
    const parts = [];
    if (rank.classesNeeded) parts.push(plural(rank.classesNeeded, "more class", "more classes"));
    if (rank.monthsNeeded) parts.push(plural(rank.monthsNeeded, "more month"));
    body = `You need ${parts.join(" and ")} at ${rank.current} before you can grade for ${rank.next}.`;
    action = <Link to="/classes" className="sp-btn sp-btn-secondary">Book a class</Link>;
  }

  return (
    <header className="sp-intro">
      <p className="sp-body sp-muted">Welcome back, {name}</p>
      <h1 className="sp-hero">Your path to the next rank.</h1>
      <p className="sp-body sp-lead">{body}</p>
      {action && <div className="sp-intro-action">{action}</div>}
    </header>
  );
}

// ---------- Page ----------
export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  let content;
  if (error) {
    content = <p className="sp-box sp-body" role="alert">{error}</p>;
  } else if (!data) {
    content = <p className="sp-body sp-muted">Loading your dashboard...</p>;
  } else if (!data.profileReady) {
    content = (
      <p className="sp-box sp-body">
        Your student profile isn't set up yet. Please ask the front desk to record your belt and home centre.
      </p>
    );
  } else {
    const { rank, grading, nextClass, attendance, membership, credits, recommended, payments } = data;

    const membershipCard = !membership
      ? { value: "None", sub: "Choose a plan to start training" }
      : membership.state === "expired"
        ? { value: "Expired", sub: `Ended ${fmtDate(membership.endDate)}` }
        : {
            value: "Active",
            sub: `${membership.plan} · renews ${fmtDate(membership.endDate)}`,
            chip: membership.state === "expiring"
              ? { tone: "red", label: `Expires in ${plural(membership.daysLeft, "day")}` }
              : null,
          };

    content = (
      <>
        <Intro name={user.fullName} rank={rank} grading={grading} />

        <RankProgress rank={rank} />

        <div className="sp-grid sp-grid-cards">
          <SummaryCard
            label="Next class"
            value={nextClass ? `${fmtDay(nextClass.date)}, ${fmtTime(nextClass.startTime)}` : "Nothing booked"}
            sub={nextClass ? `${nextClass.title} · ${nextClass.centre}` : "Book a class to see it here"}
          />
          <SummaryCard
            label="Attendance"
            value={`${plural(attendance.thisMonth, "session")} this month`}
            sub={attendance.rate === null ? "Across all centres" : `${attendance.rate}% of booked classes attended`}
          />
          <SummaryCard label="Membership" {...membershipCard} />
          <SummaryCard label="Lesson credits" value={plural(credits, "credit")} sub="1 credit per group lesson" />
        </div>

        <div className="sp-grid sp-grid-wide">
          <section className="sp-box sp-list" aria-labelledby="rec-title">
            <h2 className="sp-section-title" id="rec-title">Recommended classes</h2>
            {recommended.length === 0 ? (
              <p className="sp-body sp-muted sp-empty">No upcoming classes match your belt right now.</p>
            ) : (
              <ul className="sp-rows">
                {recommended.map((c) => (
                  <li className="sp-class-row" key={c.id}>
                    <div>
                      <p className="sp-body-strong">{c.title}</p>
                      <p className="sp-label">
                        {fmtDay(c.date)} {fmtDate(c.date).replace(/ \d{4}$/, "")} · {fmtTime(c.startTime)} · {c.centre}
                      </p>
                    </div>
                    <Link to="/classes" className="sp-pill">Book</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="sp-box sp-list" id="payments" aria-labelledby="pay-title">
            <h2 className="sp-section-title" id="pay-title">Payment history</h2>
            {payments.length === 0 ? (
              <p className="sp-body sp-muted sp-empty">No payments yet.</p>
            ) : (
              <table className="sp-table">
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
                          <span className="sp-amount">{fmtMoney(p.amountCents, p.currency)}</span>
                        </td>
                        <td className={`sp-status sp-status-${s.tone}`}>{s.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <div className="sp">
      <span className="sp-glyph" aria-hidden="true">合</span>
      <div className="sp-content">
        <PortalHeader />
        <div className="sp-main">{content}</div>
      </div>
    </div>
  );
}

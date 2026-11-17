import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboard, getNotices } from "../../js/services/studentService.js";
import ScrollReveal from "../components/ScrollReveal.jsx";
import CancelBooking from "../components/student/CancelBooking.jsx";
import "../../css/dashboard.css";

// Student portal home. Leads with the rank progress section, then alternating
// white/grey sections that reveal as you scroll, and the red CTA band at the
// bottom. A dark updates bar sits under the nav.

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

// ---------- Sections ----------
// Same two-column layout as the homepage's "About the school".
// Rank progress section: belt track, stats, and the grading slicer. The top
// section of the dashboard, compacted to fit a single screen.
function RankSection({ rank, userName }) {
  return (
    <section className="section rank-section" id="grading" aria-labelledby="rank-title">
      {/* Subtle motion background; a light scrim keeps the text readable. */}
      <video
        className="rank-bg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        poster="/images/hero.jpg"
      >
        <source src="/media/signin/dojo-practice.mp4" type="video/mp4" />
      </video>
      <div className="rank-bg-scrim" aria-hidden="true" />

      <div className="container two-col">
        <ScrollReveal>
          <p className="eyebrow">Welcome back, {userName}</p>
          <h2 id="rank-title">
            {rank.next ? `Working towards ${rank.next}.` : `${rank.current}.`}
          </h2>
          <p className="lead">
            {rank.next
              ? `You currently hold ${rank.current}. ${rank.eligible ? "You've met the requirements — you can apply to grade." : "Keep training to meet the grading requirements."}`
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
          <QuickActions />
        </ScrollReveal>
      </div>
    </section>
  );
}

// Two large, clearly tappable action buttons -- Apply for Grading and Payments.
// Each is an icon + title + helper line + arrow, so it reads as a button at a
// glance (easy to tap, including for children). Replaces the old pie slicer.
function QuickActions() {
  return (
    <div className="dash-actions">
      <Link to="/grading" className="dash-action dash-action-grade">
        <span className="dash-action-icon" aria-hidden="true">昇</span>
        <span className="dash-action-title">Grading</span>
        <span className="dash-action-arrow" aria-hidden="true">→</span>
      </Link>
      <Link to="/payments" className="dash-action dash-action-pay">
        <span className="dash-action-icon" aria-hidden="true">払</span>
        <span className="dash-action-title">Payments</span>
        <span className="dash-action-arrow" aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

// Same grey band and column layout as the homepage's "Getting started".
function GlanceSection({ nextClass, attendance, membership, credits, noticeHours, cancelNote, onBookingCancelled }) {
  // FSDP-6: status, the dojos it covers, expiry date, and a renew prompt.
  const covers = membership?.centresCovered
    ? ` Valid at all ${membership.centresCovered} dojos${membership.homeCentre ? ` (home: ${membership.homeCentre})` : ""}.`
    : "";
  const membershipItem = !membership
    ? { value: "None", sub: "Choose a plan to start training.", link: { to: "/payments", label: "Get a membership" } }
    : membership.state === "expired"
      ? {
          value: "Expired",
          sub: `Ended ${fmtDate(membership.endDate)}. Renew to book lessons again.`,
          tag: "Renew now",
          link: { to: "/payments", label: "Renew membership" },
        }
      : {
          value: membership.state === "expiring" ? "Expiring soon" : "Active",
          sub: `${membership.plan} · until ${fmtDate(membership.endDate)}.${covers}`,
          tag: membership.state === "expiring"
            ? (membership.daysLeft === 0 ? "Expires today" : `Expires in ${plural(membership.daysLeft, "day")}`)
            : null,
          link: membership.state === "expiring" ? { to: "/payments", label: "Renew membership" } : null,
        };

  const items = [
    {
      kanji: "次",
      label: "Next class",
      value: nextClass ? `${fmtDay(nextClass.date)}, ${fmtTime(nextClass.startTime)}` : "Nothing booked",
      sub: nextClass ? `${nextClass.title} · ${nextClass.centre}` : "Book a class to see it here.",
      // FSDP-55: cancel straight from the dashboard.
      extra: nextClass && (
        <CancelBooking
          key={nextClass.sessionId}
          lesson={{ ...nextClass, id: nextClass.sessionId }}
          noticeHours={noticeHours}
          onCancelled={onBookingCancelled}
        />
      ),
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
        {cancelNote && <p className="notice dash-cancel-note" role="status">{cancelNote}</p>}
        <ul className="dash-glance">
          {items.map((item, i) => (
            <ScrollReveal key={item.label} as="li" className="step" delay={i * 110}>
              <span className="step-kanji" aria-hidden="true">{item.kanji}</span>
              <p className="dash-label">{item.label}</p>
              <h3>{item.value}</h3>
              <p>{item.sub}</p>
              {item.tag && <span className="tag dash-tag">{item.tag}</span>}
              {item.extra}
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

// Notice types that are disruptions worth flagging as "alerts" (a cancelled or
// moved lesson), as opposed to routine updates (confirmations, payments, 1-on-1s).
const ALERT_TYPES = new Set(["lesson_cancelled", "lesson_moved"]);

// A slim bar under the navigation (dashboard only) pointing students at their
// inbox for recent updates (item 7). Shows separate indicators for unread
// alerts and unread routine updates. Replaces the old inline notices list,
// which now lives on the Inbox page. Only shows while there are unread
// updates: opening the inbox marks them read, so the bar goes away.
function UpdatesRow({ notices, unread }) {
  if (unread === 0) return null;
  const alertUnread = notices.filter((n) => !n.read && ALERT_TYPES.has(n.type)).length;
  const otherUnread = Math.max(0, unread - alertUnread);
  return (
    <div className="dash-updates">
      <div className="container dash-updates-inner">
        <p className="dash-updates-text">
          <span className="dash-updates-dot is-on" aria-hidden="true" />
          <strong>{plural(unread, "new update")}</strong> since you last checked.
        </p>
        {(alertUnread > 0 || otherUnread > 0) && (
          <span className="dash-updates-flags">
            {alertUnread > 0 && (
              <span className="dash-flag is-alert">
                <span className="dash-flag-dot" aria-hidden="true" />{plural(alertUnread, "alert")}
              </span>
            )}
            {otherUnread > 0 && (
              <span className="dash-flag is-info">
                <span className="dash-flag-dot" aria-hidden="true" />{plural(otherUnread, "update")}
              </span>
            )}
          </span>
        )}
        <Link to="/inbox" className="btn btn-small dash-updates-btn">Open inbox</Link>
      </div>
    </div>
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
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [notices, setNotices] = useState({ notices: [], unread: 0 });

  const load = () => {
    getDashboard().then(setData).catch((err) => setError(err.message));
    // Notices are extra: if they fail to load, the rest of the dashboard still shows.
    getNotices().then(setNotices).catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  // After a cancel, say what happened and reload so "Next class" and the
  // credit count show the new state.
  function bookingCancelled(result) {
    const { title, date, startTime } = result.lesson;
    const when = `${title} on ${fmtShortDate(date)} at ${fmtTime(startTime)}`;
    setCancelNote(
      result.refunded > 0
        ? `Cancelled ${when}. ${plural(result.refunded, "credit")} returned, so you have ${plural(result.creditsLeft, "credit")}.`
        : `Cancelled ${when}. Your credit wasn't returned because it was less than ${data.cancelNoticeHours} hours before the lesson.`
    );
    load();
  }

  const ready = data && data.profileReady;

  return (
    <>
      {/* Updates bar, just under the navigation (item 7) */}
      {ready && <UpdatesRow notices={notices.notices} unread={notices.unread} />}

      {!data && !error && (
        <section className="section">
          <div className="container narrow">
            <p className="lead" aria-live="polite">Loading your progress…</p>
          </div>
        </section>
      )}

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
            <p className="notice notice-fit">
              Please ask the front desk to record your belt, then refresh this page.
            </p>
          </div>
        </section>
      )}

      {ready && (
        <>
          {/* Rank progress -- moved up to lead the dashboard */}
          <RankSection rank={data.rank} userName={user.fullName} />
          <GlanceSection
            nextClass={data.nextClass}
            attendance={data.attendance}
            membership={data.membership}
            credits={data.credits}
            noticeHours={data.cancelNoticeHours}
            cancelNote={cancelNote}
            onBookingCancelled={bookingCancelled}
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

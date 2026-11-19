import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNotices, markNoticesRead } from "../../../js/services/studentService.js";
import "../../../css/dashboard.css";

// Full history of a student's updates: bookings, payments, lesson changes and
// 1-on-1s (FSDP-47, 53, 54, 56). Reuses the same notices API the dashboard used
// to show inline; the dashboard now only links here (dashboard experiment, item 6).

const NOTICE_KANJI = {
  booking_confirmed: "予",
  payment_received: "払",
  lesson_cancelled: "休",
  lesson_moved: "移",
  private_lesson: "個",
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const toDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtTime = (hm) => {
  const [h, m] = hm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
function fmtWhen(isoLocal) {
  const [date, time] = isoLocal.split("T");
  const short = toDate(date).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
  return `${short}, ${fmtTime(time)}`;
}

export default function Inbox() {
  const [data, setData] = useState({ notices: [], unread: 0 });
  const [error, setError] = useState("");

  // Opening the inbox counts as reading it: unread updates are marked read
  // straight away, so the dashboard's updates bar is gone next time. They stay
  // highlighted on this visit so the student can still see which ones are new.
  useEffect(() => {
    getNotices()
      .then((result) => {
        setData(result);
        if (result.unread > 0) markNoticesRead().catch(() => {});
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="section inbox-page">
      <div className="container narrow">
        <div className="dash-head">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2>{data.unread > 0 ? plural(data.unread, "new update") : "Your updates"}</h2>
          </div>
        </div>

        {error && <p className="notice" role="alert">{error}</p>}

        {data.notices.length === 0 ? (
          <p className="lead dash-empty inbox-empty">
            No updates yet. Bookings, payments and lesson changes will show up here.
          </p>
        ) : (
          <ul className="dash-notices inbox-list">
            {data.notices.map((n) => (
              <li key={n.id} className={`dash-notice dash-notice-${n.type}${n.read ? "" : " is-unread"}`}>
                <span className="dash-notice-kanji" aria-hidden="true">{NOTICE_KANJI[n.type] || "知"}</span>
                <div>
                  <p className="dash-notice-title">
                    {!n.read && <span className="dash-sr">New: </span>}
                    {n.title}
                  </p>
                  {n.body && <p className="dash-notice-body">{n.body}</p>}
                  <p className="dash-notice-when">{fmtWhen(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="inbox-back">
          <Link to="/dashboard" className="dash-link">&larr; Back to dashboard</Link>
        </p>
      </div>
    </section>
  );
}

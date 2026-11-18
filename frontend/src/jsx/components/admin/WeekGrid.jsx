import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatTime } from "../../../js/utils/formatters.js";

const HOUR_PX = 56;

const TYPES = {
  adult: { label: "Adult" },
  children: { label: "Children" },
  mixed: { label: "Mixed / Family" },
  weapons: { label: "Weapons" },
  special: { label: "Ladies / Seniors" },
  private: { label: "Private lesson" },
};

function typeOf(item) {
  if (item.kind === "private") return "private";
  const t = (item.title || "").toLowerCase();
  if (t.includes("child") || t.includes("junior") || t.includes("kid")) return "children";
  if (t.includes("mixed") || t.includes("family")) return "mixed";
  if (t.includes("weapon")) return "weapons";
  if (t.includes("ladies") || t.includes("senior")) return "special";
  return "adult";
}

function minutes(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function shortTitle(item) {
  if (item.kind === "private") return `1-to-1 · ${item.studentName || "Student"}`;
  return item.title.replace(/ Class$/, "");
}

function shortDojo(name) {
  if (!name) return "";
  if (/headquarters/i.test(name)) return "HQ";
  return name.replace(/ Dojo$/, "").replace(/^ActiveSG /, "");
}

function hourLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${String(hour % 12 || 12).padStart(2, "0")}:00 ${suffix}`;
}

function clockLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = String(mins % 60).padStart(2, "0");
  return `${h % 12 || 12}:${m}`;
}

function beltRange(item) {
  if (item.minBeltName && item.maxBeltName) return `${item.minBeltName} to ${item.maxBeltName}`;
  if (item.minBeltName) return `${item.minBeltName} and above`;
  if (item.maxBeltName) return `Up to ${item.maxBeltName}`;
  return "All belts";
}

function layoutDay(items, maxLanes) {
  const sorted = [...items].sort((a, b) => minutes(a.startTime) - minutes(b.startTime) || minutes(b.endTime) - minutes(a.endTime));
  const clusters = [];
  let current = null;
  for (const item of sorted) {
    const start = minutes(item.startTime);
    const end = Math.max(minutes(item.endTime), start + 15);
    if (!current || start >= current.end) {
      current = { items: [], laneEnds: [], start, end };
      clusters.push(current);
    }
    let lane = current.laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = current.laneEnds.length;
      current.laneEnds.push(end);
    } else {
      current.laneEnds[lane] = end;
    }
    current.items.push({ item, lane, start, end });
    current.end = Math.max(current.end, end);
  }

  const blocks = [];
  const more = [];
  for (const cluster of clusters) {
    const lanes = cluster.laneEnds.length;
    if (lanes <= maxLanes) {
      for (const p of cluster.items) blocks.push({ ...p, lanes });
      continue;
    }
    const hidden = cluster.items.filter((p) => p.lane >= maxLanes - 1);
    for (const p of cluster.items) if (p.lane < maxLanes - 1) blocks.push({ ...p, lanes: maxLanes });
    more.push({ count: hidden.length, start: Math.min(...hidden.map((p) => p.start)), end: Math.max(...hidden.map((p) => p.end)), lane: maxLanes - 1, lanes: maxLanes });
  }
  return { blocks, more };
}

function useNarrow(query) {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

function nowInSingapore() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function Details({ entry, day, showCentre, onClose, onOpenDay }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { item } = entry;
  const type = typeOf(item);
  const cancelled = item.status === "cancelled";
  return (
    <div className="wk-pop" role="dialog" aria-modal="false" aria-labelledby="wk-pop-title">
      <div className="wk-pop-head">
        <span className={`wk-dot wk-${type}`} aria-hidden="true"></span>
        <h3 id="wk-pop-title">{item.kind === "private" ? "Private lesson" : item.title}</h3>
        <button type="button" ref={closeRef} className="wk-pop-close" onClick={onClose} aria-label="Close details">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <dl className="wk-pop-list">
        <div><dt>When</dt><dd>{day.heading.weekday} {day.heading.day}, {formatTime(item.startTime)} to {formatTime(item.endTime)}</dd></div>
        {showCentre && <div><dt>Dojo</dt><dd>{item.centreName}</dd></div>}
        <div><dt>Instructor</dt><dd>{item.instructorName || "Not set"}</dd></div>
        {item.kind === "private" ? (
          <div><dt>Student</dt><dd><Link to={`/admin/students/${item.studentId}`} className="adm-link">{item.studentName}</Link></dd></div>
        ) : (
          <div><dt>Belts</dt><dd>{beltRange(item)}</dd></div>
        )}
        {item.capacity ? <div><dt>Capacity</dt><dd>{item.capacity} students</dd></div> : null}
        {cancelled && <div><dt>Status</dt><dd className="wk-pop-cancelled">Cancelled</dd></div>}
      </dl>
      <div className="wk-pop-actions">
        <button type="button" className="btn btn-outline btn-small" onClick={onOpenDay}>Open {day.heading.weekday} in day view</button>
        {item.kind === "private" && (
          <Link to="/admin/private-lessons?view=upcoming" className="link-button">Manage private lessons</Link>
        )}
      </div>
    </div>
  );
}

export default function WeekGrid({ days, today, showCentre, onOpenDay }) {
  const narrow = useNarrow("(max-width: 700px)");
  const [mobileIndex, setMobileIndex] = useState(() => Math.max(0, days.findIndex((d) => d.date === today)));
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(nowInSingapore);

  useEffect(() => {
    const timer = setInterval(() => setNow(nowInSingapore()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelected(null);
  }, [days]);

  const allItems = days.flatMap((d) => d.items);
  const firstHour = allItems.length ? Math.min(7, ...allItems.map((i) => Math.floor(minutes(i.startTime) / 60))) : 7;
  const lastHour = allItems.length ? Math.max(22, ...allItems.map((i) => Math.ceil(minutes(i.endTime) / 60))) : 22;
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const height = (lastHour - firstHour) * HOUR_PX;
  const maxLanes = showCentre ? 2 : 3;

  const shownDays = narrow ? days.slice(mobileIndex, mobileIndex + 1) : days;

  const layouts = useMemo(
    () => shownDays.map((d) => layoutDay(d.items, narrow ? (showCentre ? 3 : 4) : maxLanes)),
    [shownDays, narrow, showCentre, maxLanes]
  );

  const presentTypes = Object.keys(TYPES).filter((key) => allItems.some((i) => typeOf(i) === key));
  const top = (mins) => ((mins - firstHour * 60) / 60) * HOUR_PX;
  const selectedDay = selected ? days.find((d) => d.date === selected.date) : null;

  return (
    <div className="wk-wrap">
      {presentTypes.length > 0 && (
        <ul className="wk-legend" aria-label="Colour key">
          {presentTypes.map((key) => (
            <li key={key}><span className={`wk-dot wk-${key}`} aria-hidden="true"></span>{TYPES[key].label}</li>
          ))}
          {showCentre && <li className="wk-legend-hint">Pick a dojo above to see every class without "+ more"</li>}
        </ul>
      )}

      {narrow && (
        <div className="tt-days wk-mobile-days" role="group" aria-label="Day of the week">
          {days.map((d, index) => (
            <button
              key={d.date}
              type="button"
              className={d.date === today ? "tt-day tt-day-today" : "tt-day"}
              aria-pressed={index === mobileIndex}
              onClick={() => setMobileIndex(index)}
            >
              <span className="tt-day-name">{d.heading.weekday}</span>
              <span className="tt-day-date">{d.heading.day}</span>
            </button>
          ))}
        </div>
      )}

      <div className="wk-scroll">
        <div className="wk" style={{ gridTemplateColumns: `70px repeat(${shownDays.length}, minmax(0, 1fr))` }}>
          <div className="wk-corner" style={{ gridColumn: 1, gridRow: 1 }} aria-hidden="true"></div>
          {shownDays.map((d, col) => (
            <button
              key={d.date}
              type="button"
              className={d.date === today ? "wk-head wk-head-today" : "wk-head"}
              style={{ gridColumn: col + 2, gridRow: 1 }}
              onClick={() => onOpenDay(d.date)}
              title={`${d.heading.weekday} ${d.heading.day}: ${d.summary || "no classes"}. Open in day view`}
              aria-label={`${d.heading.weekday} ${d.heading.day}, ${d.summary || "no classes"}. Open in day view`}
            >
              <span className="wk-head-name">{d.heading.weekday}</span>
              <span className="wk-head-num">{d.date.slice(8).replace(/^0/, "")}</span>
            </button>
          ))}

          <div className="wk-times" style={{ height, gridColumn: 1, gridRow: 2 }} aria-hidden="true">
            {hours.map((h) => (
              <span key={h} className="wk-time" style={{ top: (h - firstHour) * HOUR_PX }}>{hourLabel(h)}</span>
            ))}
          </div>

          {shownDays.map((d, col) => {
            const { blocks, more } = layouts[col];
            const isToday = d.date === today;
            return (
              <div
                key={d.date}
                className={isToday ? "wk-col wk-col-today" : "wk-col"}
                style={{ height, backgroundSize: `100% ${HOUR_PX}px`, gridColumn: col + 2, gridRow: 2 }}
                aria-label={`${d.heading.weekday} ${d.heading.day}`}
                role="group"
              >
                {blocks.map((b) => {
                  const type = typeOf(b.item);
                  const cancelled = b.item.status === "cancelled";
                  const h = Math.max(b.end - b.start, 20) / 60 * HOUR_PX - 3;
                  const label = `${shortTitle(b.item)}, ${formatTime(b.item.startTime)} to ${formatTime(b.item.endTime)}${showCentre ? `, ${b.item.centreName}` : ""}${cancelled ? ", cancelled" : ""}`;
                  return (
                    <button
                      key={b.item.id}
                      type="button"
                      className={`wk-block wk-${type}${cancelled ? " wk-cancelled" : ""}${h < 40 ? " wk-short" : ""}`}
                      style={{
                        top: top(b.start) + 1,
                        height: h,
                        left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / b.lanes}% - 4px)`,
                      }}
                      aria-label={label}
                      title={label}
                      onClick={() => setSelected({ date: d.date, entry: b })}
                    >
                      <span className="wk-block-title">{shortTitle(b.item)}</span>
                      <span className="wk-block-meta">
                        {formatTime(b.item.startTime)}
                        {showCentre ? ` · ${shortDojo(b.item.centreName)}` : ""}
                      </span>
                    </button>
                  );
                })}
                {more.map((m) => (
                  <button
                    key={`more-${m.start}`}
                    type="button"
                    className="wk-more"
                    style={{
                      top: top(m.start) + 1,
                      height: Math.min(Math.max(m.end - m.start, 30) / 60 * HOUR_PX - 3, 30),
                      left: `calc(${(m.lane / m.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / m.lanes}% - 4px)`,
                    }}
                    onClick={() => onOpenDay(d.date)}
                    aria-label={`${m.count} more classes at this time. Open ${d.heading.weekday} in day view`}
                  >
                    +{m.count} more
                  </button>
                ))}
              </div>
            );
          })}

          {shownDays.some((d) => d.date === now.date) && now.minutes >= firstHour * 60 && now.minutes <= lastHour * 60 && (
            <div className="wk-now-layer" style={{ gridColumn: "1 / -1", gridRow: 2, height }} aria-hidden="true">
              <span className="wk-now" style={{ top: top(now.minutes) }}></span>
              <span className="wk-now-pill" style={{ top: top(now.minutes) }}>{clockLabel(now.minutes)}</span>
            </div>
          )}
        </div>
      </div>

      {selected && selectedDay && (
        <Details
          entry={selected.entry}
          day={selectedDay}
          showCentre={showCentre}
          onClose={() => setSelected(null)}
          onOpenDay={() => onOpenDay(selected.date)}
        />
      )}
    </div>
  );
}

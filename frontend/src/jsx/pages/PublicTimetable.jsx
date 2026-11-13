import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ClassCard from "../components/ClassCard.jsx";
import { getClasses } from "../../js/services/classService.js";
import { DAYS } from "../../js/data/hqClasses.js";
import "../../css/content.css";
import ScrollReveal from "../components/ScrollReveal.jsx";
import usePageTitle from "../../js/hooks/usePageTitle.js";

export default function PublicTimetable() {
  usePageTitle("Timetable");
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [centre, setCentre] = useState("All");
  const [day, setDay] = useState("All");
  // "See times" on the Classes page opens this page with ?type=... pre-selected.
  // It can hold one type or several joined by "," (e.g. "Mixed/Family,Mixed").
  const [params] = useSearchParams();
  const [preset] = useState(() => (params.get("type") || "").split(",").map((t) => t.trim()).filter(Boolean));
  const [type, setType] = useState(preset.length > 1 ? "__preset" : preset[0] || "All");

  // Load classes once when the page opens
  useEffect(() => {
    getClasses().then((list) => {
      setClasses(list);
      setLoading(false);
    });
  }, []);

  // Build the dropdown choices from whatever is in the data
  const centres = [...new Set(classes.map((c) => c.dojo))].sort();
  const types = [...new Set(classes.map((c) => c.type))].sort();

  // Keep only classes that match all three filters
  const visible = classes.filter(
    (c) =>
      (centre === "All" || c.dojo === centre) &&
      (day === "All" || c.day === day) &&
      (type === "All" || (type === "__preset" ? preset.includes(c.type) : c.type === type))
  );

  // Group by day so the page reads like a weekly timetable
  const groups = DAYS.map((d) => ({ day: d, items: visible.filter((c) => c.day === d) })).filter(
    (g) => g.items.length > 0
  );

  return (
    <section className="section">
      <div className="container">
        <ScrollReveal>
        <p className="eyebrow">Weekly timetable</p>
        <h1>Class Timetable</h1>
        <p className="lead">
          Browse weekly classes at our training centres without an account. Instructors and times are loaded from our current schedule.
        </p>

        </ScrollReveal>

        <ScrollReveal className="filters">
          <label>
            Training centre
            <select value={centre} onChange={(e) => setCentre(e.target.value)}>
              <option value="All">All centres</option>
              {centres.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Day
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="All">All days</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label>
            Class type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="All">All types</option>
              {preset.length > 1 && <option value="__preset">{preset.join(" + ")}</option>}
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </ScrollReveal>

        {loading ? (
          <p>Loading classes...</p>
        ) : groups.length === 0 ? (
          <p>No classes match your filters. Try choosing "All".</p>
        ) : (
          <div aria-live="polite">
            <p className="result-count">Showing {visible.length} classes</p>
            {groups.map((g) => (
              <ScrollReveal key={g.day} as="section" className="day-group" >
                <h2 id={`day-${g.day}`} className="day-heading">{g.day}</h2>
                <div className="grid">
                  {g.items.map((c) => <ClassCard key={c.id} item={c} />)}
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

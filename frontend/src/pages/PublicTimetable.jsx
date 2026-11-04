import { useEffect, useState } from "react";
import ClassCard from "../components/ClassCard.jsx";
import { getClasses } from "../services/classService.js";
import { DAYS, HQ_ADDRESS, classTypes } from "../data/hqClasses.js";
import "../content.css";
import ScrollReveal from "../components/ScrollReveal.jsx";

export default function PublicTimetable() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [centre, setCentre] = useState("All");
  const [day, setDay] = useState("All");
  const [type, setType] = useState("All");

  // Load classes once when the page opens
  useEffect(() => {
    getClasses().then((list) => {
      setClasses(list);
      setLoading(false);
    });
  }, []);

  // Build the dropdown choices from whatever is in the data
  const centres = [...new Set(classes.map((c) => c.dojo))].sort();
  const types = Object.keys(classTypes).filter((t) => classes.some((c) => c.type === t));

  // Keep only classes that match all three filters
  const visible = classes.filter(
    (c) =>
      (centre === "All" || c.dojo === centre) &&
      (day === "All" || c.day === day) &&
      (type === "All" || c.type === type)
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
          Browse classes without an account. Every class runs for 60 minutes at {HQ_ADDRESS}.
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

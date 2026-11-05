import { useState } from "react";
import DojoCard from "../components/DojoCard.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { dojos, REGIONS } from "../../js/data/dojos.js";
import "../../css/discover.css";

export default function Dojos() {
  const [region, setRegion] = useState("All");
  const [query, setQuery] = useState("");
  const [hideUnavailable, setHideUnavailable] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = dojos.filter(
    (d) =>
      (region === "All" || d.region === region) &&
      (!hideUnavailable || d.status === "open") &&
      (!q || `${d.name} ${d.code} ${d.address}`.toLowerCase().includes(q))
  );
  // Open dojos first; closed or renovating ones (greyed out) go to the end
  const sorted = [...matches].sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open"));
  const unavailableCount = matches.filter((d) => d.status !== "open").length;

  // How many dojos each region chip contains
  const countFor = (r) => dojos.filter((d) => r === "All" || d.region === r).length;

  return (
    <section className="section">
      <div className="container">
        <ScrollReveal>
          <p className="eyebrow">Our dojos</p>
          <h1>Find a dojo near you</h1>
          <p className="lead">
            Choose a region to see nearby dojos, their address and weekly classes. Dojos that are
            closed or being renovated are shown in grey.
          </p>
        </ScrollReveal>

        <div className="chip-row" role="group" aria-label="Filter by region">
          {["All", ...REGIONS].map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={region === r} onClick={() => setRegion(r)}>
              {r} <span className="chip-count">{countFor(r)}</span>
            </button>
          ))}
        </div>

        <div className="dj-tools">
          <label className="dj-search">
            <span className="sr-only">Search dojos</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                   placeholder="Search by name or address" />
          </label>
          <label className="dj-check">
            <input type="checkbox" checked={hideUnavailable} onChange={(e) => setHideUnavailable(e.target.checked)} />
            Hide closed dojos
          </label>
        </div>

        <p className="result-count" aria-live="polite">
          Showing {sorted.length} {sorted.length === 1 ? "dojo" : "dojos"}
          {unavailableCount > 0 && ` \u00b7 ${unavailableCount} currently unavailable`}
        </p>

        {sorted.length === 0 ? (
          <p>No dojos match. Try another region or clear the search.</p>
        ) : (
          // key restarts the entrance animation whenever the filters change
          <div className="dj-grid" key={`${region}-${q}-${hideUnavailable}`}>
            {sorted.map((d, i) => <DojoCard key={d.code} dojo={d} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import DojoCard from "../components/DojoCard.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { dojos, REGIONS } from "../../js/data/dojos.js";
import "../../css/discover.css";

export default function Dojos() {
  const [region, setRegion] = useState("All");
  const [query, setQuery] = useState("");
  const [hideUnavailable, setHideUnavailable] = useState(true);

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

        <div className="dj-layout">
          <aside className="dj-filter-panel" aria-label="Dojo filters">
            <div className="dj-filter-heading">
              <div>
                <p className="dj-filter-overline">EXPLORE LOCATIONS</p>
                <h2>Find your dojo</h2>
              </div>
              {(region !== "All" || query || hideUnavailable) && (
                <button className="dj-reset" type="button" onClick={() => {
                  setRegion("All");
                  setQuery("");
                  setHideUnavailable(false);
                }}>Clear</button>
              )}
            </div>

            <label className="dj-search dj-search-sidebar">
              <span className="dj-filter-label">Search locations</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, area or address" />
            </label>

            <div className="dj-region-filter">
              <p className="dj-filter-label" id="dj-region-label">Region</p>
              <div className="dj-region-list" role="group" aria-labelledby="dj-region-label">
                {["All", ...REGIONS].map((r) => (
                  <button key={r} type="button" className="dj-region-option"
                    aria-pressed={region === r} onClick={() => setRegion(r)}>
                    <span>{r === "All" ? "All regions" : r}</span>
                    <span className="dj-region-count">{countFor(r)}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="dj-check dj-check-sidebar">
              <input type="checkbox" checked={hideUnavailable}
                onChange={(e) => setHideUnavailable(e.target.checked)} />
              <span>Show available dojos only</span>
            </label>
          </aside>

          <div className="dj-results">
            <div className="dj-results-head">
              <div>
                <p className="dj-results-overline">DOJO DIRECTORY</p>
                <h2>{region === "All" ? "Explore our dojos" : `${region} dojos`}</h2>
              </div>
              <p className="result-count" aria-live="polite">
                {sorted.length} {sorted.length === 1 ? "dojo" : "dojos"}
                {unavailableCount > 0 && ` · ${unavailableCount} unavailable`}
              </p>
            </div>

            {sorted.length === 0 ? (
              <div className="dj-no-results">
                <h3>No dojos found</h3>
                <p>Try another region or change your search.</p>
                <button type="button" className="dj-reset" onClick={() => {
                  setRegion("All"); setQuery(""); setHideUnavailable(false);
                }}>Clear all filters</button>
              </div>
            ) : (
              <div className="dj-grid" key={`${region}-${q}-${hideUnavailable}`}>
                {sorted.map((d, i) => <DojoCard key={d.code} dojo={d} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
